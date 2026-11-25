const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const users = require('../../database/repositories/user.repository');
const User = require('../../database/models/User');
const AuthOtpChallenge = require('../../database/models/AuthOtpChallenge');
const emailService = require('./email.service');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
let googleClient;

function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function safeUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function tokenFor(user) { return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }); }
function authenticated(user) { return { user: safeUser(user), token: tokenFor(user) }; }
function emailFor(value) { return value.trim().toLowerCase(); }

function otpDigest(email, purpose, code) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) fail('Email verification is not configured. Set OTP_SECRET and SMTP details in .env.', 503);
  return crypto.createHmac('sha256', secret).update(`${email}:${purpose}:${code}`).digest('hex');
}

async function register(input) {
  // Retained for the in-memory Postman suite; real sign-ups must verify email first.
  if (process.env.NODE_ENV !== 'test') fail('Use the email verification flow to create an account.', 410);
  const email = emailFor(input.email);
  if (await users.findByEmail(email)) fail('An account with this email already exists.', 409);
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const user = await users.create({ name: input.name, email, passwordHash: await bcrypt.hash(input.password, 12), role: adminEmail && email === adminEmail ? 'admin' : 'user' });
  return authenticated(user);
}

async function login(input) {
  const user = await users.findByEmail(emailFor(input.email));
  if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) fail('Email or password is incorrect.', 401);
  return authenticated(user);
}

async function requestOtp({ email: rawEmail, purpose, name, password }) {
  const email = emailFor(rawEmail);
  const existingUser = await users.findByEmail(email);
  if (purpose === 'signup' && existingUser) fail('An account with this email already exists.', 409);

  const genericResponse = { message: 'If this email can use that flow, a code will arrive shortly.' };
  if ((purpose === 'login' || purpose === 'password-reset') && !existingUser) return genericResponse;

  const previous = await AuthOtpChallenge.findOne({ email, purpose });
  if (previous && previous.resendAfter > new Date()) fail('Please wait a minute before requesting another code.', 429);

  const code = String(crypto.randomInt(100000, 1000000));
  const challenge = {
    email,
    purpose,
    ...(name ? { name } : {}),
    ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    otpHash: otpDigest(email, purpose, code),
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    resendAfter: new Date(Date.now() + OTP_RESEND_MS)
  };
  await AuthOtpChallenge.findOneAndUpdate({ email, purpose }, { $set: challenge }, { upsert: true, new: true, runValidators: true });

  try {
    await emailService.sendOtp({ email, name, code, purpose });
  } catch (error) {
    await AuthOtpChallenge.deleteOne({ email, purpose });
    throw error;
  }
  return genericResponse;
}

async function consumeOtp(email, purpose, code) {
  const challenge = await AuthOtpChallenge.findOneAndUpdate(
    { email, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  ).select('+otpHash +passwordHash');
  if (!challenge) fail('That code has expired or can no longer be used. Request a new code.', 400);

  const expected = Buffer.from(challenge.otpHash, 'hex');
  const received = Buffer.from(otpDigest(email, purpose, code), 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) await AuthOtpChallenge.deleteOne({ _id: challenge._id });
    fail('That code is not correct. Check it and try again.', 400);
  }
  await AuthOtpChallenge.deleteOne({ _id: challenge._id });
  return challenge;
}

async function verifySignupOtp(input) {
  const email = emailFor(input.email);
  const challenge = await consumeOtp(email, 'signup', input.code);
  if (!challenge.passwordHash || !challenge.name) fail('Sign-up details expired. Please start again.', 400);
  if (await User.exists({ email })) fail('An account with this email already exists.', 409);
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const user = await users.create({ name: challenge.name, email, passwordHash: challenge.passwordHash, emailVerifiedAt: new Date(), role: adminEmail && email === adminEmail ? 'admin' : 'user' });
  return authenticated(user);
}

async function verifyLoginOtp(input) {
  const email = emailFor(input.email);
  await consumeOtp(email, 'login', input.code);
  const user = await users.findByEmail(email);
  if (!user) fail('That code is no longer valid. Request a new one.', 400);
  return authenticated(user);
}

async function resetPasswordWithOtp(input) {
  const email = emailFor(input.email);
  await consumeOtp(email, 'password-reset', input.code);
  const user = await User.findOne({ email });
  if (!user) fail('That code is no longer valid. Request a new one.', 400);
  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  await user.save();
  return { message: 'Password updated. You can sign in with the new password.' };
}

async function googleLogin(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) fail('Google sign-in is not configured yet.', 503);
  try {
    googleClient ||= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) fail('Google could not verify this email address.', 401);

    const email = emailFor(profile.email);
    let user = await users.findByGoogleSub(profile.sub);
    if (user) return authenticated(user);

    const existing = await users.findByEmail(email);
    if (existing) {
      const googleIsAuthoritative = email.endsWith('@gmail.com') || Boolean(profile.hd && profile.email_verified);
      if (!googleIsAuthoritative || existing.googleSub) fail('This email already has an account. Sign in with email and a code to protect that account.', 409);
      existing.googleSub = profile.sub;
      existing.emailVerifiedAt ||= new Date();
      await existing.save();
      return authenticated(existing);
    }

    user = await users.create({
      name: (profile.name || email.split('@')[0]).slice(0, 80),
      email,
      googleSub: profile.sub,
      emailVerifiedAt: new Date(),
      role: 'user'
    });
    return authenticated(user);
  } catch (error) {
    if (error.status) throw error;
    fail('Google sign-in could not be verified. Please try again.', 401);
  }
}

module.exports = { register, login, requestOtp, verifySignupOtp, verifyLoginOtp, resetPasswordWithOtp, googleLogin };

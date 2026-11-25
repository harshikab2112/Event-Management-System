const nodemailer = require('nodemailer');

let transporter;

function mailer() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) {
    const error = new Error('Email delivery is not configured. Add SMTP settings to .env.');
    error.status = 503;
    throw error;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const auth = process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined;
  transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, auth });
  return transporter;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function sendOtp({ email, name, code, purpose }) {
  const action = purpose === 'signup' ? 'verify your email' : purpose === 'password-reset' ? 'reset your password' : 'sign in';
  const safeName = escapeHtml(name || 'there');
  await mailer().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Your Gatherly code to ${action}`,
    text: `Hi ${name || 'there'}, your Gatherly verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#1d2d3b"><p>Hi ${safeName},</p><h1 style="font-size:22px">Your Gatherly verification code</h1><p>Use this code to ${action}. It expires in 10 minutes.</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 0">${code}</p><p style="color:#657383;font-size:13px">If you did not request this, you can ignore this message. Never share your code with anyone.</p></div>`
  });
}

module.exports = { sendOtp };

const auth = require('../../services/auth.service');
const users = require('../../../database/repositories/user.repository');
const safeProfile = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
async function register(req, res, next) { try { res.status(201).json(await auth.register(req.body)); } catch (error) { next(error); } }
async function login(req, res, next) { try { res.json(await auth.login(req.body)); } catch (error) { next(error); } }
async function requestSignupOtp(req, res, next) { try { res.status(202).json(await auth.requestOtp({ ...req.body, purpose: 'signup' })); } catch (error) { next(error); } }
async function verifySignupOtp(req, res, next) { try { res.status(201).json(await auth.verifySignupOtp(req.body)); } catch (error) { next(error); } }
async function requestLoginOtp(req, res, next) { try { res.status(202).json(await auth.requestOtp({ ...req.body, purpose: 'login' })); } catch (error) { next(error); } }
async function verifyLoginOtp(req, res, next) { try { res.json(await auth.verifyLoginOtp(req.body)); } catch (error) { next(error); } }
async function requestPasswordResetOtp(req, res, next) { try { res.status(202).json(await auth.requestOtp({ ...req.body, purpose: 'password-reset' })); } catch (error) { next(error); } }
async function resetPassword(req, res, next) { try { res.json(await auth.resetPasswordWithOtp(req.body)); } catch (error) { next(error); } }
async function google(req, res, next) { try { res.json(await auth.googleLogin(req.body.credential)); } catch (error) { next(error); } }
async function me(req, res, next) { try { res.json({ user: safeProfile(await users.findSafeById(req.user.id)) }); } catch (error) { next(error); } }
async function updateMe(req, res, next) { try { res.json({ user: safeProfile(await users.updateName(req.user.id, req.body.name)) }); } catch (error) { next(error); } }
module.exports = { register, login, requestSignupOtp, verifySignupOtp, requestLoginOtp, verifyLoginOtp, requestPasswordResetOtp, resetPassword, google, me, updateMe };

const jwt = require('jsonwebtoken');
const users = require('../../../database/repositories/user.repository');

async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findSafeById(claims.sub);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (_) { res.status(401).json({ message: 'Invalid or expired token.' }); }
}
async function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator role required.' });
  next();
}
module.exports = { authenticate, optionalAuthenticate, requireAdmin };

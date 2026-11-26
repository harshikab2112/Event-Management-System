const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./api/docs/openapi');
const authRoutes = require('./api/routes/auth.routes');
const eventRoutes = require('./api/routes/event.routes');
const customerRoutes = require('./api/routes/customer.routes');
const errorHandler = require('./api/middleware/error');

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", 'https://accounts.google.com'],
      'connect-src': ["'self'", 'https://accounts.google.com'],
      'frame-src': ["'self'", 'https://accounts.google.com'],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://accounts.google.com'
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com'
      ],
      'img-src': ["'self'", 'data:', 'https:']
    }
  }
}));

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origin is not allowed.'), { status: 403 }));
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (req, res) => {
  const connected = require('mongoose').connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected, database: connected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
});
app.get('/api/openapi.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));
app.use('/api', (req, res, next) => require('mongoose').connection.readyState === 1
  ? next()
  : res.status(503).json({ message: 'Database is unavailable. Check MONGODB_URI and Atlas network access.' }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', require('./api/routes/category.routes'));
app.use('/api/inquiries', require('./api/routes/inquiry.routes'));
app.use('/api', customerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get(/.*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(errorHandler);
module.exports = app;

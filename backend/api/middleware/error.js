function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with this value already exists.' });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Internal server error.' : error.message });
}
module.exports = errorHandler;

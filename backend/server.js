require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('./app');
const connectDatabase = require('../database/config/db');

async function start() {
  const port = process.env.PORT || 3000;
  await connectDatabase();
  require('./services/reminder.service').startReminderScheduler();
  const server = app.listen(port, () => console.log('API server listening on http://localhost:' + port));
  const shutdown = () => server.close(async () => { await require('mongoose').disconnect(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
start().catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });

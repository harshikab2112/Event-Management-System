require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  process.env.NODE_ENV = 'test';
  const memory = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memory.getUri('gatherly_api_test');
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  process.env.ADMIN_EMAIL = 'admin@example.test';
  const app = require('../backend/app');
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const environment = require('../postman/local.postman_environment.json');
  environment.values.find((value) => value.key === 'base_url').value = 'http://127.0.0.1:' + server.address().port;
  const newman = require('newman');
  try {
    await new Promise((resolve, reject) => newman.run({
      collection: path.join(__dirname, '..', 'postman', 'Event-Platform.postman_collection.json'),
      environment,
      reporters: 'cli'
    }, (error, summary) => error || summary.run.failures.length
      ? reject(error || new Error(summary.run.failures.length + ' Postman request(s) failed.'))
      : resolve(summary)));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await memory.stop();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

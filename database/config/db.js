const mongoose = require('mongoose');

async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Set your MongoDB Atlas connection string in .env.');
  const dbName = process.env.MONGODB_DB_NAME || 'event_management_system';
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, dbName });
  console.log('MongoDB connected:', mongoose.connection.name);
}

module.exports = connectDatabase;

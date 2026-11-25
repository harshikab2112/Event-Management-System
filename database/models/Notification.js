const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['registration_confirmed', 'registration_cancelled', 'event_update', 'event_reminder'], required: true },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 300 },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, event: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'event_reminder' } });
module.exports = mongoose.model('Notification', notificationSchema);

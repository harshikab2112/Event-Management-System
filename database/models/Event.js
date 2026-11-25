const mongoose = require('mongoose');
const crypto = require('crypto');

const attendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  ticketCode: { type: String, default: () => crypto.randomBytes(18).toString('base64url'), select: false },
  checkedInAt: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  category: { type: String, required: true, trim: true, maxlength: 40, default: 'Other', index: true },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  eventDate: { type: Date, required: true, index: true },
  startTime: { type: String, required: true }, endTime: { type: String, default: '' },
  capacity: { type: Number, required: true, min: 1, max: 100000, default: 50 },
  price: { type: Number, min: 0, default: 0 }, imageUrl: { type: String, trim: true, default: '' },
  organizer: { type: String, required: true, trim: true, maxlength: 100 },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ['Draft', 'Published', 'Cancelled'], default: 'Published', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, attendees: [attendeeSchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

eventSchema.virtual('seatsBooked').get(function () { return this.attendees?.length || 0; });
eventSchema.virtual('seatsRemaining').get(function () { return Math.max(this.capacity - (this.attendees?.length || 0), 0); });
eventSchema.virtual('isFull').get(function () { return (this.attendees?.length || 0) >= this.capacity; });
eventSchema.index({ title: 'text', description: 'text', location: 'text', organizer: 'text' });

module.exports = mongoose.model('Event', eventSchema);

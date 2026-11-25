const mongoose = require('mongoose');
const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true }, eventTitle: { type: String, trim: true, maxlength: 120, default: '' },
  guests: { type: Number, min: 1, max: 10000, default: 1 }, budget: { type: String, trim: true, maxlength: 80, default: '' },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 1500 },
  status: { type: String, enum: ['New', 'In progress', 'Quoted', 'Closed'], default: 'New', index: true }
}, { timestamps: true });
module.exports = mongoose.model('Inquiry', inquirySchema);

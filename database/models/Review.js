const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 8, maxlength: 1000 }
}, { timestamps: true });

reviewSchema.index({ event: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('Review', reviewSchema);

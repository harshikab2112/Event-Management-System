const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
  description: { type: String, trim: true, maxlength: 240, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

categorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
module.exports = mongoose.model('Category', categorySchema);

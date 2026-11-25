const Inquiry = require('../models/Inquiry');
const create = (input) => Inquiry.create(input);
const list = () => Inquiry.find().sort({ createdAt: -1 }).populate('event', 'title eventDate');
const updateStatus = (id, status) => Inquiry.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
module.exports = { create, list, updateStatus };

const Review = require('../models/Review');
const list = (event) => Review.find({ event }).sort({ createdAt: -1 }).populate('user', 'name');
const featured = () => Review.find({ rating: { $gte: 4 } }).sort({ createdAt: -1 }).limit(6).populate('user', 'name').populate('event', 'title category');
const create = (data) => Review.create(data);
const summary = (event) => Review.aggregate([{ $match: { event } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
const removeForEvent = (event) => Review.deleteMany({ event });
module.exports = { list, featured, create, summary, removeForEvent };

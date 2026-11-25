const Favorite = require('../models/Favorite');
const findOne = (user, event) => Favorite.findOne({ user, event });
const add = (user, event) => Favorite.create({ user, event });
const remove = (user, event) => Favorite.findOneAndDelete({ user, event });
const list = (user) => Favorite.find({ user }).sort({ createdAt: -1 }).populate({ path: 'event', select: '-attendees.email' });
const removeForEvent = (event) => Favorite.deleteMany({ event });
module.exports = { findOne, add, remove, list, removeForEvent };

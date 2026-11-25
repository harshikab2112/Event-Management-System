const Notification = require('../models/Notification');
const list = (user) => Notification.find({ user }).sort({ createdAt: -1 }).limit(100).populate('event', 'title eventDate');
const unreadCount = (user) => Notification.countDocuments({ user, readAt: null });
const create = (data) => Notification.create(data);
const markRead = (user, id) => Notification.findOneAndUpdate({ _id: id, user }, { readAt: new Date() }, { new: true });
const markAllRead = (user) => Notification.updateMany({ user, readAt: null }, { readAt: new Date() });
const removeForEvent = (event) => Notification.deleteMany({ event });
module.exports = { list, unreadCount, create, markRead, markAllRead, removeForEvent };

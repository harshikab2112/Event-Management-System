const Event = require('../models/Event');

async function list({ query, sort, page, limit }) {
  const [items, total] = await Promise.all([
    Event.find(query).select('-attendees.email').sort(sort).skip((page - 1) * limit).limit(limit).populate('createdBy', 'name'),
    Event.countDocuments(query)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
const findById = (id) => Event.findById(id);
const create = (data) => Event.create(data);
const save = (event) => event.save();
const remove = (id) => Event.findByIdAndDelete(id);
const reserveSeat = (id, user, attendee) => Event.findOneAndUpdate(
  { _id: id, status: 'Published', eventDate: { $gte: new Date() }, 'attendees.user': { $ne: user }, $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] } },
  { $push: { attendees: attendee } }, { new: true, runValidators: true }
);
const cancelSeat = (id, user) => Event.findOneAndUpdate(
  { _id: id, 'attendees.user': user }, { $pull: { attendees: { user } } }, { new: true }
);
const myRegistrations = (userId) => Event.find({ 'attendees.user': userId })
  .sort({ eventDate: 1 }).select('-attendees.email +attendees.ticketCode');
const checkIn = (eventId, ticketCode) => Event.findOneAndUpdate(
  { _id: eventId, 'attendees.ticketCode': ticketCode, 'attendees.checkedInAt': null },
  { $set: { 'attendees.$.checkedInAt': new Date() } }, { new: true }
).select('+attendees.ticketCode');

async function stats() {
  const [totalEvents, upcoming, bookings, revenue, categories, bookingTrend] = await Promise.all([
    Event.countDocuments(), Event.countDocuments({ eventDate: { $gte: new Date() }, status: 'Published' }),
    Event.aggregate([{ $project: { count: { $size: '$attendees' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
    Event.aggregate([{ $match: { status: 'Published' } }, { $project: { value: { $multiply: ['$price', { $size: '$attendees' }] } } }, { $group: { _id: null, total: { $sum: '$value' } } }]),
    Event.aggregate([{ $group: { _id: '$category', events: { $sum: 1 }, bookings: { $sum: { $size: '$attendees' } } } }, { $sort: { events: -1 } }]),
    Event.aggregate([{ $unwind: '$attendees' }, { $match: { 'attendees.registeredAt': { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$attendees.registeredAt' } }, total: { $sum: 1 } } }, { $sort: { _id: 1 } }])
  ]);
  return { totalEvents, upcoming, seatsBooked: bookings[0]?.total || 0, revenue: revenue[0]?.total || 0, categories, bookingTrend };
}

async function attendeeList(search = '') {
  const pipeline = [{ $unwind: '$attendees' }];
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    pipeline.push({ $match: { $or: [{ 'attendees.name': pattern }, { 'attendees.email': pattern }, { title: pattern }] } });
  }
  pipeline.push(
    { $sort: { 'attendees.registeredAt': -1 } },
    { $limit: 500 },
    { $project: { _id: '$attendees._id', name: '$attendees.name', email: '$attendees.email', registeredAt: '$attendees.registeredAt', event: { id: '$_id', title: '$title', eventDate: '$eventDate', location: '$location' } } }
  );
  return Event.aggregate(pipeline);
}
module.exports = { list, findById, create, save, remove, reserveSeat, cancelSeat, myRegistrations, checkIn, attendeeList, stats };

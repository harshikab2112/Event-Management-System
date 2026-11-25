const mongoose = require('mongoose');
const events = require('../../database/repositories/event.repository');
const customer = require('./customer.service');
const categoryService = require('./category.service');

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function buildQuery(filters) {
  const query = {};
  if (filters.search) { const text = new RegExp(escapeRegex(filters.search), 'i'); query.$or = [{ title: text }, { description: text }, { location: text }, { organizer: text }]; }
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.from || filters.to) { query.eventDate = {}; if (filters.from) query.eventDate.$gte = filters.from; if (filters.to) query.eventDate.$lte = filters.to; }
  return query;
}
function ensureId(id) { if (!mongoose.isValidObjectId(id)) { const error = new Error('Event ID is invalid.'); error.status = 400; throw error; } }
async function list(filters) {
  const sort = { [filters.sortBy]: filters.order === 'desc' ? -1 : 1 };
  const data = await events.list({ query: buildQuery(filters), sort, page: filters.page, limit: filters.limit });
  const items = data.items.map((item) => { const value = item.toJSON(); value.attendees = undefined; return value; });
  return { ...data, items };
}
async function findEvent(id) { ensureId(id); const event = await events.findById(id); if (!event) { const error = new Error('Event not found.'); error.status = 404; throw error; } return event; }
function publicEvent(event) { const value = event.toJSON(); value.attendees = undefined; return value; }
async function get(id, viewer) {
  const event = await findEvent(id);
  if (event.status !== 'Published' && viewer?.role !== 'admin') { const error = new Error('Event not found.'); error.status = 404; throw error; }
  return publicEvent(event);
}
async function create(input, userId) { input.category = await categoryService.validateEventCategory(input.category); return events.create({ ...input, createdBy: userId }); }
async function update(id, input) {
  const event = await findEvent(id);
  if (input.category !== undefined) input.category = await categoryService.validateEventCategory(input.category);
  if (input.capacity !== undefined && input.capacity < event.attendees.length) { const error = new Error('Capacity cannot be lower than existing registrations.'); error.status = 400; throw error; }
  Object.assign(event, input);
  return events.save(event);
}
async function remove(id) { await findEvent(id); await events.remove(id); await customer.purgeEventData(id); return { message: 'Event deleted.' }; }
async function register(id, user) {
  const event = await findEvent(id);
  if (event.status !== 'Published') { const error = new Error('Registration is closed for this event.'); error.status = 400; throw error; }
  if (event.eventDate < new Date()) { const error = new Error('Registration is closed for past events.'); error.status = 400; throw error; }
  if (event.attendees.some((attendee) => String(attendee.user) === user.id)) { const error = new Error('You are already registered.'); error.status = 409; throw error; }
  if (event.attendees.length >= event.capacity) { const error = new Error('This event is full.'); error.status = 409; throw error; }
  const updated = await events.reserveSeat(id, user.id, { user: user.id, name: user.name, email: user.email });
  if (!updated) { const error = new Error('A seat could not be reserved. It may be full or your account is already registered.'); error.status = 409; throw error; }
  await customer.notify({ user: user.id, type: 'registration_confirmed', title: 'You’re on the list', message: 'Your place at ' + updated.title + ' is confirmed.', event: updated._id });
  return publicEvent(updated);
}
async function cancelRegistration(id, userId) {
  await findEvent(id);
  const event = await events.cancelSeat(id, userId);
  if (!event) { const error = new Error('Registration not found.'); error.status = 404; throw error; }
  await customer.notify({ user: userId, type: 'registration_cancelled', title: 'Reservation cancelled', message: 'Your place at ' + event.title + ' has been released.', event: event._id });
  return { message: 'Registration cancelled.', seatsRemaining: event.seatsRemaining };
}
async function myRegistrations(userId) { return (await events.myRegistrations(userId)).map((event) => {
  const attendee = event.attendees.find((item) => String(item.user) === String(userId));
  const value = publicEvent(event); value.ticketCode = attendee?.ticketCode || ''; value.checkedInAt = attendee?.checkedInAt || null; return value;
}); }
async function checkIn(id, ticketCode) {
  ensureId(id);
  if (typeof ticketCode !== 'string' || ticketCode.length < 20 || ticketCode.length > 64) { const error = new Error('Ticket code is invalid.'); error.status = 400; throw error; }
  const event = await events.checkIn(id, ticketCode);
  if (!event) { const error = new Error('Ticket is invalid or has already been checked in.'); error.status = 404; throw error; }
  const attendee = event.attendees.find((item) => item.ticketCode === ticketCode);
  return { checkedIn: true, attendee: { name: attendee.name, email: attendee.email, checkedInAt: attendee.checkedInAt }, event: { id: event.id, title: event.title } };
}
async function attendeeList(search) { return events.attendeeList(search); }
module.exports = { list, get, create, update, remove, register, cancelRegistration, myRegistrations, checkIn, attendeeList, stats: events.stats };

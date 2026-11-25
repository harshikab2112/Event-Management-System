const mongoose = require('mongoose');
const repository = require('../../database/repositories/inquiry.repository');
const Event = require('../../database/models/Event');
async function create(input) {
  if (input.eventId && !mongoose.isValidObjectId(input.eventId)) { const error = new Error('Event selection is invalid.'); error.status = 400; throw error; }
  let eventTitle = '';
  if (input.eventId) {
    const event = await Event.findOne({ _id: input.eventId, status: 'Published' }).select('title');
    if (!event) { const error = new Error('Selected event was not found.'); error.status = 404; throw error; }
    eventTitle = event.title;
  }
  const { eventId, ...details } = input;
  await repository.create({ ...details, event: eventId || null, eventTitle });
  return { message: 'Your inquiry has been received. Our team will be in touch.' };
}
async function list() { return repository.list(); }
async function updateStatus(id, status) {
  if (!mongoose.isValidObjectId(id)) { const error = new Error('Inquiry ID is invalid.'); error.status = 400; throw error; }
  const updated = await repository.updateStatus(id, status);
  if (!updated) { const error = new Error('Inquiry not found.'); error.status = 404; throw error; }
  return updated;
}
module.exports = { create, list, updateStatus };

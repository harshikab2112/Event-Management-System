const mongoose = require('mongoose');
const favorites = require('../../database/repositories/favorite.repository');
const reviews = require('../../database/repositories/review.repository');
const notifications = require('../../database/repositories/notification.repository');
const eventRepository = require('../../database/repositories/event.repository');

function requireId(id, label) {
  if (!mongoose.isValidObjectId(id)) { const error = new Error(label + ' ID is invalid.'); error.status = 400; throw error; }
}
async function listFavorites(userId) {
  return (await favorites.list(userId)).filter((favorite) => favorite.event && favorite.event.status === 'Published');
}
async function addFavorite(userId, eventId) {
  requireId(eventId, 'Event');
  const event = await eventRepository.findById(eventId);
  if (!event || event.status !== 'Published') { const error = new Error('Published event not found.'); error.status = 404; throw error; }
  try { return await favorites.add(userId, eventId); }
  catch (error) { if (error.code === 11000) return favorites.findOne(userId, eventId); throw error; }
}
async function removeFavorite(userId, eventId) {
  requireId(eventId, 'Event'); await favorites.remove(userId, eventId); return { message: 'Event removed from saved list.' };
}
async function eventReviews(eventId) {
  requireId(eventId, 'Event');
  const [items, summary] = await Promise.all([reviews.list(eventId), reviews.summary(new mongoose.Types.ObjectId(eventId))]);
  return { items, summary: { average: summary[0]?.average || 0, count: summary[0]?.count || 0 } };
}
async function featuredReviews() { return reviews.featured(); }
async function addReview(user, eventId, input) {
  requireId(eventId, 'Event');
  const event = await eventRepository.findById(eventId);
  if (!event) { const error = new Error('Event not found.'); error.status = 404; throw error; }
  if (event.eventDate > new Date()) { const error = new Error('You can review an event after it has taken place.'); error.status = 400; throw error; }
  if (!event.attendees.some((attendee) => String(attendee.user) === user.id)) { const error = new Error('Only registered attendees can review this event.'); error.status = 403; throw error; }
  try { return await reviews.create({ event: eventId, user: user.id, ...input }); }
  catch (error) { if (error.code === 11000) { error.status = 409; error.message = 'You have already reviewed this event.'; } throw error; }
}
async function notificationCenter(userId) {
  const [items, unread] = await Promise.all([notifications.list(userId), notifications.unreadCount(userId)]);
  return { items, unread };
}
async function markNotificationRead(userId, notificationId) {
  requireId(notificationId, 'Notification');
  const item = await notifications.markRead(userId, notificationId);
  if (!item) { const error = new Error('Notification not found.'); error.status = 404; throw error; }
  return item;
}
async function markAllNotificationsRead(userId) { await notifications.markAllRead(userId); return { message: 'All notifications marked as read.' }; }
async function notify(data) {
  try { await notifications.create(data); }
  catch (error) { console.error('Could not create in-app notification:', error.message); }
}
async function purgeEventData(eventId) {
  await Promise.all([favorites.removeForEvent(eventId), reviews.removeForEvent(eventId), notifications.removeForEvent(eventId)]);
}

module.exports = { listFavorites, addFavorite, removeFavorite, eventReviews, featuredReviews, addReview, notificationCenter, markNotificationRead, markAllNotificationsRead, notify, purgeEventData };

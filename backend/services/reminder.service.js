const Event = require('../../database/models/Event');
const Notification = require('../../database/models/Notification');

let dispatching = false;

async function dispatchUpcomingReminders() {
  if (dispatching) return 0;
  dispatching = true;
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events = await Event.find({ status: 'Published', eventDate: { $gt: now, $lte: cutoff }, 'attendees.user': { $exists: true, $ne: null } })
      .select('title eventDate startTime attendees.user');
    let created = 0;
    for (const event of events) {
      for (const attendee of event.attendees) {
        if (!attendee.user) continue;
        const result = await Notification.updateOne(
          { user: attendee.user, event: event._id, type: 'event_reminder' },
          { $setOnInsert: {
            user: attendee.user,
            event: event._id,
            type: 'event_reminder',
            title: 'Your event is coming up',
            message: `${event.title} starts ${event.eventDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${event.startTime ? ` (${event.startTime})` : ''}. Your ticket is ready.`,
            readAt: null
          } },
          { upsert: true, setDefaultsOnInsert: true }
        );
        if (result.upsertedCount) created += 1;
      }
    }
    if (created) console.log(`Created ${created} event reminder notification(s).`);
    return created;
  } finally {
    dispatching = false;
  }
}

function startReminderScheduler(intervalMs = 15 * 60 * 1000) {
  dispatchUpcomingReminders().catch((error) => console.error('Event reminder dispatch failed:', error.message));
  const timer = setInterval(() => dispatchUpcomingReminders().catch((error) => console.error('Event reminder dispatch failed:', error.message)), intervalMs);
  timer.unref();
  return timer;
}

module.exports = { dispatchUpcomingReminders, startReminderScheduler };

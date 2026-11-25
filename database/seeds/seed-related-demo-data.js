const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Favorite = require('../models/Favorite');
const Inquiry = require('../models/Inquiry');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const User = require('../models/User');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const customerProfiles = [
  ['Anaya Rao', 'anaya.rao'], ['Ishaan Kapoor', 'ishaan.kapoor'], ['Mira Iyer', 'mira.iyer'],
  ['Arjun Nair', 'arjun.nair'], ['Sana Qureshi', 'sana.qureshi'], ['Vivaan Shah', 'vivaan.shah'],
  ['Meera Das', 'meera.das'], ['Rohan Kulkarni', 'rohan.kulkarni'], ['Tara Menon', 'tara.menon'],
  ['Kabir Bhat', 'kabir.bhat'], ['Nisha Verma', 'nisha.verma'], ['Dev Malhotra', 'dev.malhotra']
].map(([name, local]) => ({ name, email: `${local}@demo.gatherly.test` }));

const reviewComments = [
  'The sessions were practical and thoughtful. I left with a clear plan I could use with my team the next week.',
  'Warm check-in, a well-paced program, and plenty of time to meet people working on similar problems.',
  'The hosts made a large event feel welcoming. The best part was the honest discussion after the talks.',
  'A lovely afternoon with useful ideas, friendly volunteers, and a venue that was easy to get around.'
];

const inquirySamples = [
  ['Priya Nambiar', 'priya.nambiar@demo.gatherly.test', 85, '₹1,00,000–₹1,50,000', 'We are planning a product team offsite and would love a private version of this program with a short networking session.'],
  ['Neil Fernandes', 'neil.fernandes@demo.gatherly.test', 140, '₹2,00,000–₹3,00,000', 'Could you share group pricing and accessibility details for our community group? We may need reserved seating.'],
  ['Aditi Sethi', 'aditi.sethi@demo.gatherly.test', 32, '₹40,000–₹60,000', 'We are interested in a beginner-friendly workshop for our design team. Please include material and facilitator costs.'],
  ['Sameer Pillai', 'sameer.pillai@demo.gatherly.test', 210, '₹3,00,000+', 'Our company is exploring an employee evening with live music and food. Please send a proposal with a few date options.'],
  ['Farah Dsouza', 'farah.dsouza@demo.gatherly.test', 60, '₹75,000–₹1,00,000', 'Would it be possible to arrange a private gallery walk for our creative community? We would appreciate a quote.'],
  ['Karan Gill', 'karan.gill@demo.gatherly.test', 26, '₹25,000–₹40,000', 'I am coordinating a small founder group and would like to know whether you can reserve a discussion area.'],
  ['Leela Krishnan', 'leela.krishnan@demo.gatherly.test', 400, '₹4,00,000–₹6,00,000', 'We are looking for a local partner for a sustainability day with short talks and a hands-on activity.'],
  ['Om Prakash', 'om.prakash@demo.gatherly.test', 18, 'Flexible', 'Please let me know if a small private session is available for a family celebration.']
];

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
};

async function seedRelatedData() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before seeding demo data.');
  const dbName = process.env.MONGODB_DB_NAME || 'event_management_system';
  if (dbName !== 'event_management_system') throw new Error(`Safety check: expected event_management_system, got ${dbName}.`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, dbName });

  const session = await mongoose.startSession();
  const generatedCredentials = customerProfiles.map((profile) => ({
    ...profile,
    password: crypto.randomBytes(24).toString('base64url')
  }));
  const credentialsPath = path.resolve(__dirname, '../backups', `demo-customer-credentials-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

  try {
    await session.withTransaction(async () => {
      const existingDemoUsers = await User.find({ email: { $in: customerProfiles.map((profile) => profile.email) } }).session(session);
      if (existingDemoUsers.length) throw new Error('Demo customer accounts already exist; refusing to create duplicate sample data.');

      const events = await Event.find({ status: 'Published' }).sort({ eventDate: 1 }).session(session);
      if (events.length < 25) throw new Error(`Expected the 25 published demo events; found ${events.length}.`);
      const eventByTitle = new Map(events.map((event) => [event.title, event]));
      const completedTitles = ['Future of Product Summit', 'Indie Sounds Live', 'Contemporary Art Weekend'];
      const completedEvents = completedTitles.map((title, index) => {
        const event = eventByTitle.get(title);
        if (!event) throw new Error(`Required demo event not found: ${title}`);
        event.eventDate = daysAgo(31 - index * 7);
        return event;
      });

      const users = await User.create(generatedCredentials.map(({ name, email, password }) => ({
        name,
        email,
        passwordHash: bcrypt.hashSync(password, 12),
        role: 'user'
      })), { session, ordered: true });

      const assignments = new Map();
      completedEvents.forEach((event, eventIndex) => {
        assignments.set(String(event._id), users.slice(eventIndex * 4, eventIndex * 4 + 4));
      });
      events.forEach((event, eventIndex) => {
        if (assignments.has(String(event._id))) return;
        const attendeeCount = 2 + (eventIndex % 3);
        assignments.set(String(event._id), Array.from({ length: attendeeCount }, (_, attendeeIndex) => users[(eventIndex * 3 + attendeeIndex * 5) % users.length]));
      });

      const registrationNotices = [];
      for (const [eventId, attendees] of assignments) {
        const event = events.find((item) => String(item._id) === eventId);
        const oldEvent = completedEvents.includes(event);
        event.attendees = attendees.map((user, attendeeIndex) => {
          const registeredAt = oldEvent ? new Date(event.eventDate.getTime() - (21 - attendeeIndex) * 86400000) : daysAgo(3 + attendeeIndex);
          registrationNotices.push({
            user: user._id,
            type: 'registration_confirmed',
            title: 'You’re on the list',
            message: `Your place at ${event.title} is confirmed. Your ticket is ready.`,
            event: event._id,
            readAt: attendeeIndex % 3 === 0 ? daysAgo(1) : null,
            createdAt: registeredAt,
            updatedAt: registeredAt
          });
          return {
            user: user._id,
            name: user.name,
            email: user.email,
            phone: '+91 90000 ' + String(10000 + users.indexOf(user)).padStart(5, '0'),
            registeredAt
          };
        });
      }
      await Event.bulkSave(events, { session });

      const reviews = [];
      for (const event of completedEvents) {
        event.attendees.slice(0, 3).forEach((attendee, index) => reviews.push({
          event: event._id,
          user: attendee.user,
          rating: index === 1 ? 4 : 5,
          comment: reviewComments[(reviews.length + index) % reviewComments.length]
        }));
      }
      await Review.insertMany(reviews, { session });

      const favorites = [];
      users.forEach((user, userIndex) => {
        const selected = new Set([userIndex % events.length, (userIndex + 7) % events.length, (userIndex + 15) % events.length]);
        selected.forEach((eventIndex) => favorites.push({ user: user._id, event: events[eventIndex]._id }));
      });
      await Favorite.insertMany(favorites, { session });
      await Notification.insertMany(registrationNotices, { session });

      await Inquiry.insertMany(inquirySamples.map(([name, email, guests, budget, message], index) => {
        const event = events[(index * 3 + 2) % events.length];
        return { name, email, guests, budget, message, event: event._id, eventTitle: event.title, status: index < 2 ? 'New' : 'In progress' };
      }), { session });
    });
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }

  await fs.mkdir(path.dirname(credentialsPath), { recursive: true });
  await fs.writeFile(credentialsPath, JSON.stringify({ note: 'Fictional Gatherly demo accounts. Keep this file private and out of source control.', accounts: generatedCredentials.map(({ name, email, password }) => ({ name, email, password })) }, null, 2), { flag: 'wx' });
  console.log('Added 12 demo customers, attendee registrations, 9 reviews, 36 favorites, registration notifications, and 8 inquiries.');
  console.log('Marked 3 events completed so their attendee reviews follow the app rules; 22 remain upcoming.');
  console.log(`Private demo login details saved to ${credentialsPath}`);
}

seedRelatedData().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

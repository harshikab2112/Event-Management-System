const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { databaseNameFromUri, mongoConnectionOptions } = require('../config/database');

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_management_system';
const MONGODB_DATABASE = databaseNameFromUri(MONGODB_URI);
const shouldReset = process.argv.includes('--reset') || process.argv.includes('--force');

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
};

const events = [
  {
    title: 'Product Leaders Summit',
    description:
      'A focused summit for product managers, designers, and founders to plan stronger product roadmaps.',
    category: 'Conference',
    location: 'Bengaluru Convention Centre',
    eventDate: daysFromNow(12),
    startTime: '09:30',
    endTime: '17:00',
    capacity: 220,
    price: 2499,
    organizer: 'Momentum Labs',
    contactEmail: 'events@momentumlabs.example',
    status: 'Published',
    imageUrl:
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    attendees: [
      { name: 'Aarav Sharma', email: 'aarav@example.com', phone: '+91 90000 10001' },
      { name: 'Diya Mehta', email: 'diya@example.com', phone: '+91 90000 10002' }
    ]
  },
  {
    title: 'Frontend Craft Workshop',
    description:
      'Hands-on sessions covering accessible UI patterns, Tailwind workflows, and client-side state management.',
    category: 'Workshop',
    location: 'Hyderabad Tech Park',
    eventDate: daysFromNow(20),
    startTime: '11:00',
    endTime: '15:30',
    capacity: 60,
    price: 999,
    organizer: 'Pixel Forge',
    contactEmail: 'hello@pixelforge.example',
    status: 'Published',
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    attendees: [{ name: 'Kabir Rao', email: 'kabir@example.com', phone: '+91 90000 10003' }]
  },
  {
    title: 'Indie Music Night',
    description:
      'An evening concert featuring independent artists, acoustic sets, and a curated food court.',
    category: 'Concert',
    location: 'Pune Open Air Arena',
    eventDate: daysFromNow(28),
    startTime: '18:30',
    endTime: '22:00',
    capacity: 500,
    price: 799,
    organizer: 'Soundline Collective',
    contactEmail: 'tickets@soundline.example',
    status: 'Draft',
    imageUrl:
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80',
    attendees: []
  }
];

async function seed() {
  await mongoose.connect(MONGODB_URI, mongoConnectionOptions(MONGODB_URI));

  const existingEvents = await Event.countDocuments();

  if (existingEvents > 0 && !shouldReset) {
    console.log(
      `Seed skipped. ${MONGODB_DATABASE}.events already has ${existingEvents} document(s). Use "npm run seed -- --reset" to replace them.`
    );
    await mongoose.disconnect();
    return;
  }

  if (shouldReset) {
    await Event.deleteMany({});
  }

  await Event.insertMany(events);
  console.log(`Seeded event data into ${MONGODB_DATABASE}.events.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});

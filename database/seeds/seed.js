const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

dotenv.config();

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
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before seeding.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, dbName: process.env.MONGODB_DB_NAME || 'event_management_system' });
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!email) throw new Error('Set ADMIN_EMAIL before seeding.');
  const admin = await User.findOne({ email });
  if (!admin || admin.role !== 'admin') throw new Error('Register the ADMIN_EMAIL account first so seeded events have a valid owner.');
  if (await Event.countDocuments()) { console.log('Database already has events; seed skipped to preserve existing data.'); await mongoose.disconnect(); return; }
  const sampleEvents = events.map(({ attendees, ...event }) => ({ ...event, attendees: [], createdBy: admin._id }));
  await Event.insertMany(sampleEvents);
  console.log('Seeded ' + sampleEvents.length + ' sample events.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});

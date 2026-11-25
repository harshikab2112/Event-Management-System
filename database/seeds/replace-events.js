const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
};

const eventRows = [
  ['Future of Product Summit', 'A day of practical talks on product strategy, customer research, and building teams that ship.', 'Conference', 'Bengaluru', 8, '09:30', '17:00', 240, 2499, 'Northstar Labs'],
  ['Design Systems in Practice', 'A hands-on workshop for creating accessible, reusable design systems across web products.', 'Workshop', 'Hyderabad', 11, '10:00', '16:00', 48, 1299, 'Pixel Assembly'],
  ['Founders After Hours', 'An easygoing evening for startup founders to trade lessons, meet collaborators, and share what is next.', 'Meetup', 'Mumbai', 14, '18:30', '21:30', 90, 499, 'Build Circle'],
  ['Indie Sounds Live', 'A live showcase of independent artists with acoustic sets, new releases, and local food stalls.', 'Concert', 'Pune', 17, '18:00', '22:00', 600, 899, 'Frequency Collective'],
  ['City Lights 10K', 'A community night run through a closed city route with hydration points, timing chips, and finish line music.', 'Sports', 'Chennai', 20, '18:00', '21:00', 1200, 699, 'Stride Society'],
  ['Contemporary Art Weekend', 'Explore emerging artists, curator walks, and small group conversations in a two-day gallery program.', 'Exhibition', 'New Delhi', 23, '11:00', '19:00', 300, 350, 'Open Frame Gallery'],
  ['Responsible AI Forum', 'Researchers and builders discuss useful AI, responsible product choices, and practical governance.', 'Conference', 'Gurugram', 26, '09:00', '17:30', 320, 1999, 'Civic Tech Forum'],
  ['Portrait Photography Walk', 'Learn natural light, composition, and portrait direction while exploring old city streets together.', 'Workshop', 'Jaipur', 29, '07:00', '11:00', 24, 899, 'Golden Hour Studio'],
  ['Women in Technology Mixer', 'A welcoming evening of short introductions, peer networking, and conversations with women in tech.', 'Meetup', 'Kochi', 32, '17:30', '20:30', 110, 299, 'SheBuilds Network'],
  ['Rooftop Jazz Sessions', 'A sunset concert featuring a modern jazz quartet and guest musicians in an intimate rooftop setting.', 'Concert', 'Mumbai', 35, '18:30', '22:00', 180, 1199, 'Blue Note Events'],
  ['Community Badminton Open', 'A friendly doubles tournament for mixed skill levels with coached warmups and refreshments.', 'Sports', 'Bengaluru', 38, '08:00', '15:00', 128, 550, 'Rally Club'],
  ['Craft Futures Market', 'A curated showcase of independent makers, sustainable materials, ceramics, textiles, and home objects.', 'Exhibition', 'Ahmedabad', 41, '10:00', '18:00', 500, 250, 'Handmade District'],
  ['Cloud Native India Day', 'Engineering talks and demos on Kubernetes, platform teams, observability, and cloud cost control.', 'Conference', 'Hyderabad', 44, '09:30', '18:00', 400, 1799, 'Cloud Native Guild'],
  ['Modern JavaScript Lab', 'Build a small production-ready feature while learning testing, performance, and resilient frontend patterns.', 'Workshop', 'Pune', 47, '10:00', '16:30', 55, 1499, 'Script House'],
  ['Climate Builders Meetup', 'A peer meetup for climate founders, researchers, and volunteers working on practical local solutions.', 'Meetup', 'Chennai', 50, '17:00', '20:00', 100, 0, 'Green Futures Collective'],
  ['Summer Strings Orchestra', 'A relaxed orchestral evening featuring contemporary Indian compositions and familiar film themes.', 'Concert', 'Kolkata', 53, '18:00', '21:00', 700, 999, 'Eastern Arts Society'],
  ['Monsoon Trail Challenge', 'A guided trail race with beginner and advanced routes, safety support, and post-race community lunch.', 'Sports', 'Dehradun', 56, '06:00', '13:00', 450, 799, 'Wildpath Athletics'],
  ['Illustration and Print Fair', 'Meet illustrators, browse limited-run prints, watch live demos, and join short creative sessions.', 'Exhibition', 'Kolkata', 59, '11:00', '19:00', 350, 300, 'Paperplane Studio'],
  ['Designing for Accessibility', 'A practical conference on inclusive research, accessible interfaces, and testing with real users.', 'Conference', 'New Delhi', 62, '09:30', '17:00', 260, 1599, 'Access Works India'],
  ['Ceramics for Beginners', 'Shape, glaze, and finish a small ceramic piece in a friendly studio class with materials provided.', 'Workshop', 'Jaipur', 65, '10:30', '14:30', 20, 1199, 'Earth & Ember Studio'],
  ['Product People Breakfast', 'Start the day with a guided breakfast conversation about customer trust and sustainable growth.', 'Meetup', 'Gurugram', 68, '08:00', '10:30', 70, 399, 'Product Commons'],
  ['Acoustic Garden Festival', 'An outdoor music festival with acoustic performers, picnic spaces, and independent food vendors.', 'Concert', 'Pune', 71, '16:00', '22:00', 900, 1299, 'Fieldnotes Live'],
  ['Inclusive Football Festival', 'A community football day with open teams, inclusive coaching, and activities for young players.', 'Sports', 'Kochi', 74, '08:00', '16:00', 240, 199, 'Common Ground Sports'],
  ['Future Home Design Expo', 'A thoughtful exhibition of energy-smart homes, local materials, and practical interior innovations.', 'Exhibition', 'Bengaluru', 77, '10:00', '18:00', 550, 450, 'Habitat Futures'],
  ['Data Stories Conference', 'Analysts and storytellers share clear ways to turn complex data into useful decisions and narratives.', 'Conference', 'Chennai', 80, '09:00', '17:00', 280, 1899, 'Signal & Story']
];

const coverPhotos = [
  'photo-1762968274962-20c12e6e8ecd', // Product conference keynote
  'photo-1581091212911-f4efc3f71c48', // Design workshop team
  'photo-1726250873216-7fcf000fa796', // Founders team discussion
  'photo-1767683434151-fa876f3adde1', // Indie guitarist and crowd
  'photo-1745790289741-12a211a8325d', // City marathon
  'photo-1770747717041-069127dad7d8', // Contemporary gallery
  'photo-1769798643655-e0f10f62c3fd', // AI forum audience
  'photo-1758987016935-1f18b9780944', // Portrait photography
  'photo-1775163560631-6ff15eb2fa1f', // Women in technology mixer
  'photo-1774514580566-c67d71613769', // Jazz club stage
  'photo-1723074832950-9fb031b0f4ec', // Badminton tournament
  'photo-1763795258711-f4e07b4faf10', // Craft market stalls
  'photo-1560439514-0fc9d2cd5e1b', // Cloud conference
  'photo-1581091212911-f4efc3f71c48', // JavaScript workshop
  'photo-1748615734058-1831b2af4a44', // Climate and clean energy
  'photo-1793050756619-145bd22c3c95', // Orchestra and festival crowd
  'photo-1775400787690-dd70109c629b', // Trail runners
  'photo-1778956709380-666cd4816579', // Illustration exhibition
  'photo-1560439514-0fc9d2cd5e1b', // Accessibility conference
  'photo-1422246358533-95dcd3d48961', // Ceramics workshop
  'photo-1528605248644-14dd04022da1', // Product breakfast
  'photo-1790306830782-63d4cd3ea5b0', // Outdoor music festival
  'photo-1777715329494-82b92bc4874f', // Community football
  'photo-1770747717041-069127dad7d8', // Home design exhibition
  'photo-1762968274962-20c12e6e8ecd' // Data conference
];

const events = eventRows.map(([title, description, category, location, day, startTime, endTime, capacity, price, organizer], index) => ({
  title,
  description,
  category,
  location,
  eventDate: daysFromNow(day),
  startTime,
  endTime,
  capacity,
  price,
  organizer,
  contactEmail: `events@${organizer.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example`,
  status: 'Published',
  imageUrl: `https://images.unsplash.com/${coverPhotos[index]}?auto=format&fit=crop&crop=entropy&w=1600&h=900&q=85`
}));

async function replaceEvents() {
  if (process.argv.includes('--dry-run')) {
    console.log(`Prepared ${events.length} published events for event_management_system.events:`);
    events.forEach((event, index) => console.log(`${String(index + 1).padStart(2, '0')}. ${event.title} — ${event.category}, ${event.location}`));
    return;
  }
  if (!process.argv.includes('--confirm-replace-events')) {
    throw new Error('Safety check: rerun with --confirm-replace-events only after confirming the events collection replacement.');
  }
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before replacing events.');

  const dbName = process.env.MONGODB_DB_NAME || 'event_management_system';
  if (dbName !== 'event_management_system') {
    throw new Error(`Safety check: expected event_management_system, got ${dbName}.`);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, dbName });
  try {
    const existingEvents = await Event.collection.find({}).toArray();
    const backupDirectory = path.resolve(__dirname, '../backups');
    await fs.mkdir(backupDirectory, { recursive: true });
    const backupPath = path.join(backupDirectory, `events-before-replacement-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await fs.writeFile(backupPath, JSON.stringify(existingEvents, null, 2), { flag: 'wx' });

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const admin = adminEmail ? await User.findOne({ email: adminEmail, role: 'admin' }).select('_id') : null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Event.deleteMany({}, { session });
        await Event.insertMany(events.map((event) => ({ ...event, ...(admin ? { createdBy: admin._id } : {}) })), { session });
      });
    } finally {
      await session.endSession();
    }

    const insertedCount = await Event.countDocuments();
    if (insertedCount !== 25) throw new Error(`Expected 25 events after replacement; found ${insertedCount}. Backup: ${backupPath}`);
    console.log(`Replaced ${existingEvents.length} event documents with ${insertedCount} published events.`);
    console.log(`Backup saved at ${backupPath}`);
  } finally {
    await mongoose.disconnect();
  }
}

replaceEvents().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

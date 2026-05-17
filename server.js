const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const Event = require('./models/Event');
const { databaseNameFromUri, mongoConnectionOptions } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_management_system';
const MONGODB_DATABASE = databaseNameFromUri(MONGODB_URI);

mongoose.set('bufferCommands', false);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function buildEventQuery(queryParams) {
  const query = {};
  const { search, category, status, from, to } = queryParams;

  if (search && search.trim()) {
    const pattern = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: pattern },
      { description: pattern },
      { location: pattern },
      { organizer: pattern }
    ];
  }

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  if (from || to) {
    query.eventDate = {};
    if (from) {
      query.eventDate.$gte = new Date(from);
    }
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.eventDate.$lte = end;
    }
  }

  return query;
}

function getSort(queryParams) {
  const sortBy = queryParams.sortBy || 'eventDate';
  const order = queryParams.order === 'desc' ? -1 : 1;
  const allowedSorts = ['eventDate', 'createdAt', 'title', 'capacity', 'price'];

  return {
    [allowedSorts.includes(sortBy) ? sortBy : 'eventDate']: order
  };
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        'MongoDB is not connected. Start MongoDB locally or add a MongoDB Atlas URI in .env, then restart the server.'
    });
  }

  next();
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    databaseName: MONGODB_DATABASE
  });
});

app.use('/api/events', requireDatabase);

app.get('/api/events', async (req, res, next) => {
  try {
    const events = await Event.find(buildEventQuery(req.query)).sort(getSort(req.query));
    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

app.post('/api/events', async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

app.put('/api/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.json({ message: 'Event deleted.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/events/:id/register', async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (event.status === 'Cancelled') {
      return res.status(400).json({ message: 'Registration is closed for cancelled events.' });
    }

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const alreadyRegistered = event.attendees.some(
      (attendee) => attendee.email === normalizedEmail
    );

    if (alreadyRegistered) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: 'This event is full.' });
    }

    event.attendees.push({
      name,
      email: normalizedEmail,
      phone
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ message: details.join(' ') });
  }

  if (error.name === 'CastError') {
    return res.status(404).json({ message: 'Resource not found.' });
  }

  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Event Management System running at http://localhost:${PORT}`);
});

mongoose
  .connect(MONGODB_URI, mongoConnectionOptions(MONGODB_URI))
  .then(() => {
    console.log(`MongoDB connected to ${MONGODB_DATABASE}`);
  })
  .catch((error) => {
    console.error('MongoDB connection failed');
    console.error(error.message);
  });

const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Attendee name is required.'],
      trim: true,
      maxlength: [80, 'Attendee name is too long.']
    },
    email: {
      type: String,
      required: [true, 'Attendee email is required.'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Attendee email is invalid.']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number is too long.']
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required.'],
      trim: true,
      maxlength: [120, 'Event title is too long.']
    },
    description: {
      type: String,
      required: [true, 'Event description is required.'],
      trim: true,
      maxlength: [1200, 'Event description is too long.']
    },
    category: {
      type: String,
      enum: ['Conference', 'Workshop', 'Meetup', 'Concert', 'Sports', 'Exhibition', 'Other'],
      default: 'Other'
    },
    location: {
      type: String,
      required: [true, 'Event location is required.'],
      trim: true,
      maxlength: [160, 'Event location is too long.']
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required.']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required.'],
      trim: true
    },
    endTime: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required.'],
      min: [1, 'Capacity must be at least 1.'],
      max: [100000, 'Capacity is too large.'],
      default: 50
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative.'],
      default: 0
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    organizer: {
      type: String,
      required: [true, 'Organizer name is required.'],
      trim: true,
      maxlength: [100, 'Organizer name is too long.']
    },
    contactEmail: {
      type: String,
      required: [true, 'Organizer contact email is required.'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Organizer contact email is invalid.']
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Cancelled'],
      default: 'Published'
    },
    attendees: [attendeeSchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

eventSchema.virtual('seatsBooked').get(function getSeatsBooked() {
  return this.attendees.length;
});

eventSchema.virtual('seatsRemaining').get(function getSeatsRemaining() {
  return Math.max(this.capacity - this.attendees.length, 0);
});

eventSchema.virtual('isFull').get(function getIsFull() {
  return this.attendees.length >= this.capacity;
});

eventSchema.index({ title: 'text', description: 'text', location: 'text', organizer: 'text' });

module.exports = mongoose.model('Event', eventSchema);

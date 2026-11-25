const { z } = require('zod');
const fields = {
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(10).max(1200),
  category: z.string().trim().min(2).max(40),
  location: z.string().trim().min(2).max(160), eventDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().default(''),
  capacity: z.coerce.number().int().min(1).max(100000), price: z.coerce.number().min(0).default(0),
  imageUrl: z.string().url().or(z.literal('')).optional().default(''), organizer: z.string().trim().min(2).max(100),
  contactEmail: z.string().email(), status: z.enum(['Draft', 'Published', 'Cancelled']).default('Published')
};
const createEventDto = z.object(fields).strict();
const updateEventDto = z.object(fields).partial().strict().refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one event field to update.' });
const listEventsDto = z.object({ search: z.string().max(120).optional(), category: z.string().optional(), status: z.enum(['Draft', 'Published', 'Cancelled']).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), sortBy: z.enum(['eventDate', 'createdAt', 'title', 'capacity', 'price']).default('eventDate'), order: z.enum(['asc', 'desc']).default('asc'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(12) });
module.exports = { createEventDto, updateEventDto, listEventsDto };

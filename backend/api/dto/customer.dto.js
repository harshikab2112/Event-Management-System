const { z } = require('zod');
const reviewDto = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(8).max(1000) }).strict();
const profileDto = z.object({ name: z.string().trim().min(2).max(80) }).strict();
module.exports = { reviewDto, profileDto };

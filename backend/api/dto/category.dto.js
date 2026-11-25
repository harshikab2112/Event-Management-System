const { z } = require('zod');
const createCategoryDto = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(240).optional().default(''),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional().default(0)
}).strict();
const updateCategoryDto = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(240).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');
module.exports = { createCategoryDto, updateCategoryDto };

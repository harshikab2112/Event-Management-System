const repository = require('../../database/repositories/category.repository');
const defaults = ['Conference', 'Workshop', 'Meetup', 'Concert', 'Sports', 'Exhibition', 'Other'];

function fail(message, status) { const error = new Error(message); error.status = status; throw error; }
async function ensureDefaults() {
  await Promise.all(defaults.map((name, sortOrder) => repository.findByName(name).then((item) => item || repository.create({ name, sortOrder }))));
}
async function list(admin = false) { await ensureDefaults(); return repository.list(!admin); }
async function create(input) {
  await ensureDefaults();
  if (await repository.findByName(input.name)) fail('A category with this name already exists.', 409);
  return repository.create(input);
}
async function update(id, input) {
  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(id)) fail('Category ID is invalid.', 400);
  const category = await repository.findById(id);
  if (!category) fail('Category not found.', 404);
  if (input.name && input.name.toLowerCase() !== category.name.toLowerCase()) {
    const existing = await repository.findByName(input.name);
    if (existing) fail('A category with this name already exists.', 409);
    await repository.renameEvents(category.name, input.name);
    category.name = input.name;
  }
  if (input.description !== undefined) category.description = input.description;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) category.isActive = input.isActive;
  return repository.save(category);
}
async function remove(id) {
  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(id)) fail('Category ID is invalid.', 400);
  const category = await repository.findById(id);
  if (!category) fail('Category not found.', 404);
  if (defaults.some((name) => name.toLowerCase() === category.name.toLowerCase())) fail('Built-in categories cannot be deleted. Archive them instead.', 409);
  if (await repository.eventCount(category.name)) fail('This category is used by events. Archive it instead.', 409);
  await repository.remove(id);
  return { message: 'Category deleted.' };
}
async function validateEventCategory(name) {
  await ensureDefaults();
  const category = await repository.findByName(name);
  if (!category || !category.isActive) fail('Choose an active event category.', 400);
  return category.name;
}
module.exports = { list, create, update, remove, validateEventCategory };

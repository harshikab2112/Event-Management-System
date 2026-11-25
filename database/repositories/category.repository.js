const Category = require('../models/Category');
const Event = require('../models/Event');

async function list(activeOnly = false) {
  return Category.find(activeOnly ? { isActive: true } : {}).sort({ sortOrder: 1, name: 1 }).lean();
}
async function findByName(name) { return Category.findOne({ name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }); }
async function create(input) { return Category.create(input); }
async function save(category) { return category.save(); }
async function findById(id) { return Category.findById(id); }
async function remove(id) { return Category.deleteOne({ _id: id }); }
async function eventCount(name) { return Event.countDocuments({ category: name }); }
async function renameEvents(oldName, newName) { return Event.updateMany({ category: oldName }, { $set: { category: newName } }); }
module.exports = { list, findByName, create, save, findById, remove, eventCount, renameEvents };

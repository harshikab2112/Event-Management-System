const User = require('../models/User');
const findByEmail = (email) => User.findOne({ email }).select('+passwordHash +googleSub');
const findByGoogleSub = (googleSub) => User.findOne({ googleSub });
const create = (data) => User.create(data);
const findSafeById = (id) => User.findById(id).select('name email role createdAt');
const updateName = (id, name) => User.findByIdAndUpdate(id, { name }, { new: true, runValidators: true }).select('name email role createdAt');
module.exports = { findByEmail, findByGoogleSub, create, findSafeById, updateName };

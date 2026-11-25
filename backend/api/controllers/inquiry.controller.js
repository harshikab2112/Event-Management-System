const service = require('../../services/inquiry.service');
async function create(req, res, next) { try { res.status(201).json(await service.create(req.body)); } catch (error) { next(error); } }
async function list(req, res, next) { try { res.json({ items: await service.list() }); } catch (error) { next(error); } }
async function updateStatus(req, res, next) { try { res.json(await service.updateStatus(req.params.id, req.body.status)); } catch (error) { next(error); } }
module.exports = { create, list, updateStatus };

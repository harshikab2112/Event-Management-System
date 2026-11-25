const service = require('../../services/event.service');
async function list(req, res, next) { try { const query = { ...req.validatedQuery }; if (req.user?.role !== 'admin') query.status = 'Published'; res.json(await service.list(query)); } catch (error) { next(error); } }
async function get(req, res, next) { try { res.json(await service.get(req.params.id, req.user)); } catch (error) { next(error); } }
async function create(req, res, next) { try { res.status(201).json(await service.create(req.body, req.user.id)); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json(await service.update(req.params.id, req.body)); } catch (error) { next(error); } }
async function remove(req, res, next) { try { res.json(await service.remove(req.params.id)); } catch (error) { next(error); } }
async function stats(req, res, next) { try { res.json(await service.stats()); } catch (error) { next(error); } }
async function register(req, res, next) { try { res.status(201).json(await service.register(req.params.id, req.user)); } catch (error) { next(error); } }
async function cancelRegistration(req, res, next) { try { res.json(await service.cancelRegistration(req.params.id, req.user.id)); } catch (error) { next(error); } }
async function myRegistrations(req, res, next) { try { res.json({ items: await service.myRegistrations(req.user.id) }); } catch (error) { next(error); } }
async function checkIn(req, res, next) { try { res.json(await service.checkIn(req.params.id, req.body.ticketCode)); } catch (error) { next(error); } }
async function attendees(req, res, next) { try { const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 120) : ''; res.json({ items: await service.attendeeList(search) }); } catch (error) { next(error); } }
module.exports = { list, get, create, update, remove, stats, register, cancelRegistration, myRegistrations, checkIn, attendees };

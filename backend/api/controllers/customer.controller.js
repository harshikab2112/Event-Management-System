const service = require('../../services/customer.service');
async function listFavorites(req, res, next) { try { res.json({ items: await service.listFavorites(req.user.id) }); } catch (error) { next(error); } }
async function addFavorite(req, res, next) { try { res.status(201).json(await service.addFavorite(req.user.id, req.params.eventId)); } catch (error) { next(error); } }
async function removeFavorite(req, res, next) { try { res.json(await service.removeFavorite(req.user.id, req.params.eventId)); } catch (error) { next(error); } }
async function notifications(req, res, next) { try { res.json(await service.notificationCenter(req.user.id)); } catch (error) { next(error); } }
async function markRead(req, res, next) { try { res.json(await service.markNotificationRead(req.user.id, req.params.id)); } catch (error) { next(error); } }
async function markAllRead(req, res, next) { try { res.json(await service.markAllNotificationsRead(req.user.id)); } catch (error) { next(error); } }
async function reviews(req, res, next) { try { res.json(await service.eventReviews(req.params.eventId)); } catch (error) { next(error); } }
async function featuredReviews(req, res, next) { try { res.json({ items: await service.featuredReviews() }); } catch (error) { next(error); } }
async function addReview(req, res, next) { try { res.status(201).json(await service.addReview(req.user, req.params.eventId, req.body)); } catch (error) { next(error); } }
module.exports = { listFavorites, addFavorite, removeFavorite, notifications, markRead, markAllRead, reviews, featuredReviews, addReview };

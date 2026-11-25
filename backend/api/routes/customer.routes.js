const router = require('express').Router();
const controller = require('../controllers/customer.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { reviewDto } = require('../dto/customer.dto');

router.get('/me/favorites', authenticate, controller.listFavorites);
router.put('/me/favorites/:eventId', authenticate, controller.addFavorite);
router.delete('/me/favorites/:eventId', authenticate, controller.removeFavorite);
router.get('/me/notifications', authenticate, controller.notifications);
router.patch('/me/notifications/read-all', authenticate, controller.markAllRead);
router.patch('/me/notifications/:id/read', authenticate, controller.markRead);
router.get('/reviews/featured', controller.featuredReviews);
router.get('/events/:eventId/reviews', controller.reviews);
router.post('/events/:eventId/reviews', authenticate, validate(reviewDto), controller.addReview);

module.exports = router;

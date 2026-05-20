const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createReview, getProductReviews } = require('../controllers/reviewController');

router.post('/:productId', protect, createReview);
router.get('/:productId', getProductReviews);

module.exports = router;
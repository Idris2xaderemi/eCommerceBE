const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { processPayment, sendStripeKey } = require('../controllers/paymentController');

router.post('/process', protect, processPayment);
router.get('/stripe-key', sendStripeKey);

module.exports = router;
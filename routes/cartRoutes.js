const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateCart, calculateShipping } = require('../controllers/cartController');

router.post('/validate', protect, validateCart);
router.post('/shipping', protect, calculateShipping);

module.exports = router;
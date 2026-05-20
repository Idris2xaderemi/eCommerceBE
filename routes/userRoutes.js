const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateProfile, getUserOrders } = require('../controllers/userController');

router.put('/profile', protect, updateProfile);
router.get('/orders', protect, getUserOrders);   // optional

module.exports = router;
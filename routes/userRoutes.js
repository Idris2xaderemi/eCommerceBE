const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  updateProfile,
  getUserOrders,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/userController');

router.put('/profile', protect, updateProfile);
router.get('/orders', protect, getUserOrders);
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

module.exports = router;
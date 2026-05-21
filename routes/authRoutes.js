const express = require('express');
const router = express.Router();
const {
  register,
  login,
  guestLogin,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');


router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', protect, resendVerification);

module.exports = router;
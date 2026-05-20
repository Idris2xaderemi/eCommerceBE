const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const vendorController = require('../controllers/vendorController');

router.get('/', vendorController.getVendors);

router.get('/:id/all-products', vendorController.getVendorAllProducts);
router.get('/:id/products', vendorController.getVendorProducts);
router.get('/:id', vendorController.getVendor);

router.put('/profile', protect, vendorController.updateVendorProfile);

router.post('/:id/reviews', protect, vendorController.createVendorReview);
router.get('/:id/reviews', vendorController.getVendorReviews);

console.log('vendorController keys:', Object.keys(vendorController));

module.exports = router;
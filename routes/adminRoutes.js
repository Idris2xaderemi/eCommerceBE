const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPendingVendors,
  verifyVendor,
  removeVendor,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getDisputes,
  resolveDispute,
  getAllProducts,
  deleteProduct,
  approveReview,
  rejectReview,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/vendors/pending', getPendingVendors);
router.put('/vendors/:id/verify', verifyVendor);
router.delete('/vendors/:id', removeVendor);
router.get('/products/pending', getPendingProducts);
router.put('/products/:id/approve', approveProduct);
router.delete('/products/:id', rejectProduct);
router.get('/products', getAllProducts);
router.delete('/products/:id', deleteProduct);
router.get('/disputes', getDisputes);
router.put('/disputes/:id/resolve', resolveDispute);
router.put('/reviews/:id/approve', approveReview);
router.put('/reviews/:id/reject', rejectReview);

module.exports = router;
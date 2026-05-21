const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateVendorItemsStatus,
  confirmDelivery,
  createDispute,
  downloadInvoice,
  getVendorStats,
} = require('../controllers/orderController');

// All routes require authentication
router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/vendor-stats', authorize('vendor'), getVendorStats);
router.get('/:id/invoice', downloadInvoice);
router.get('/:id', getOrder);

router.put('/:id/status', authorize('admin', 'vendor'), updateOrderStatus);
router.put('/:orderId/items-status', authorize('vendor'), updateVendorItemsStatus);
router.put('/:id/confirm-delivery', confirmDelivery);
router.post('/dispute', createDispute);

module.exports = router;
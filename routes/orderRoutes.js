const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); // ← added authorize
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateVendorItemsStatus,
  confirmDelivery,
  createDispute,
} = require('../controllers/orderController');


router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);

router.put('/:id/status', authorize('admin', 'vendor'), updateOrderStatus);

router.put('/:orderId/items-status', authorize('vendor'), updateVendorItemsStatus);

router.put('/:id/confirm-delivery', confirmDelivery);

router.post('/dispute', protect, createDispute);

module.exports = router;
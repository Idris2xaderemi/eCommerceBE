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
  } = require('../controllers/adminController');

  router.use(protect, authorize('admin'));

  router.get('/vendors/pending', getPendingVendors);
  router.put('/vendors/:id/verify', verifyVendor);
  router.delete('/vendors/:id', removeVendor);
  router.get('/products/pending', getPendingProducts);
  router.put('/products/:id/approve', approveProduct);
  router.delete('/products/:id', rejectProduct);
  router.get('/disputes', getDisputes);
  router.put('/disputes/:id/resolve', resolveDispute);

  module.exports = router;



const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductSuggestions,
} = require('../controllers/productController');

router.get('/', getProducts);
router.get('/suggestions', getProductSuggestions);
router.get('/:id', getProduct);

router.post('/', protect, authorize('vendor'), upload.array('images', 5), createProduct);
router.put('/:id', protect, authorize('vendor', 'admin'), updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteProduct);

module.exports = router;
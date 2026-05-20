const Product = require('../models/Product');


exports.validateCart = async (req, res) => {
  try {
    const { items } = req.body;
    const validationResults = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      const currentPrice = product.discountPrice || product.price;
      if (currentPrice !== item.price) {
        validationResults.push({ product: item.product, priceChanged: true, newPrice: currentPrice });
      }
      if (product.stock < item.quantity) {
        validationResults.push({ product: item.product, insufficientStock: true, available: product.stock });
      }
    }
    res.status(200).json({ success: true, validationResults });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.calculateShipping = async (req, res) => {
  try {
    const { items } = req.body;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = total > 100 ? 0 : 10;
    res.status(200).json({ success: true, shipping });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const Review = require('../models/Review');
const Product = require('../models/Product');

exports.createReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = await Review.create({
      user: req.user.id,
      product: req.params.productId,
      rating,
      title,
      comment,
      vendor: product.vendor,
    });

    const reviews = await Review.find({ product: req.params.productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    product.rating = Math.round(avgRating * 10) / 10;
    product.numReviews = reviews.length;
    await product.save();

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId }).populate('user', 'firstName lastName');
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
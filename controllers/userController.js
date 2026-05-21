const User = require('../models/User');
const Order = require('../models/Order');


exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone, address },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort('-createdAt');
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};




const Product = require('../models/Product');

// GET /api/users/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/users/wishlist/:productId
exports.addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.wishlist.includes(req.params.productId)) {
      user.wishlist.push(req.params.productId);
      await user.save();
    }
    res.status(200).json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/users/wishlist/:productId
exports.removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.status(200).json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
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
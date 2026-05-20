const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Review = require('../models/Review');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const emailTemplate = require('../utils/emailTemplate');

exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isVerified: true, isActive: true }).populate('user', 'firstName lastName email');
    res.status(200).json({ success: true, vendors });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.params.id, isApproved: true, isActive: true });
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVendorAllProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID format' });
    }
    
    const products = await Product.find({ vendor: id });
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate({ user: req.user.id }, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.createVendorReview = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const { rating, title, comment } = req.body;

    const review = await Review.create({
      user: req.user.id,
      vendor: vendor._id,
      rating,
      title,
      comment,
    });

    const reviews = await Review.find({ vendor: vendor._id });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    vendor.rating = Math.round(avgRating * 10) / 10;
    vendor.numReviews = reviews.length;
    await vendor.save();

    const vendorUser = await User.findById(vendor.user);
    if (vendorUser) {
      sendEmail({
        email: vendorUser.email,
        subject: 'New Review Received',
        html: emailTemplate(
          'New Review Received',
          `<p>Your business "<strong>${vendor.businessName}</strong>" has received a new review.</p>
           <p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
           <p><strong>Title:</strong> ${title}</p>
           <p><strong>Comment:</strong> ${comment}</p>
           <p>Keep up the great work!</p>`,
          'View Your Profile',
          `http://${FRONTEND_URL}/vendor/${vendor._id}`
        ),
      }).catch(err => console.error('Email error:', err.message));
    }

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVendorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ vendor: req.params.id })
      .populate('user', 'firstName lastName')
      .sort('-createdAt');
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
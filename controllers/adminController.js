const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const emailTemplate = require('../utils/emailTemplate');
const FRONTEND_URL = 'https://e-commerce-fe-k4mw.vercel.app';


exports.getPendingVendors = async (req, res) => {
  const vendors = await Vendor.find({ isVerified: false });
  res.status(200).json({ success: true, vendors });
};

exports.verifyVendor = async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  const vendorUser = await User.findById(vendor.user);
  if (vendorUser) {
    sendEmail({
      email: vendorUser.email,
      subject: 'Your Vendor Account is Approved',
      html: emailTemplate(
        "You're Approved!",
        `<p>Hi <strong>${vendor.businessName}</strong>,</p>
         <p>Great news! Your vendor account has been approved and you can now start selling on KaraKata.</p>
         <p>Add your first product and reach thousands of customers.</p>`,
        'Go to Dashboard',
        'http://${FRONTEND_URL}/vendor/dashboard'
      ),
    }).catch(err => console.error('Email error:', err.message));
  }
  res.status(200).json({ success: true, vendor });
};

exports.removeVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const vendorUser = await User.findById(vendor.user);
    if (vendorUser) {
      sendEmail({
        email: vendorUser.email,
        subject: 'Vendor Account Removed',
        html: emailTemplate(
          'Account Status Update',
          `<p>We're sorry, but your vendor account "<strong>${vendor.businessName}</strong>" has been removed by the admin.</p>
           <p>You are welcome to register again and apply as a vendor.</p>`,
          'Register Again',
          'http://${FRONTEND_URL}/register'
        ),
      }).catch(err => console.error('Email error:', err.message));
    }

    await Vendor.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Vendor removed' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.getPendingProducts = async (req, res) => {
  const products = await Product.find({ isApproved: false }).populate('vendor', 'businessName');
  res.status(200).json({ success: true, products });
};

exports.approveProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).populate('vendor');
  if (product && product.vendor && product.vendor.user) {
    const vendorUser = await User.findById(product.vendor.user);
    if (vendorUser) {
      sendEmail({
        email: vendorUser.email,
        subject: 'Your Product Has Been Approved',
        html: emailTemplate(
          'Product Approved',
          `<p>Your product "<strong>${product.name}</strong>" has been approved and is now visible to customers.</p>
           <p>You can now track sales and manage your inventory.</p>`,
          'View Products',
          'http://${FRONTEND_URL}/vendor/dashboard/products'
        ),
      }).catch(err => console.error('Email error:', err.message));
    }
  }
  res.status(200).json({ success: true, product });
};

exports.rejectProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Product rejected and removed' });
};

exports.getAllProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const products = await Product.find(query)
      .populate('vendor', 'businessName')
      .sort('-createdAt');
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.vendor) {
      await Vendor.findByIdAndUpdate(product.vendor, { $inc: { totalProducts: -1 } });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.getDisputes = async (req, res) => {
  const disputes = await Dispute.find().populate('order user');
  res.status(200).json({ success: true, disputes });
};

exports.resolveDispute = async (req, res) => {
  const { resolution } = req.body;
  const dispute = await Dispute.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolution, resolvedBy: req.user.id, resolvedAt: Date.now() },
    { new: true }
  );
  res.status(200).json({ success: true, dispute });
};

exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    // Recalculate vendor rating if applicable
    if (review.vendor) {
      const reviews = await Review.find({ vendor: review.vendor, status: 'approved' });
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Vendor.findByIdAndUpdate(review.vendor, {
        rating: Math.round(avg * 10) / 10,
        numReviews: reviews.length,
      });
    }
    if (review.product) {
      const reviews = await Review.find({ product: review.product, status: 'approved' });
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Product.findByIdAndUpdate(review.product, {
        rating: Math.round(avg * 10) / 10,
        numReviews: reviews.length,
      });
    }
    res.status(200).json({ success: true, review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.rejectReview = async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.status(200).json({ success: true, message: 'Review rejected' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
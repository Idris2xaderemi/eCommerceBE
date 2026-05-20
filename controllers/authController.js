const crypto = require('crypto');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const emailTemplate = require('../utils/emailTemplate');

const FRONTEND_URL = 'https://e-commerce-fe-k4mw.vercel.app';
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ firstName, lastName, email, password, phone, role: role || 'user' });

    let vendorId = null;

    if (role === 'vendor') {
      const vendor = await Vendor.create({
        user: user._id,
        businessName: req.body.businessName,
        businessDescription: req.body.businessDescription,
        businessAddress: {
          street: req.body.street,
          city: req.body.city,
          state: req.body.state,
          zipCode: req.body.zipCode,
          country: req.body.country,
        },
        businessPhone: req.body.phone,
        businessEmail: req.body.email,
        taxId: req.body.taxId,
      });
      vendorId = vendor._id;

     
      sendEmail({
        email: process.env.ADMIN_EMAIL,
        subject: 'New Vendor Registration',
        html: emailTemplate(
          'New Vendor Registration',
          `<p>A new vendor has registered and requires approval.</p>
           <p><strong>Business Name:</strong> ${req.body.businessName}</p>
           <p><strong>Email:</strong> ${user.email}</p>
           <p>Please review and verify the account.</p>`,
          'Go to Admin Panel',
          `${FRONTEND_URL}/admin/dashboard`
        ),
      }).catch(err => console.error('Email error:', err.message));


      sendEmail({
        email: user.email,
        subject: 'Vendor Registration Received',
        html: emailTemplate(
          'Vendor Application Received',
          `<p>Hi <strong>${user.firstName}</strong>,</p>
           <p>Thank you for applying to become a vendor on <strong>KaraKata</strong>.</p>
           <p>Your application is currently under review. We will notify you once it has been approved.</p>
           <p>This usually takes 1-2 business days.</p>`,
          'Visit KaraKata',
          FRONTEND_URL
        ),
      }).catch(err => console.error('Email error:', err.message));
    } else {

      sendEmail({
        email: user.email,
        subject: 'Welcome to KaraKata',
        html: emailTemplate(
          'Welcome to KaraKata!',
          `<p>Hi <strong>${user.firstName}</strong>,</p>
           <p>Thank you for creating an account. You can now browse products, place orders, and more.</p>
           <p>Start exploring our marketplace today.</p>`,
          'Start Shopping',
          `${FRONTEND_URL}/products`
        ),
      }).catch(err => console.error('Email error:', err.message));
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      vendorId: vendorId || undefined,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.guestLogin = async (req, res) => {
  try {
    const guestUser = await User.create({
      firstName: 'Guest',
      lastName: 'User',
      email: `guest_${Date.now()}@temp.com`,
      password: 'guest123456',
      phone: '0000000000',
      isGuest: true,
    });
    const token = generateToken(guestUser._id);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: guestUser._id,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        email: guestUser.email,
        role: 'guest',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    let vendorProfile = null;
    if (user.role === 'vendor') {
      vendorProfile = await Vendor.findOne({ user: user._id }).lean();
    }
    res.status(200).json({ success: true, user: { ...user, vendorProfile } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};



exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: emailTemplate(
        'Reset Your Password',
        `<p>You requested a password reset.</p>
         <p>Click the button below to choose a new password. This link is valid for 30 minutes.</p>`,
        'Reset Password',
        resetUrl
      ),
    }).catch(err => console.error('Email error:', err.message));

    res.status(200).json({ success: true, message: 'Reset link sent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
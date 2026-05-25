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

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
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
           <p>This usually takes 1‑2 business days.</p>`,
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

// POST /api/auth/login
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

// POST /api/auth/guest
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

// GET /api/auth/me
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

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    // Always respond with a generic message to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email is registered, a reset code has been sent.' });
    }

    // Generate a 6‑digit code and hash it before storing
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = crypto.createHash('sha256').update(resetCode).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Build the email with the code prominently displayed
    const message = `
      <h2>Password Reset Code</h2>
      <p>Use the code below to reset your password:</p>
      <h1 style="letter-spacing:8px;font-size:2.5rem;color:#2563eb;">${resetCode}</h1>
      <p>This code is valid for <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
    `;

    // Send the email – don’t block the response even if it fails
    sendEmail({
      email: user.email,
      subject: 'Your Password Reset Code',
      html: emailTemplate('Password Reset', message),
    }).catch(err => console.error('Failed to send reset code email:', err.message));

    res.status(200).json({ success: true, message: 'If that email is registered, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};

// PUT /api/auth/reset-password   (uses email + code + new password)
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    // Hash the code and look for a matching user with a valid token
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    // Update the password and clear the reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Stub endpoints
exports.verifyResetCode = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Not used in current flow' });
};

exports.verifyEmail = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Under development' });
};

exports.resendVerification = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Under development' });
};
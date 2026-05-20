const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  businessDescription: { type: String, required: true },
  businessAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  businessPhone: String,
  businessEmail: String,
  taxId: String,
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    routingNumber: String,
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vendor', vendorSchema);
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  
product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  comment: { type: String, required: true },
  images: [{ public_id: String, url: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);
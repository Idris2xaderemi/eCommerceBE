const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  category: { type: String, required: true, enum: ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Other'] },
  images: [{ public_id: String, url: String }],
  stock: { type: Number, required: true, min: 0, default: 0 },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  isGeneric: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  specifications: { type: Map, of: String },
  tags: [String],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
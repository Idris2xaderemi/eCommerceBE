const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
      vendorName: { type: String, default: '' },   // <-- added
      image: String,
      itemStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
      },
    },
  ],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  paymentInfo: {
    id: String,
    status: String,
    method: String,
  },
  itemsPrice: { type: Number, required: true, default: 0.0 },
  taxPrice: { type: Number, required: true, default: 0.0 },
  shippingPrice: { type: Number, required: true, default: 0.0 },
  totalPrice: { type: Number, required: true, default: 0.0 },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'disputed'],
    default: 'pending',
  },
  deliveredAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
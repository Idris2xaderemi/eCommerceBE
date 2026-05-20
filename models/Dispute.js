const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'under_review', 'resolved', 'closed'], default: 'open' },
  resolution: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Dispute', disputeSchema);
exports.processPayment = async (req, res) => {
  res.status(200).json({ success: true, message: 'Payment processed (demo)' });
};

exports.sendStripeKey = (req, res) => {
  res.status(200).json({ stripeKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
};
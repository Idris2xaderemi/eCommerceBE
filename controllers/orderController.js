const Order = require('../models/Order');
const Product = require('../models/Product');
const Dispute = require('../models/Dispute');
const Vendor = require('../models/Vendor');
const sendEmail = require('../utils/sendEmail');
const FRONTEND_URL = 'https://e-commerce-fe-k4mw.vercel.app';

// POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, itemsPrice, taxPrice, shippingPrice, totalPrice, paymentInfo } = req.body;

    // Build enriched items with vendorName
    const enrichedItems = [];
    for (const item of orderItems) {
      let vendorName = '';
      if (item.vendor) {
        try {
          const vendor = await Vendor.findById(item.vendor).select('businessName');
          vendorName = vendor ? vendor.businessName : '';
        } catch (e) {
          vendorName = '';
        }
      }
      enrichedItems.push({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        vendor: item.vendor || null,
        vendorName,
        image: item.image || '',
        itemStatus: 'pending',
      });
    }

    // Validate stock
    for (const item of enrichedItems) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product ${item.product} not found`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    }

    const order = await Order.create({
      user: req.user.id,
      orderItems: enrichedItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentInfo,
    });

    // Reduce stock
    for (const item of enrichedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // ---- Vendor emails (fire‑and‑forget) ----
    const vendorItemsMap = {};
    for (const item of enrichedItems) {
      if (item.vendor) {
        if (!vendorItemsMap[item.vendor]) vendorItemsMap[item.vendor] = [];
        vendorItemsMap[item.vendor].push(item);
      }
    }

    for (const vendorId of Object.keys(vendorItemsMap)) {
      try {
        const vendor = await Vendor.findById(vendorId).populate('user');
        if (vendor && vendor.user) {
          const items = vendorItemsMap[vendorId];
          const itemsList = items
            .map(i => `<li>${i.name} x ${i.quantity} – ₦${(i.price * i.quantity).toFixed(2)}</li>`)
            .join('');

          const shippingInfo = `
            <h3>Shipping Address</h3>
            <p>
              ${shippingAddress.street}<br>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
              ${shippingAddress.country}
            </p>
          `;

          const vendorHtml = `
            <h1>New Order Received</h1>
            <p>You have received a new order for the following products:</p>
            <ul>${itemsList}</ul>
            <h3>Total: ₦${items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</h3>
            ${shippingInfo}
            <p>Please process the order soon.</p>
            <a href="${FRONTEND_URL}/vendor/dashboard/orders">View Orders</a>
          `;

          sendEmail({
            email: vendor.user.email,
            subject: 'New Order – Action Required',
            html: vendorHtml,
          }).catch(err => console.error('Email error:', err.message));
        }
      } catch (err) {
        console.error(`Failed to send vendor email for vendor ${vendorId}:`, err.message);
      }
    }

    // ---- Admin notification (fire‑and‑forget) ----
    try {
      const adminHtml = `
        <h1>New Order Received</h1>
        <p>Order ID: ${order._id}</p>
        <p>Customer: ${req.user.firstName} ${req.user.lastName} (${req.user.email})</p>
        <p>Total: ₦${totalPrice}</p>
        <a href="${FRONTEND_URL}/admin/dashboard">View in Admin Panel</a>
      `;
      sendEmail({
        email: process.env.ADMIN_EMAIL,
        subject: 'New Order Placed',
        html: adminHtml,
      }).catch(err => console.error('Admin email error:', err.message));
    } catch (err) {
      console.error('Failed to send admin order notification:', err.message);
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await Order.find().populate('user', 'firstName lastName email');
    } else {
      const vendor = await Vendor.findOne({ user: req.user.id });
      const query = {};
      if (vendor) {
        query.$or = [
          { user: req.user.id },
          { 'orderItems.vendor': vendor._id },
        ];
      } else {
        query.user = req.user.id;
      }
      orders = await Order.find(query).populate('user', 'firstName lastName email');
    }
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/orders/:id/status – vendor/admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true, runValidators: true });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/orders/:id/confirm-delivery – user
exports.confirmDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allShipped = order.orderItems.every(item => item.itemStatus === 'shipped');
    if (!allShipped) {
      return res.status(400).json({ success: false, message: 'Not all items are shipped yet' });
    }

    order.orderItems.forEach(item => { item.itemStatus = 'delivered'; });
    order.orderStatus = 'delivered';
    order.deliveredAt = Date.now();
    await order.save();

    // ---- Vendor payment emails (fire‑and‑forget) ----
    for (const item of order.orderItems) {
      if (item.vendor) {
        Vendor.findById(item.vendor).populate('user')
          .then(vendor => {
            if (vendor?.user) {
              sendEmail({
                email: vendor.user.email,
                subject: 'Payment Released',
                html: `<p>Payment for "<strong>${item.name}</strong>" (Order #${order._id.slice(-8)}) has been released.</p>`,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/orders/dispute – user
exports.createDispute = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;

    if (!orderId || !reason || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only dispute your own orders' });
    }

    const dispute = await Dispute.create({
      order: orderId,
      user: req.user.id,
      reason,
      description,
    });

    order.orderStatus = 'disputed';
    await order.save();

    res.status(201).json({ success: true, dispute });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/orders/:orderId/items-status – vendor updates their own items
exports.updateVendorItemsStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor) return res.status(403).json({ success: false, message: 'Vendor not found' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    let updated = false;
    for (const item of order.orderItems) {
      if (item.vendor && item.vendor.toString() === vendor._id.toString()) {
        item.itemStatus = status;
        updated = true;
      }
    }
    if (!updated) return res.status(400).json({ success: false, message: 'No items found for this vendor' });

    await order.save();
    await updateOverallOrderStatus(order);

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper: update overall order status based on itemStatuses
async function updateOverallOrderStatus(order) {
  const statusPriority = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  let overall = 'pending';
  for (const item of order.orderItems) {
    const idx = statusPriority.indexOf(item.itemStatus);
    if (idx > statusPriority.indexOf(overall)) overall = item.itemStatus;
  }
  order.orderStatus = overall;
  if (overall === 'delivered') order.deliveredAt = Date.now();
  await order.save();
}

// PDF Invoice
const PDFDocument = require('pdfkit');

exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('KaraKata', { align: 'center' });
    doc.fontSize(12).text(`Invoice for Order #${order._id.slice(-8)}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${order.user.firstName} ${order.user.lastName}`);
    doc.text(`Email: ${order.user.email}`);
    doc.moveDown();
    doc.text('Items:');
    order.orderItems.forEach(item => {
      doc.text(`- ${item.name} x ${item.quantity} @ ₦${item.price} = ₦${(item.price * item.quantity).toFixed(2)}`);
    });
    doc.moveDown();
    doc.text(`Subtotal: ₦${order.itemsPrice.toFixed(2)}`);
    doc.text(`Tax: ₦${order.taxPrice.toFixed(2)}`);
    doc.text(`Shipping: ₦${order.shippingPrice.toFixed(2)}`);
    doc.fontSize(14).text(`Total: ₦${order.totalPrice.toFixed(2)}`);
    doc.end();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Vendor stats for analytics
exports.getVendorStats = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor) return res.status(403).json({ success: false, message: 'Vendor not found' });

    const stats = await Order.aggregate([
      { $unwind: '$orderItems' },
      { $match: { 'orderItems.vendor': vendor._id, orderStatus: 'delivered' } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
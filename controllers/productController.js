const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const cloudinary = require('../utils/cloudinary');

// POST /api/products – Vendor only
exports.createProduct = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor || !vendor.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Vendor not verified or not found',
      });
    }

    // Clean numeric fields – convert empty strings to undefined
    const { price, discountPrice, stock, ...rest } = req.body;

    const cleanData = {
      ...rest,
      price: price === '' ? undefined : Number(price),
      discountPrice: discountPrice === '' ? undefined : Number(discountPrice),
      stock: stock === '' ? undefined : Number(stock),
    };

    const productData = {
      ...cleanData,
      vendor: vendor._id,
      isGeneric: false,
      isApproved: false,   // admin must approve
    };

    // Handle image uploads (memoryStorage buffers)
    if (req.files && req.files.length > 0) {
      const images = [];
      for (const file of req.files) {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, { folder: 'products' });
        images.push({ public_id: result.public_id, url: result.secure_url });
      }
      productData.images = images;
    }

    const product = await Product.create(productData);

    // Update vendor's product count
    await Vendor.findByIdAndUpdate(vendor._id, { $inc: { totalProducts: 1 } });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/products – Public
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, minPrice, maxPrice, vendor, search, sort } = req.query;
    const query = { isApproved: true, isActive: true };

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (vendor) query.vendor = vendor;

    // ----- UPDATED: search only by product name -----
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let sortOptions = {};
    if (sort === 'price_asc') sortOptions.price = 1;
    else if (sort === 'price_desc') sortOptions.price = -1;
    else if (sort === 'rating') sortOptions.rating = -1;
    else if (sort === 'newest') sortOptions.createdAt = -1;
    else sortOptions.createdAt = -1;

    const products = await Product.find(query)
      .populate('vendor', 'businessName rating numReviews')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/products/:id – Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'businessName rating numReviews businessDescription');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/products/:id – Vendor/Admin
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (product.vendor?.toString() !== vendor?._id?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/products/:id – Vendor/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (product.vendor?.toString() !== vendor?._id?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Product.findByIdAndDelete(req.params.id);

    if (product.vendor) {
      await Vendor.findByIdAndUpdate(product.vendor, { $inc: { totalProducts: -1 } });
    }
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/products/suggestions – Public (search as you type)
exports.getProductSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

    const suggestions = await Product.find(
      { name: { $regex: q, $options: 'i' }, isApproved: true, isActive: true },
      { name: 1 }
    ).limit(5);

    res.status(200).json({ success: true, suggestions: suggestions.map(p => p.name) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
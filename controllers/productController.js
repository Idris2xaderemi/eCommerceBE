const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const cloudinary = require('../utils/cloudinary');

exports.createProduct = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor || !vendor.isVerified) {
      return res.status(403).json({ success: false, message: 'Vendor not verified or not found' });
    }

    const productData = {
      ...req.body,
      vendor: vendor._id,
      isGeneric: false,
      isApproved: false,  
    };

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

    await Vendor.findByIdAndUpdate(vendor._id, { $inc: { totalProducts: 1 } });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

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

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
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

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'businessName rating numReviews businessDescription');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

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
    product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

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
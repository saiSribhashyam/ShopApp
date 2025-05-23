const Product = require('../models/ProductModel');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  const {
    productName, productType, brand, modelNumber, supplier,
    costPrice, sellingPrice, stockQuantity
  } = req.body;

  if (!productName || !productType || costPrice === undefined || sellingPrice === undefined) {
    return res.status(400).json({ message: 'Product Name, Product Type, Cost Price, and Selling Price are required' });
  }

  try {
    // Optional: Check for existing product based on a unique combination if needed
    // const productExists = await Product.findOne({ productName, brand, modelNumber });
    // if (productExists) {
    //   return res.status(400).json({ message: 'Product with this name, brand, and model already exists' });
    // }

    const product = new Product({
      productName, productType, brand, modelNumber, supplier,
      costPrice, sellingPrice, stockQuantity
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error.code === 11000) { // Handle duplicate key error for unique indexes
        return res.status(400).json({ message: 'Product with these details (e.g., name, brand, model) already exists.', error: error.keyValue });
    }
    res.status(500).json({ message: 'Server Error creating product', error: error.message });
  }
};

// @desc    Get all products (with pagination, search, and filtering)
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  const pageSize = parseInt(req.query.pageSize) || 10;
  const page = parseInt(req.query.page) || 1;
  
  const keyword = req.query.keyword ? {
    $or: [
      { productName: { $regex: req.query.keyword, $options: 'i' } },
      { brand: { $regex: req.query.keyword, $options: 'i' } },
      { modelNumber: { $regex: req.query.keyword, $options: 'i' } },
      { productType: { $regex: req.query.keyword, $options: 'i' } },
    ]
  } : {};

  const productTypeFilter = req.query.productType ? { productType: req.query.productType } : {};

  const query = { ...keyword, ...productTypeFilter };

  try {
    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching products' });
  }
};

// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server Error fetching product' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  const {
    productName, productType, brand, modelNumber, supplier,
    costPrice, sellingPrice, stockQuantity
  } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.productName = productName || product.productName;
    product.productType = productType || product.productType;
    product.brand = brand !== undefined ? brand : product.brand;
    product.modelNumber = modelNumber !== undefined ? modelNumber : product.modelNumber;
    product.supplier = supplier !== undefined ? supplier : product.supplier;
    product.costPrice = costPrice !== undefined ? costPrice : product.costPrice;
    product.sellingPrice = sellingPrice !== undefined ? sellingPrice : product.sellingPrice;
    product.stockQuantity = stockQuantity !== undefined ? stockQuantity : product.stockQuantity;

    // Optional: Check for unique constraints if critical fields are changed
    // Example: if (productName || brand || modelNumber) { ... check for duplicates ... }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error.code === 11000) { 
        return res.status(400).json({ message: 'Update failed: Product with these details (e.g., name, brand, model) already exists.', error: error.keyValue });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server Error updating product', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Potentially OwnerOnly)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      // Considerations:
      // - Check if product is in any active orders before deleting.
      // - Implement soft delete (e.g., add an `isActive` flag) instead of hard delete.
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Server Error deleting product' });
  }
};

// @desc    Update product stock (e.g., for manual adjustments)
// @route   PUT /api/products/:id/stock
// @access  Private
const updateStock = async (req, res) => {
    const { quantityChange, type } = req.body; // quantityChange can be positive or negative, type can be 'absolute' or 'relative'

    if (quantityChange === undefined || type === undefined) {
        return res.status(400).json({ message: "Quantity change and type ('absolute' or 'relative') are required." });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (type === 'absolute') {
            product.stockQuantity = Number(quantityChange);
        } else if (type === 'relative') {
            product.stockQuantity += Number(quantityChange);
        } else {
            return res.status(400).json({ message: "Invalid stock update type. Use 'absolute' or 'relative'." });
        }

        if (product.stockQuantity < 0) {
            // Decide if this should be an error or if stock can go negative (e.g., backorders)
            // For now, let's prevent it from going below zero through this specific endpoint.
             return res.status(400).json({ message: "Stock quantity cannot be negative after update." });
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);

    } catch (error) {
        console.error("Update Stock Error:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        res.status(500).json({ message: "Server error updating stock." });
    }
};


module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
};

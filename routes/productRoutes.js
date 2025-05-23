const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');
const { protect, ownerOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes under /api/products are protected
router.use(protect);

// @route   POST /api/products
// @desc    Create a new product
// @access  Private
router.route('/').post(createProduct);

// @route   GET /api/products
// @desc    Get all products (with search, filter, pagination)
// @access  Private
router.route('/').get(getProducts);

// @route   GET /api/products/:id
// @desc    Get a single product by ID
// @access  Private
router.route('/:id').get(getProductById);

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private
router.route('/:id').put(updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (OwnerOnly)
router.route('/:id').delete(ownerOnly, deleteProduct);

// @route   PUT /api/products/:id/stock
// @desc    Update product stock quantity
// @access  Private
router.route('/:id/stock').put(updateStock);


module.exports = router;

const express = require('express');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { protect, ownerOnly } = require('../middleware/authMiddleware'); // Assuming ownerOnly for delete
const router = express.Router();

// All routes under /api/orders are protected
router.use(protect);

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.route('/').post(createOrder);

// @route   GET /api/orders
// @desc    Get all orders (with pagination and filtering)
// @access  Private
router.route('/').get(getOrders);

// @route   GET /api/orders/:id
// @desc    Get a single order by ID
// @access  Private
router.route('/:id').get(getOrderById);

// @route   PUT /api/orders/:id
// @desc    Update an order (status, payment, delivery etc.)
// @access  Private
router.route('/:id').put(updateOrder);

// @route   DELETE /api/orders/:id
// @desc    Delete an order (use with caution, prefer cancelling)
// @access  Private (OwnerOnly recommended)
router.route('/:id').delete(ownerOnly, deleteOrder); // Or just 'protect'

module.exports = router;

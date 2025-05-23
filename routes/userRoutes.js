const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, ownerOnly } = require('../middleware/authMiddleware'); // ownerOnly for delete
const router = express.Router();

// All routes under /api/users are protected by default
router.use(protect);

// @route   POST /api/users
// @desc    Create a new customer
// @access  Private (ShopOwner/Staff logged in)
router.route('/').post(createUser);

// @route   GET /api/users
// @desc    Get all customers
// @access  Private (ShopOwner/Staff logged in)
router.route('/').get(getUsers);

// @route   GET /api/users/:id
// @desc    Get a single customer by ID
// @access  Private (ShopOwner/Staff logged in)
router.route('/:id').get(getUserById);

// @route   PUT /api/users/:id
// @desc    Update a customer
// @access  Private (ShopOwner/Staff logged in)
router.route('/:id').put(updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete a customer
// @access  Private (OwnerOnly)
router.route('/:id').delete(ownerOnly, deleteUser); // Example: only 'owner' role can delete

module.exports = router;

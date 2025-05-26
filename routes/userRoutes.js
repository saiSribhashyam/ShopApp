const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserDetailsByPhoneNumber, // Import the new controller function
} = require('../controllers/userController');
const { protect, ownerOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes under /api/users are protected by default (except if a specific route is configured otherwise)
router.use(protect);

// @route   POST /api/users
// @desc    Create a new customer
// @access  Private (ShopOwner/Staff logged in)
router.route('/').post(createUser);

// @route   GET /api/users
// @desc    Get all customers
// @access  Private (ShopOwner/Staff logged in)
router.route('/').get(getUsers);

// @route   GET /api/users/details-by-phone/:phno
// @desc    Get comprehensive user details (user, prescriptions, orders, services) by phone number
// @access  Private (ShopOwner/Staff logged in)
router.route('/details-by-phone/:phno').get(getUserDetailsByPhoneNumber); // ADDED NEW ROUTE

// @route   GET /api/users/:id (ObjectId)
// @desc    Get a single customer by ID
// @access  Private (ShopOwner/Staff logged in)
// IMPORTANT: This route should be placed *after* any more specific GET routes like '/details-by-phone/' if they share a similar path structure,
// or ensure path parameters are distinct enough. In this case, ':phno' and ':id' are distinct if phno is not an ObjectId.
// However, to be safe and explicit, often specific string paths are defined before parameterized paths.
// For now, Express is usually smart enough if parameters are named differently.
router.route('/:id').get(getUserById);

// @route   PUT /api/users/:id
// @desc    Update a customer
// @access  Private (ShopOwner/Staff logged in)
router.route('/:id').put(updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete a customer
// @access  Private (OwnerOnly)
router.route('/:id').delete(ownerOnly, deleteUser);

module.exports = router;

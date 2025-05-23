const express = require('express');
const { setupOwner, loginOwner, getOwnerProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// @route   POST /api/auth/setup-owner
// @desc    Register a new shop owner (for initial setup)
// @access  Public (Should be restricted after first setup)
// Consider adding a middleware here to check if an owner already exists
// or use a special setup key passed via environment variable for true one-time setup.
router.post('/setup-owner', setupOwner);

// @route   POST /api/auth/login
// @desc    Authenticate shop owner & get token (PIN login)
// @access  Public
router.post('/login', loginOwner);

// @route   GET /api/auth/profile
// @desc    Get current logged-in owner profile
// @access  Private
router.get('/profile', protect, getOwnerProfile);

module.exports = router;

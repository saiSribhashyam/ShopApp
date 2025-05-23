const ShopOwner = require('../models/ShopOwnerModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Utility to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expiration
  });
};

// @desc    Register a new shop owner (for initial setup, protect this route later)
// @route   POST /api/auth/setup-owner
// @access  Public (should be restricted after first setup)
const setupOwner = async (req, res) => {
    const { username, pin, name, role } = req.body;

    // Basic validation
    if (!username || !pin || !name) {
        return res.status(400).json({ message: 'Please provide username, PIN, and name' });
    }
    if (pin.length < 4) { // Example PIN length
        return res.status(400).json({ message: 'PIN must be at least 4 characters long' });
    }

    try {
        const ownerExists = await ShopOwner.findOne({ username });
        if (ownerExists) {
            return res.status(400).json({ message: 'Shop owner with this username already exists' });
        }

        // In a real app, you might want to limit how many owners can be created
        // or have a special setup key for the very first owner.
        // For now, this allows creating an owner.
        // The pin will be hashed by the pre-save middleware in the model.

        const owner = await ShopOwner.create({
            username,
            pinHash: pin, // Pass plain PIN, model will hash it
            name,
            role: role || 'owner',
        });

        if (owner) {
            res.status(201).json({
                _id: owner._id,
                username: owner.username,
                name: owner.name,
                role: owner.role,
                token: generateToken(owner._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid owner data' });
        }
    } catch (error) {
        console.error("Error in setupOwner:", error);
        res.status(500).json({ message: 'Server error during owner setup', error: error.message });
    }
};


// @desc    Authenticate shop owner & get token (PIN login)
// @route   POST /api/auth/login
// @access  Public
const loginOwner = async (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ message: "Username and PIN are required" });
  }

  try {
    const owner = await ShopOwner.findOne({ username });

    if (owner && (await owner.matchPin(pin))) {
      res.json({
        _id: owner._id,
        username: owner.username,
        name: owner.name,
        role: owner.role,
        token: generateToken(owner._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or PIN' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current logged-in owner profile
// @route   GET /api/auth/profile
// @access  Private
const getOwnerProfile = async (req, res) => {
    // req.shopOwner is attached by the 'protect' middleware
    if (req.shopOwner) {
        res.json({
            _id: req.shopOwner._id,
            username: req.shopOwner.username,
            name: req.shopOwner.name,
            role: req.shopOwner.role,
        });
    } else {
        res.status(404).json({ message: 'Owner not found' });
    }
};

module.exports = {
  setupOwner,
  loginOwner,
  getOwnerProfile
};
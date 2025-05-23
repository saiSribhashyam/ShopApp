const jwt = require('jsonwebtoken');
const ShopOwner = require('../models/ShopOwnerModel');
require('dotenv').config();

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.shopOwner = await ShopOwner.findById(decoded.id).select('-pinHash'); // Attach owner to req, exclude PIN
      if (!req.shopOwner) {
        return res.status(401).json({ message: 'Not authorized, owner not found' });
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Optional: Middleware to restrict to 'owner' role for certain actions
const ownerOnly = (req, res, next) => {
    if (req.shopOwner && req.shopOwner.role === 'owner') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized, owner role required' });
    }
};

module.exports = { protect, ownerOnly };
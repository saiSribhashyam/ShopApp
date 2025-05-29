const express = require('express');
const router = express.Router();
const { getSalesSummary, getSalesOverTime } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware'); // Assuming analytics are protected

// @route   GET /api/analytics/sales-summary
// @desc    Get sales summary KPIs
// @access  Private
router.get('/sales-summary', protect, getSalesSummary);

// @route   GET /api/analytics/sales-over-time
// @desc    Get sales trends over time
// @access  Private
router.get('/sales-over-time', protect, getSalesOverTime);

// Future analytics routes can be added here, for example:
// router.get('/product-performance', protect, getProductPerformance);
// router.get('/customer-segments', protect, getCustomerSegments);

module.exports = router;

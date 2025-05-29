const Order = require('../models/OrderModel');
const mongoose = require('mongoose');

// @desc    Get sales summary KPIs (total revenue, avg order value, total orders, items sold)
// @route   GET /api/analytics/sales-summary
// @access  Private
const getSalesSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date range query if startDate and endDate are provided
        const dateQuery = {};
        if (startDate && endDate) {
            dateQuery.createdAt = { // Assuming you want to filter by when the order was created
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        } else if (startDate) {
            dateQuery.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            dateQuery.createdAt = { $lte: new Date(endDate) };
        }

        // Base query: filter out cancelled orders and apply date range
        const baseQuery = {
            orderStatus: { $ne: 'Cancelled' }, // Exclude cancelled orders
            ...dateQuery,
        };

        const summary = await Order.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null, // Group all matched orders together
                    totalRevenue: { $sum: '$billAmount' },
                    totalOrders: { $sum: 1 },
                    totalItemsSold: { $sum: { $sum: '$orderItems.quantity' } }, // Sum of quantities from all items in all orders
                },
            },
            {
                $project: {
                    _id: 0, // Exclude the _id field
                    totalRevenue: 1,
                    totalOrders: 1,
                    totalItemsSold: 1,
                    averageOrderValue: {
                        $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalRevenue', '$totalOrders'] }],
                    },
                },
            },
        ]);

        if (summary.length > 0) {
            res.json(summary[0]);
        } else {
            // If no orders match, return zeros
            res.json({
                totalRevenue: 0,
                averageOrderValue: 0,
                totalOrders: 0,
                totalItemsSold: 0,
            });
        }
    } catch (error) {
        console.error('Error in getSalesSummary:', error);
        res.status(500).json({ message: 'Server error fetching sales summary.', error: error.message });
    }
};

// @desc    Get sales trends (revenue/orders over time)
// @route   GET /api/analytics/sales-over-time
// @access  Private
const getSalesOverTime = async (req, res) => {
    try {
        const { startDate, endDate, period = 'monthly' } = req.query; // Default period to monthly

        const dateQuery = {};
         if (startDate && endDate) {
            dateQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        } else if (startDate) {
            dateQuery.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            dateQuery.createdAt = { $lte: new Date(endDate) };
        }


        let groupByFormat;
        let idProjection;

        switch (period.toLowerCase()) {
            case 'daily':
                groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                idProjection = '$_id'; // Already a string 'YYYY-MM-DD'
                break;
            case 'weekly':
                // For weekly, group by ISO year and ISO week
                groupByFormat = {
                    year: { $isoWeekYear: '$createdAt' },
                    week: { $isoWeek: '$createdAt' },
                };
                // Construct a readable week string. Note: This might need adjustment for presentation.
                // e.g., "2023-W35". Or convert to the first day of that week.
                idProjection = { $concat: [ { $toString: "$_id.year" }, "-W", { $toString: "$_id.week" } ] };
                break;
            case 'monthly':
            default: // Default to monthly
                groupByFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                idProjection = '$_id'; // Already a string 'YYYY-MM'
                break;
        }
        
        const salesTrends = await Order.aggregate([
            { 
                $match: {
                    orderStatus: { $ne: 'Cancelled' },
                    ...dateQuery 
                } 
            },
            {
                $group: {
                    _id: groupByFormat,
                    revenue: { $sum: '$billAmount' },
                    orders: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    period: idProjection,
                    revenue: 1,
                    orders: 1,
                },
            },
            { $sort: { period: 1 } }, // Sort chronologically
        ]);

        res.json(salesTrends);

    } catch (error) {
        console.error('Error in getSalesOverTime:', error);
        res.status(500).json({ message: 'Server error fetching sales over time.', error: error.message });
    }
};

module.exports = {
    getSalesSummary,
    getSalesOverTime,
};

const Order = require('../models/OrderModel');
const User = require('../models/UserModel');
const Prescription = require('../models/PrescriptionModel');
const mongoose = require('mongoose');

// Helper to get start and end of the current day in server's timezone
const getTodayDateRange = () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    return { startOfDay, endOfDay };
};

// @desc    Get sales summary KPIs (total revenue, avg order value, total orders, items sold)
// @route   GET /api/analytics/sales-summary
// @access  Private
const getSalesSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateQuery = {};

        if (startDate && endDate) {
            dateQuery.createdAt = {
                $gte: new Date(new Date(startDate).setHours(0,0,0,0)),
                $lte: new Date(new Date(endDate).setHours(23,59,59,999)),
            };
        } else if (startDate) {
            dateQuery.createdAt = { $gte: new Date(new Date(startDate).setHours(0,0,0,0)) };
        } else if (endDate) {
            dateQuery.createdAt = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
        }


        const baseQuery = {
            orderStatus: { $ne: 'Cancelled' },
            ...dateQuery,
        };

        const summary = await Order.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$billAmount' },
                    totalOrders: { $sum: 1 },
                    totalItemsSold: { $sum: { $sum: '$orderItems.quantity' } },
                },
            },
            {
                $project: {
                    _id: 0,
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
            res.json({ totalRevenue: 0, averageOrderValue: 0, totalOrders: 0, totalItemsSold: 0 });
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
        const { startDate, endDate, period = 'monthly' } = req.query;
        let dateQuery = {};

        if (startDate && endDate) {
            dateQuery.createdAt = {
                $gte: new Date(new Date(startDate).setHours(0,0,0,0)),
                $lte: new Date(new Date(endDate).setHours(23,59,59,999)),
            };
        } else if (startDate) {
            dateQuery.createdAt = { $gte: new Date(new Date(startDate).setHours(0,0,0,0)) };
        } else if (endDate) {
            dateQuery.createdAt = { $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
        }


        let groupByFormat;
        let idProjection;

        switch (period.toLowerCase()) {
            case 'daily':
                groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                idProjection = '$_id';
                break;
            case 'weekly':
                groupByFormat = { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } };
                idProjection = { $concat: [ { $toString: "$_id.year" }, "-W", { $toString: "$_id.week" } ] };
                break;
            case 'monthly':
            default:
                groupByFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                idProjection = '$_id';
                break;
        }

        const salesTrends = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'Cancelled' }, ...dateQuery } },
            { $group: { _id: groupByFormat, revenue: { $sum: '$billAmount' }, orders: { $sum: 1 } } },
            { $project: { _id: 0, period: idProjection, revenue: 1, orders: 1 } },
            { $sort: { period: 1 } },
        ]);
        res.json(salesTrends);
    } catch (error) {
        console.error('Error in getSalesOverTime:', error);
        res.status(500).json({ message: 'Server error fetching sales over time.', error: error.message });
    }
};

// @desc    Get various statistics for the current day
// @route   GET /api/analytics/today-stats
// @access  Private
const getTodayStats = async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getTodayDateRange();
        const todayDateString = startOfDay.toISOString().split('T')[0];

        // 1. New Users Today
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        // 2. New Walk-In Users Today
        const newWalkInUsersToday = await User.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            customerType: 'WalkIn',
        });

        // 3. Total Orders Today (excluding cancelled)
        const totalOrdersToday = await Order.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            orderStatus: { $ne: 'Cancelled' },
        });

        // 4. Orders from Walk-In Customers Today
        // This requires identifying users who are 'WalkIn' and then finding their orders for today.
        const walkInUsers = await User.find({ customerType: 'WalkIn' }).select('_id');
        const walkInUserIds = walkInUsers.map(user => user._id);

        const ordersFromWalkInCustomersToday = await Order.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            userId: { $in: walkInUserIds },
            orderStatus: { $ne: 'Cancelled' },
        });

        // 5. Prescriptions Today
        const prescriptionsToday = await Prescription.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        // 6. Pending Orders Today
        const pendingOrdersToday = await Order.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            orderStatus: { $in: ['PendingPayment', 'Processing', 'ReadyForPickup', 'OutForDelivery'] },
        });

        // 7. Completed or Delivered Orders Today
        const completedOrDeliveredOrdersToday = await Order.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            orderStatus: { $in: ['Completed', 'Delivered'] },
        });

        res.json({
            date: todayDateString,
            newUsersToday,
            newWalkInUsersToday,
            totalOrdersToday,
            ordersFromWalkInCustomersToday,
            prescriptionsToday,
            pendingOrdersToday,
            completedOrDeliveredOrdersToday,
        });

    } catch (error) {
        console.error('Error in getTodayStats:', error);
        res.status(500).json({ message: 'Server error fetching today stats.', error: error.message });
    }
};


module.exports = {
    getSalesSummary,
    getSalesOverTime,
    getTodayStats, // Add new function to exports
};

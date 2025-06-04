const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const Prescription = require('../models/PrescriptionModel');
// Import the refactored helper
const { populateUserDetailsForPrescriptions } = require('../utils/populationHelpers');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        userId,
        prescriptionId,
        orderItems,
        advancePaid,
        paymentStatus,
        expectedDeliveryTimestamp,
        orderType,
        orderStatus,
        notes
    } = req.body;

    if (!userId || !orderItems || orderItems.length === 0 || !orderType) {
        return res.status(400).json({ message: 'User ID, Order Items (each with productId, quantity, unitPrice), and Order Type are required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (prescriptionId) {
            const prescription = await Prescription.findById(prescriptionId);
            if (!prescription) return res.status(404).json({ message: "Prescription not found" });

            if (prescription.userPhno && user.phno !== prescription.userPhno) {
                 console.warn(`Order Warning: The prescription provided (linked to phone ${prescription.userPhno}) does not seem to belong to the user placing the order (phone ${user.phno}).`);
            }
        }

        let calculatedBillAmount = 0;
        const processedOrderItems = [];
        const stockUpdates = [];

        for (const item of orderItems) {
            // ... (item validation as before) ...
            if (item.productId === undefined || item.quantity === undefined || item.unitPrice === undefined) {
                return res.status(400).json({ message: 'Each order item must include productId, quantity, and unitPrice.' });
            }
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                return res.status(400).json({ message: `Invalid quantity for product ID ${item.productId}. Quantity must be a positive number.` });
            }
            if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
                return res.status(400).json({ message: `Invalid unitPrice for product ID ${item.productId}. Price must be a non-negative number.` });
            }

            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            if (product.stockQuantity < item.quantity) {
                 return res.status(400).json({ message: `Not enough stock for ${product.productName}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` });
            }

            const unitPrice = item.unitPrice;
            const totalPrice = unitPrice * item.quantity;
            calculatedBillAmount += totalPrice;

            processedOrderItems.push({
                productId: product._id,
                productNameSnapshot: product.productName,
                productTypeSnapshot: product.productType,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
            });
            stockUpdates.push({ productId: product._id, quantity: item.quantity });
        }

        const orderData = { /* ... as before ... */
            userId, prescriptionId, orderItems: processedOrderItems, billAmount: req.body.billAmount !== undefined ? req.body.billAmount : calculatedBillAmount,
            advancePaid, paymentStatus, expectedDeliveryTimestamp, orderType, notes, processedBy: req.shopOwner._id
        };
        if(orderStatus) orderData.orderStatus = orderStatus;


        const order = new Order(orderData);
        const createdOrder = await order.save();

        for (const supdate of stockUpdates) {
            await Product.findByIdAndUpdate(supdate.productId, { $inc: { stockQuantity: -supdate.quantity } });
        }

        // Populate before sending response for consistency, including the nested prescription's user details
        const populatedOrder = await Order.findById(createdOrder._id)
            .populate('userId', 'name phno')
            .populate('prescriptionId') // Initial populate of prescription
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand')
            .lean(); // Use lean for manual nested population

        if (populatedOrder && populatedOrder.prescriptionId) {
            // Now, manually populate userDetails within the prescriptionId object
            populatedOrder.prescriptionId = await populateUserDetailsForPrescriptions(populatedOrder.prescriptionId);
        }

        res.status(201).json(populatedOrder);

    } catch (error) {
        console.error("Create Order Error:", error);
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: error.message, errors: error.errors });
        }
        res.status(500).json({ message: 'Server Error creating order', error: error.message });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;

    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
    if (req.query.orderStatus) query.orderStatus = req.query.orderStatus;
    if (req.query.isDelivered) query.isDelivered = req.query.isDelivered === 'true';

    try {
        const count = await Order.countDocuments(query);
        let orders = await Order.find(query)
            .populate('userId', 'name phno')
            .populate('prescriptionId') // Initial populate of prescription
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand')
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ orderDate: -1 })
            .lean(); // Use .lean() as we are modifying the objects

        // Manually populate userDetails for each prescription within orders
        if (orders && orders.length > 0) {
            for (let i = 0; i < orders.length; i++) {
                if (orders[i].prescriptionId) {
                    // The populateUserDetailsForPrescriptions function expects a Mongoose document or plain object
                    // Since we used .lean(), orders[i].prescriptionId is already a plain object if populated.
                    // If it wasn't populated (e.g. prescriptionId was null and then removed by lean's option),
                    // or if it's just an ID, the helper should handle it.
                    // The helper function will check if it's null and return null.
                    orders[i].prescriptionId = await populateUserDetailsForPrescriptions(orders[i].prescriptionId);
                }
            }
        }

        res.json({
            orders,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Get Orders Error:", error);
        res.status(500).json({ message: 'Server Error fetching orders' });
    }
};

// @desc    Get a single order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        // Use .lean() to get a plain JS object, makes subsequent manual population easier
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name phno email')
            .populate('prescriptionId') // Initial populate of prescription
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand modelNumber productType')
            .lean();

        if (order) {
            // If a prescription is linked, populate its userDetails
            if (order.prescriptionId) {
                // order.prescriptionId is already a plain object due to .lean()
                order.prescriptionId = await populateUserDetailsForPrescriptions(order.prescriptionId);
            }
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error("Get Order By ID Error:", error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(500).json({ message: 'Server Error fetching order' });
    }
};

// @desc    Update order status, payment details, delivery info
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
    const {
        advancePaid, paymentStatus, expectedDeliveryTimestamp, actualDeliveryDate,
        isDelivered, orderStatus, notes
    } = req.body;

    try {
        const order = await Order.findById(req.params.id); // Fetch full Mongoose doc for save()

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let shouldRestock = false;
        if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            shouldRestock = true;
        }

        order.advancePaid = advancePaid !== undefined ? advancePaid : order.advancePaid;
        order.paymentStatus = paymentStatus || order.paymentStatus;
        // ... (rest of assignments as before) ...
        order.expectedDeliveryTimestamp = expectedDeliveryTimestamp !== undefined ? expectedDeliveryTimestamp : order.expectedDeliveryTimestamp;
        order.actualDeliveryDate = actualDeliveryDate !== undefined ? actualDeliveryDate : order.actualDeliveryDate;
        order.isDelivered = isDelivered !== undefined ? isDelivered : order.isDelivered;
        order.orderStatus = orderStatus || order.orderStatus;
        order.notes = notes !== undefined ? notes : order.notes;
        order.processedBy = req.shopOwner._id;

        const updatedOrderRaw = await order.save();

        // Populate before sending response
        let populatedUpdatedOrder = await Order.findById(updatedOrderRaw._id)
            .populate('userId', 'name phno')
            .populate('prescriptionId')
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand')
            .lean();

        if (populatedUpdatedOrder && populatedUpdatedOrder.prescriptionId) {
            populatedUpdatedOrder.prescriptionId = await populateUserDetailsForPrescriptions(populatedUpdatedOrder.prescriptionId);
        }


        if (shouldRestock) {
            for (const item of order.orderItems) { // Use order.orderItems as it's from the original doc
                await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } });
            }
            console.log(`Order ${order._id} cancelled. Items restocked.`);
        }

        res.json(populatedUpdatedOrder);
    } catch (error) {
        console.error("Update Order Error:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(500).json({ message: 'Server Error updating order', error: error.message });
    }
};

// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private (OwnerOnly recommended)
const deleteOrder = async (req, res) => {
    // ... (delete logic as before) ...
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            if (order.orderStatus !== 'Cancelled' && !order.isDelivered) {
                 console.warn(`Order ${order._id} is being deleted. Consider restocking items manually or implement a more robust cancellation/archiving process.`);
            }
            await order.deleteOne();
            res.json({ message: 'Order removed' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error("Delete Order Error:", error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(500).json({ message: 'Server Error deleting order' });
    }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder
};

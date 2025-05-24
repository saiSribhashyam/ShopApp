const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const Prescription = require('../models/PrescriptionModel'); // Ensure this is imported

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        userId, // This is ObjectId of the user placing the order
        prescriptionId, // Optional ObjectId of the prescription
        orderItems, // Array of { productId, quantity, unitPrice (REQUIRED) }
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
        // Validate User placing the order
        const user = await User.findById(userId); // user is the one placing the order
        if (!user) return res.status(404).json({ message: "User not found" });

        // Validate Prescription if provided
        if (prescriptionId) {
            const prescription = await Prescription.findById(prescriptionId);
            if (!prescription) return res.status(404).json({ message: "Prescription not found" });
            
            // CORRECTED VALIDATION:
            // Check if the prescription's linked phone number (userPhno) matches the phone number (phno) of the user placing the order.
            if (prescription.userPhno && user.phno !== prescription.userPhno) { 
                 console.warn(`Order Warning: The prescription provided (linked to phone ${prescription.userPhno}) does not seem to belong to the user placing the order (phone ${user.phno}).`);
                 // Depending on business logic, this could be a hard error:
                 // return res.status(400).json({ message: "Prescription does not belong to the specified user." });
            }
        }

        let calculatedBillAmount = 0;
        const processedOrderItems = [];
        const stockUpdates = [];

        for (const item of orderItems) {
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

        const orderData = {
            userId, // ObjectId of the user
            prescriptionId, // ObjectId of the prescription, if any
            orderItems: processedOrderItems,
            billAmount: req.body.billAmount !== undefined ? req.body.billAmount : calculatedBillAmount,
            advancePaid,
            paymentStatus,
            expectedDeliveryTimestamp,
            orderType,
            notes,
            processedBy: req.shopOwner._id 
        };
        if(orderStatus) orderData.orderStatus = orderStatus;

        const order = new Order(orderData);
        const createdOrder = await order.save();

        for (const supdate of stockUpdates) {
            await Product.findByIdAndUpdate(supdate.productId, { $inc: { stockQuantity: -supdate.quantity } });
        }

        res.status(201).json(createdOrder);

    } catch (error) {
        console.error("Create Order Error:", error);
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: error.message, errors: error.errors });
        }
        res.status(500).json({ message: 'Server Error creating order', error: error.message });
    }
};

// @desc    Get all orders (with pagination, filtering by user, status)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;

    const query = {};
    if (req.query.userId) query.userId = req.query.userId; // userId is ObjectId
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
    if (req.query.orderStatus) query.orderStatus = req.query.orderStatus;
    if (req.query.isDelivered) query.isDelivered = req.query.isDelivered === 'true';

    try {
        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('userId', 'name phno') // Populates user who placed the order
            .populate('prescriptionId') // Populates the linked prescription details
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand') 
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ orderDate: -1 });

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
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name phno email')
            .populate('prescriptionId') 
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand modelNumber productType');

        if (order) {
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
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let shouldRestock = false;
        if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            shouldRestock = true;
        }

        order.advancePaid = advancePaid !== undefined ? advancePaid : order.advancePaid;
        order.paymentStatus = paymentStatus || order.paymentStatus;
        order.expectedDeliveryTimestamp = expectedDeliveryTimestamp !== undefined ? expectedDeliveryTimestamp : order.expectedDeliveryTimestamp;
        order.actualDeliveryDate = actualDeliveryDate !== undefined ? actualDeliveryDate : order.actualDeliveryDate;
        order.isDelivered = isDelivered !== undefined ? isDelivered : order.isDelivered;
        order.orderStatus = orderStatus || order.orderStatus;
        order.notes = notes !== undefined ? notes : order.notes;
        order.processedBy = req.shopOwner._id; 

        const updatedOrder = await order.save(); 

        if (shouldRestock) {
            for (const item of order.orderItems) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } });
            }
            console.log(`Order ${order._id} cancelled. Items restocked.`);
        }

        res.json(updatedOrder);
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

// @desc    Delete an order (use with caution, prefer cancelling)
// @route   DELETE /api/orders/:id
// @access  Private (OwnerOnly recommended)
const deleteOrder = async (req, res) => {
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

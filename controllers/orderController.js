const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const Prescription = require('../models/PrescriptionModel');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        userId,
        prescriptionId, // Optional
        orderItems, // Array of { productId, quantity, unitPrice (optional, can fetch from Product) }
        advancePaid,
        paymentStatus,
        expectedDeliveryTimestamp,
        orderType,
        orderStatus, // Optional, defaults in model
        notes
    } = req.body;

    if (!userId || !orderItems || orderItems.length === 0 || !orderType) {
        return res.status(400).json({ message: 'User, Order Items, and Order Type are required.' });
    }

    try {
        // Validate User
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Validate Prescription if provided
        if (prescriptionId) {
            const prescription = await Prescription.findById(prescriptionId);
            if (!prescription) return res.status(404).json({ message: "Prescription not found" });
            // Optional: Check if prescription belongs to the user
            if (prescription.userId && prescription.userId.toString() !== userId) {
                // This logic depends on your exact requirements for linking prescriptions
                // Consider if patientName on prescription should match user.name if prescription.userId is null
                 console.warn("Order Warning: Prescription's user ID does not match the order's user ID.");
                 // Depending on strictness, you might return an error here.
            }
        }

        let calculatedBillAmount = 0;
        const processedOrderItems = [];
        const stockUpdates = [];

        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            if (product.stockQuantity < item.quantity) {
                 return res.status(400).json({ message: `Not enough stock for ${product.productName}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` });
            }

            const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice;
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
            userId,
            prescriptionId,
            orderItems: processedOrderItems,
            billAmount: req.body.billAmount !== undefined ? req.body.billAmount : calculatedBillAmount,
            advancePaid,
            paymentStatus,
            expectedDeliveryTimestamp,
            orderType,
            notes,
            processedBy: req.shopOwner._id // From authMiddleware
        };
        if(orderStatus) orderData.orderStatus = orderStatus;


        const order = new Order(orderData);
        const createdOrder = await order.save();

        // Decrease stock quantity for products in the order
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
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
    if (req.query.orderStatus) query.orderStatus = req.query.orderStatus;
    if (req.query.isDelivered) query.isDelivered = req.query.isDelivered === 'true';


    try {
        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('userId', 'name phno')
            .populate('prescriptionId', 'patientName optometristName')
            .populate('processedBy', 'name username')
            .populate('orderItems.productId', 'productName brand') // Populate product details within orderItems
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
            .populate('prescriptionId') // Populate full prescription
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
        // orderItems cannot be updated here directly, handle separately if needed (e.g. cancel items, add items might be new order)
    } = req.body;

    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Logic for stock adjustment if order is cancelled and items need to be returned to stock
        let shouldRestock = false;
        if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            // Only restock if it's changing TO Cancelled from a non-cancelled state
            shouldRestock = true;
        }


        order.advancePaid = advancePaid !== undefined ? advancePaid : order.advancePaid;
        order.paymentStatus = paymentStatus || order.paymentStatus;
        order.expectedDeliveryTimestamp = expectedDeliveryTimestamp !== undefined ? expectedDeliveryTimestamp : order.expectedDeliveryTimestamp;
        order.actualDeliveryDate = actualDeliveryDate !== undefined ? actualDeliveryDate : order.actualDeliveryDate;
        order.isDelivered = isDelivered !== undefined ? isDelivered : order.isDelivered;
        order.orderStatus = orderStatus || order.orderStatus;
        order.notes = notes !== undefined ? notes : order.notes;
        order.processedBy = req.shopOwner._id; // Track who last updated

        const updatedOrder = await order.save(); // Bill amount recalculation is handled by pre-save hook if items change

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
            // IMPORTANT: Consider implications of deleting an order.
            // - Financial records?
            // - Should items be restocked? (The current delete doesn't auto-restock)
            // - Generally, it's better to have a 'Cancelled' or 'Archived' status.
            // If true deletion is needed, ensure all side effects are handled.
            // For now, this is a hard delete.
            
            // Example: Restock items if order is deleted and was not already cancelled or delivered
            // This logic can be complex based on your business rules.
            if (order.orderStatus !== 'Cancelled' && !order.isDelivered) {
                 console.warn(`Order ${order._id} is being deleted. Consider restocking items manually or implement a more robust cancellation/archiving process.`);
                 // for (const item of order.orderItems) {
                 //   await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity }});
                 // }
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

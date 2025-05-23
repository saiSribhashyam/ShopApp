const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true }, // Denormalized for easier display
  productTypeSnapshot: { type: String, required: true }, // Denormalized
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 }, // Price at the time of sale
  totalPrice: { type: Number, required: true, min: 0 },
}, { _id: false }); // _id: false for subdocuments if you don't need individual IDs for items

orderItemSchema.pre('validate', function(next) {
    if (this.quantity && this.unitPrice) {
        this.totalPrice = this.quantity * this.unitPrice;
    }
    next();
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', index: true, sparse: true }, // Nullable
  orderItems: [orderItemSchema], // Array of order items
  billAmount: { type: Number, required: [true, "Bill amount is required"], min: 0 },
  advancePaid: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid', 'Refunded'],
    default: 'Pending',
  },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryTimestamp: { type: Date },
  actualDeliveryDate: { type: Date },
  isDelivered: { type: Boolean, default: false },
  orderStatus: {
    type: String,
    enum: ['PendingPayment', 'Processing', 'ReadyForPickup', 'OutForDelivery', 'Delivered', 'Completed', 'Cancelled'],
    default: 'PendingPayment',
  },
  orderType: {
    type: String,
    required: true,
    enum: ['NewSpectaclesComplete', 'LensesOnly', 'FrameOnly', 'Sunglasses', 'ContactLenses', 'Accessories', 'Mixed'],
  },
  notes: { type: String, trim: true },
  // For tracking who created the order in the shop
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopOwner', required: false } // Or true if always required
}, { timestamps: true });

// Virtual for amount to be collected
orderSchema.virtual('amountToBeCollected').get(function() {
  return this.billAmount - this.advancePaid;
});

// Ensure virtuals are included in toJSON and toObject outputs
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

// Pre-save hook to calculate billAmount from orderItems if not provided directly
orderSchema.pre('save', function(next) {
    if (this.isModified('orderItems') || !this.billAmount) { // Recalculate if items change or billAmount isn't set
        this.billAmount = this.orderItems.reduce((acc, item) => acc + item.totalPrice, 0);
    }
    if (this.advancePaid > this.billAmount) {
        next(new Error("Advance paid cannot be greater than the total bill amount."));
    }
    next();
});


module.exports = mongoose.model('Order', orderSchema);
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: [true, "Product name is required"], trim: true },
  productType: {
    type: String,
    required: true,
    enum: ['Frame', 'Lens', 'ContactLens', 'Accessory', 'Sunglasses'],
  },
  brand: { type: String, trim: true },
  modelNumber: { type: String, trim: true },
  supplier: { type: String, trim: true },
  costPrice: { type: Number, required: [true, "Cost price is required"], min: 0 },
  sellingPrice: { type: Number, required: [true, "Selling price is required"], min: 0 },
  stockQuantity: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

productSchema.index({ productName: 1, brand: 1, modelNumber: 1 }, { unique: true, sparse:true }); // Example: Unique combination

module.exports = mongoose.model('Product', productSchema);
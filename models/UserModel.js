const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Customer name is required"], trim: true },
  phno: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    trim: true,
    // Add a regex match for basic phone number validation if needed
    // match: [/^[0-9]{10}$/, 'Please fill a valid 10-digit phone number']
  },
  age: { type: Number, min: 0 },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'PreferNotToSay'] },
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  customerType: { type: String, enum: ['NewSpectacles', 'RepairOnly', 'ExistingPrescriptionPurchase', 'WalkIn'] },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
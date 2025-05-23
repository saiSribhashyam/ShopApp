const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true }, // Can be null if patientName is for a non-user
  patientName: { type: String, required: [true, "Patient name is required"], trim: true },
  // Near Vision (NV)
  nvLeftSph: { type: Number }, nvLeftCyl: { type: Number }, nvLeftAxis: { type: Number },
  nvRightSph: { type: Number }, nvRightCyl: { type: Number }, nvRightAxis: { type: Number },
  // Distance Vision (DV)
  dvLeftSph: { type: Number }, dvLeftCyl: { type: Number }, dvLeftAxis: { type: Number },
  dvRightSph: { type: Number }, dvRightCyl: { type: Number }, dvRightAxis: { type: Number },
  // Other Details
  pupillaryDistance: { type: Number },
  vision:{type: String},
  addPower: { type: Number }, // For bifocals/progressives
  optometristName: { type: String, trim: true },
  prescriptionDate: { type: Date, required: [true, "Prescription date is required"] },
  expiryDate: { type: Date },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true }, // REMOVED
  userPhno: { 
    type: String, 
    required: [true, "User phone number is required for linking prescription"], 
    index: true 
  },
  patientName: { type: String, required: [true, "Patient name is required"], trim: true }, // This is the name snapshot
  patientAgeAtPrescription: { type: Number }, // Age at the time of prescription
  // Near Vision (NV)
  nvLeftSph: { type: Number }, nvLeftCyl: { type: Number }, nvLeftAxis: { type: Number },
  nvRightSph: { type: Number }, nvRightCyl: { type: Number }, nvRightAxis: { type: Number },
  // Distance Vision (DV)
  dvLeftSph: { type: Number }, dvLeftCyl: { type: Number }, dvLeftAxis: { type: Number },
  dvRightSph: { type: Number }, dvRightCyl: { type: Number }, dvRightAxis: { type: Number },
  // Other Details
  pupillaryDistance: { type: Number },
  addPower: { type: Number }, // For bifocals/progressives
  optometristName: { type: String, trim: true },
  prescriptionDate: { type: Date, required: [true, "Prescription date is required"] },
  expiryDate: { type: Date },
  notes: { type: String, trim: true },
}, { timestamps: true });

// It might be beneficial to add a compound index if you often query by userPhno and date, for example.
// prescriptionSchema.index({ userPhno: 1, prescriptionDate: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);

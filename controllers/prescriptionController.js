const Prescription = require('../models/PrescriptionModel');
const User = require('../models/UserModel');

// @desc    Create a new prescription
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = async (req, res) => {
  const {
    userId, patientName, nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
    dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
    pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
  } = req.body;

  if (!patientName || !prescriptionDate) {
    return res.status(400).json({ message: 'Patient name and prescription date are required' });
  }

  try {
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    const prescription = new Prescription({
      userId, patientName, nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
      dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
      pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
    });

    const createdPrescription = await prescription.save();
    res.status(201).json(createdPrescription);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error creating prescription', error: error.message });
  }
};

// @desc    Get all prescriptions for a user or all prescriptions if admin
// @route   GET /api/prescriptions
// @route   GET /api/prescriptions?userId=:userId
// @access  Private
const getPrescriptions = async (req, res) => {
  const { userId } = req.query;
  const query = userId ? { userId } : {};

  try {
    const prescriptions = await Prescription.find(query).populate('userId', 'name phno').sort({ prescriptionDate: -1 });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching prescriptions' });
  }
};

// @desc    Get a single prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate('userId', 'name phno');
    if (prescription) {
      res.json(prescription);
    } else {
      res.status(404).json({ message: 'Prescription not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    res.status(500).json({ message: 'Server Error fetching prescription' });
  }
};

// @desc    Update a prescription
// @route   PUT /api/prescriptions/:id
// @access  Private
const updatePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const {
      userId, patientName, nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
      dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
      pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
    } = req.body;

    if (userId && prescription.userId && prescription.userId.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'New user ID for prescription not found' });
        }
        prescription.userId = userId;
    } else if (userId === null && prescription.userId) { // Allow unsetting userId
        prescription.userId = null;
    }


    prescription.patientName = patientName || prescription.patientName;
    // Update all vision fields, allowing for null/undefined to clear a value if needed
    prescription.nvLeftSph = nvLeftSph !== undefined ? nvLeftSph : prescription.nvLeftSph;
    prescription.nvLeftCyl = nvLeftCyl !== undefined ? nvLeftCyl : prescription.nvLeftCyl;
    prescription.nvLeftAxis = nvLeftAxis !== undefined ? nvLeftAxis : prescription.nvLeftAxis;
    prescription.nvRightSph = nvRightSph !== undefined ? nvRightSph : prescription.nvRightSph;
    prescription.nvRightCyl = nvRightCyl !== undefined ? nvRightCyl : prescription.nvRightCyl;
    prescription.nvRightAxis = nvRightAxis !== undefined ? nvRightAxis : prescription.nvRightAxis;
    prescription.dvLeftSph = dvLeftSph !== undefined ? dvLeftSph : prescription.dvLeftSph;
    prescription.dvLeftCyl = dvLeftCyl !== undefined ? dvLeftCyl : prescription.dvLeftCyl;
    prescription.dvLeftAxis = dvLeftAxis !== undefined ? dvLeftAxis : prescription.dvLeftAxis;
    prescription.dvRightSph = dvRightSph !== undefined ? dvRightSph : prescription.dvRightSph;
    prescription.dvRightCyl = dvRightCyl !== undefined ? dvRightCyl : prescription.dvRightCyl;
    prescription.dvRightAxis = dvRightAxis !== undefined ? dvRightAxis : prescription.dvRightAxis;
    prescription.pupillaryDistance = pupillaryDistance !== undefined ? pupillaryDistance : prescription.pupillaryDistance;
    prescription.addPower = addPower !== undefined ? addPower : prescription.addPower;
    prescription.optometristName = optometristName !== undefined ? optometristName : prescription.optometristName;
    prescription.prescriptionDate = prescriptionDate || prescription.prescriptionDate;
    prescription.expiryDate = expiryDate !== undefined ? expiryDate : prescription.expiryDate;
    prescription.notes = notes !== undefined ? notes : prescription.notes;


    const updatedPrescription = await prescription.save();
    res.json(updatedPrescription);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    res.status(500).json({ message: 'Server Error updating prescription', error: error.message });
  }
};

// @desc    Delete a prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Potentially OwnerOnly)
const deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (prescription) {
      await prescription.deleteOne();
      res.json({ message: 'Prescription removed' });
    } else {
      res.status(404).json({ message: 'Prescription not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    res.status(500).json({ message: 'Server Error deleting prescription' });
  }
};

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
};

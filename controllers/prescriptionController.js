const Prescription = require('../models/PrescriptionModel');
const User = require('../models/UserModel');
// Import the refactored helper
const { populateUserDetailsForPrescriptions } = require('../utils/populationHelpers');

// @desc    Create a new prescription
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = async (req, res) => {
  const {
    userPhno, 
    patientName, 
    patientAgeAtPrescription, 
    nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
    dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
    pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
  } = req.body;

  if (!userPhno || !patientName || !prescriptionDate) {
    return res.status(400).json({ message: 'User Phone Number (userPhno), Patient Name, and Prescription Date are required' });
  }

  try {
    const user = await User.findOne({ phno: userPhno });
    if (!user) {
      return res.status(404).json({ message: `User with phone number ${userPhno} not found.` });
    }

    const prescription = new Prescription({
      userPhno, patientName, patientAgeAtPrescription,
      nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
      dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
      pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
    });

    const createdPrescription = await prescription.save();
    // Populate user details before sending response, consistent with GET routes
    const populatedCreatedPrescription = await populateUserDetailsForPrescriptions(createdPrescription);
    res.status(201).json(populatedCreatedPrescription);

  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error creating prescription', error: error.message });
  }
};

// Removed local populateUserDetailsForPrescriptions helper function

// @desc    Get all prescriptions (can filter by userPhno)
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res) => {
  const { userPhno } = req.query; 
  const query = {};
  if (userPhno) {
    query.userPhno = userPhno;
  }

  try {
    const prescriptions = await Prescription.find(query).sort({ prescriptionDate: -1 }).lean(); // Use .lean() for performance with manual populate
    const populatedPrescriptions = await populateUserDetailsForPrescriptions(prescriptions);
    res.json(populatedPrescriptions);
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
    const prescription = await Prescription.findById(req.params.id).lean(); // Use .lean()
    if (prescription) {
      const populatedPrescription = await populateUserDetailsForPrescriptions(prescription);
      res.json(populatedPrescription);
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
    // Find without .lean() to use save() method
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const {
      userPhno, patientName, patientAgeAtPrescription,
      nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
      dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
      pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
    } = req.body;

    if (userPhno && userPhno !== prescription.userPhno) {
        const user = await User.findOne({ phno: userPhno });
        if (!user) {
            return res.status(404).json({ message: `User with phone number ${userPhno} not found for updating link.` });
        }
        prescription.userPhno = userPhno;
    }
    
    prescription.patientName = patientName !== undefined ? patientName : prescription.patientName;
    prescription.patientAgeAtPrescription = patientAgeAtPrescription !== undefined ? patientAgeAtPrescription : prescription.patientAgeAtPrescription;
    
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
    prescription.prescriptionDate = prescriptionDate !== undefined ? prescriptionDate : prescription.prescriptionDate;
    prescription.expiryDate = expiryDate !== undefined ? expiryDate : prescription.expiryDate;
    prescription.notes = notes !== undefined ? notes : prescription.notes;

    const updatedPrescriptionRaw = await prescription.save();
    // Populate user details before sending response
    const populatedUpdatedPrescription = await populateUserDetailsForPrescriptions(updatedPrescriptionRaw);
    res.json(populatedUpdatedPrescription);
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
  } catch (error) { // Corrected syntax for catch block
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

const Prescription = require('../models/PrescriptionModel');
const User = require('../models/UserModel'); // Still needed to validate userPhno

// @desc    Create a new prescription
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = async (req, res) => {
  const {
    userPhno, // Changed from userId
    patientName, // This is the name snapshot
    patientAgeAtPrescription, // New field
    nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
    dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
    pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
  } = req.body;

  // userPhno and patientName are now key required fields for linking and snapshot
  if (!userPhno || !patientName || !prescriptionDate) {
    return res.status(400).json({ message: 'User Phone Number (userPhno), Patient Name, and Prescription Date are required' });
  }

  try {
    // Validate that a user with the given phone number exists
    const user = await User.findOne({ phno: userPhno });
    if (!user) {
      return res.status(404).json({ message: `User with phone number ${userPhno} not found.` });
    }

    const prescription = new Prescription({
      userPhno,
      patientName,
      patientAgeAtPrescription,
      nvLeftSph, nvLeftCyl, nvLeftAxis, nvRightSph, nvRightCyl, nvRightAxis,
      dvLeftSph, dvLeftCyl, dvLeftAxis, dvRightSph, dvRightCyl, dvRightAxis,
      pupillaryDistance, addPower, optometristName, prescriptionDate, expiryDate, notes
    });

    const createdPrescription = await prescription.save();
    // When returning, we might want to populate the user details
    const populatedPrescription = await Prescription.findById(createdPrescription._id).populate({
        path: 'userPhno', // This is tricky, Mongoose doesn't directly support ref on non-ObjectId.
                           // We'll handle population manually in get routes or use a virtual.
                           // For now, let's return as is, or consider a manual population step here if always needed.
        // Instead of direct populate, consider adding user details manually if needed immediately after creation
        // For consistency, let's match what get routes will do.
    });
    // Simplification: return createdPrescription directly. Population will be handled by get routes.
    res.status(201).json(createdPrescription);

  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error creating prescription', error: error.message });
  }
};

// Helper function for populating user details
// Mongoose's populate doesn't directly work with a ref to a non-ObjectId field.
// We create a virtual field or manually populate.
// For simplicity, let's try a manual population in the routes that need it.

async function populateUserDetailsForPrescriptions(prescriptions) {
    if (!prescriptions) return null;
    const wasArray = Array.isArray(prescriptions);
    const prescArray = wasArray ? prescriptions : [prescriptions];

    const userPhnos = [...new Set(prescArray.map(p => p.userPhno))];
    const users = await User.find({ phno: { $in: userPhnos } }).select('name phno city gender age'); // Select fields you need
    
    const usersByPhno = users.reduce((acc, user) => {
        acc[user.phno] = user.toObject(); // Use toObject() for plain JS object
        return acc;
    }, {});

    const populatedPrescs = prescArray.map(p => {
        const prescObj = p.toObject(); // Work with plain JS objects
        if (usersByPhno[p.userPhno]) {
            prescObj.userDetails = usersByPhno[p.userPhno];
        } else {
            prescObj.userDetails = null; // Or some placeholder
        }
        return prescObj;
    });

    return wasArray ? populatedPrescs : populatedPrescs[0];
}


// @desc    Get all prescriptions (can filter by userPhno)
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res) => {
  const { userPhno } = req.query; // Changed from userId
  const query = {};
  if (userPhno) {
    query.userPhno = userPhno;
  }

  try {
    const prescriptions = await Prescription.find(query).sort({ prescriptionDate: -1 });
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
    const prescription = await Prescription.findById(req.params.id);
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
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const {
      userPhno, // Can this be updated? If so, validate new userPhno
      patientName,
      patientAgeAtPrescription,
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
    
    // Update all vision fields, allowing for null/undefined to clear a value if needed
    prescription.nvLeftSph = nvLeftSph !== undefined ? nvLeftSph : prescription.nvLeftSph;
    prescription.nvLeftCyl = nvLeftCyl !== undefined ? nvLeftCyl : prescription.nvLeftCyl;
    prescription.nvLeftAxis = nvLeftAxis !== undefined ? nvLeftAxis : prescription.nvLeftAxis;
    // ... (update other nv and dv fields similarly) ...
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

    const updatedPrescription = await prescription.save();
    const populatedUpdatedPrescription = await populateUserDetailsForPrescriptions(updatedPrescription);
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
  } catch (error) { // Added opening curly brace for catch block
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

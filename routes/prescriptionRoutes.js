const express = require('express');
const {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescriptionController');
const { protect, ownerOnly } = require('../middleware/authMiddleware'); // Assuming ownerOnly might be used for delete
const router = express.Router();

// All routes under /api/prescriptions are protected
router.use(protect);

// @route   POST /api/prescriptions
// @desc    Create a new prescription
// @access  Private
router.route('/').post(createPrescription);

// @route   GET /api/prescriptions
// @desc    Get all prescriptions (can be filtered by userId in controller)
// @access  Private
router.route('/').get(getPrescriptions);

// @route   GET /api/prescriptions/:id
// @desc    Get a single prescription by ID
// @access  Private
router.route('/:id').get(getPrescriptionById);

// @route   PUT /api/prescriptions/:id
// @desc    Update a prescription
// @access  Private
router.route('/:id').put(updatePrescription);

// @route   DELETE /api/prescriptions/:id
// @desc    Delete a prescription
// @access  Private (Consider if ownerOnly is needed, similar to users)
router.route('/:id').delete(ownerOnly, deletePrescription); // Or just 'protect' if staff can also delete

module.exports = router;

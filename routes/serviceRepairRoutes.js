const express = require('express');
const {
  createServiceRepair,
  getServiceRepairs,
  getServiceRepairById,
  updateServiceRepair,
  deleteServiceRepair,
} = require('../controllers/serviceRepairController');
const { protect, ownerOnly } = require('../middleware/authMiddleware'); // Assuming ownerOnly for delete
const router = express.Router();

// All routes under /api/services are protected
router.use(protect);

// @route   POST /api/services
// @desc    Create a new service/repair request
// @access  Private
router.route('/').post(createServiceRepair);

// @route   GET /api/services
// @desc    Get all service/repair requests (with pagination and filtering)
// @access  Private
router.route('/').get(getServiceRepairs);

// @route   GET /api/services/:id
// @desc    Get a single service/repair request by ID
// @access  Private
router.route('/:id').get(getServiceRepairById);

// @route   PUT /api/services/:id
// @desc    Update a service/repair request
// @access  Private
router.route('/:id').put(updateServiceRepair);

// @route   DELETE /api/services/:id
// @desc    Delete a service/repair request
// @access  Private (OwnerOnly recommended)
router.route('/:id').delete(ownerOnly, deleteServiceRepair); // Or just 'protect'

module.exports = router;

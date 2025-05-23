const ServiceRepair = require('../models/ServiceRepairModel');
const User = require('../models/UserModel'); // To validate user
const ShopOwner = require('../models/ShopOwnerModel'); // To populate processedBy

// @desc    Create a new service/repair request
// @route   POST /api/services
// @access  Private
const createServiceRepair = async (req, res) => {
  const {
    userId, itemDescription, issueDescription, estimatedCost,
    serviceStatus, dateReceived, expectedCompletionDate, notes
  } = req.body;

  if (!userId || !itemDescription || !issueDescription) {
    return res.status(400).json({ message: 'User, Item Description, and Issue Description are required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User for service request not found' });
    }

    const serviceRepair = new ServiceRepair({
      userId,
      itemDescription,
      issueDescription,
      estimatedCost,
      actualCost: 0, // Initial actual cost
      serviceStatus: serviceStatus || 'Received',
      dateReceived: dateReceived || Date.now(),
      expectedCompletionDate,
      notes,
      processedBy: req.shopOwner._id // Logged-in shop staff/owner
    });

    const createdServiceRepair = await serviceRepair.save();
    res.status(201).json(createdServiceRepair);
  } catch (error) {
    console.error("Create Service/Repair Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error creating service/repair request', error: error.message });
  }
};

// @desc    Get all service/repair requests (with pagination and filtering)
// @route   GET /api/services
// @access  Private
const getServiceRepairs = async (req, res) => {
  const pageSize = parseInt(req.query.pageSize) || 10;
  const page = parseInt(req.query.page) || 1;

  const query = {};
  if (req.query.userId) query.userId = req.query.userId;
  if (req.query.serviceStatus) query.serviceStatus = req.query.serviceStatus;

  try {
    const count = await ServiceRepair.countDocuments(query);
    const serviceRepairs = await ServiceRepair.find(query)
      .populate('userId', 'name phno') // Populate user details
      .populate('processedBy', 'name username') // Populate who processed it
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ dateReceived: -1 }); // Sort by newest first

    res.json({
      serviceRepairs,
      page,
      pages: Math.ceil(count / pageSize),
      count
    });
  } catch (error) {
    console.error("Get Service/Repairs Error:", error);
    res.status(500).json({ message: 'Server Error fetching service/repair requests' });
  }
};

// @desc    Get a single service/repair request by ID
// @route   GET /api/services/:id
// @access  Private
const getServiceRepairById = async (req, res) => {
  try {
    const serviceRepair = await ServiceRepair.findById(req.params.id)
      .populate('userId', 'name phno city')
      .populate('processedBy', 'name username');

    if (serviceRepair) {
      res.json(serviceRepair);
    } else {
      res.status(404).json({ message: 'Service/Repair request not found' });
    }
  } catch (error) {
    console.error("Get Service/Repair By ID Error:", error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service/Repair request not found' });
    }
    res.status(500).json({ message: 'Server Error fetching service/repair request' });
  }
};

// @desc    Update a service/repair request
// @route   PUT /api/services/:id
// @access  Private
const updateServiceRepair = async (req, res) => {
  const {
    itemDescription, issueDescription, estimatedCost, actualCost,
    serviceStatus, expectedCompletionDate, actualCompletionDate, notes
  } = req.body;

  try {
    const serviceRepair = await ServiceRepair.findById(req.params.id);

    if (!serviceRepair) {
      return res.status(404).json({ message: 'Service/Repair request not found' });
    }

    serviceRepair.itemDescription = itemDescription || serviceRepair.itemDescription;
    serviceRepair.issueDescription = issueDescription || serviceRepair.issueDescription;
    serviceRepair.estimatedCost = estimatedCost !== undefined ? estimatedCost : serviceRepair.estimatedCost;
    serviceRepair.actualCost = actualCost !== undefined ? actualCost : serviceRepair.actualCost;
    serviceRepair.serviceStatus = serviceStatus || serviceRepair.serviceStatus;
    serviceRepair.expectedCompletionDate = expectedCompletionDate !== undefined ? expectedCompletionDate : serviceRepair.expectedCompletionDate;
    serviceRepair.actualCompletionDate = actualCompletionDate !== undefined ? actualCompletionDate : serviceRepair.actualCompletionDate;
    serviceRepair.notes = notes !== undefined ? notes : serviceRepair.notes;
    serviceRepair.processedBy = req.shopOwner._id; // Track who last updated

    const updatedServiceRepair = await serviceRepair.save();
    res.json(updatedServiceRepair);
  } catch (error) {
    console.error("Update Service/Repair Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service/Repair request not found' });
    }
    res.status(500).json({ message: 'Server Error updating service/repair request', error: error.message });
  }
};

// @desc    Delete a service/repair request
// @route   DELETE /api/services/:id
// @access  Private (Potentially OwnerOnly)
const deleteServiceRepair = async (req, res) => {
  try {
    const serviceRepair = await ServiceRepair.findById(req.params.id);
    if (serviceRepair) {
      // Consider implications: Is there associated data? Is a soft delete better?
      await serviceRepair.deleteOne();
      res.json({ message: 'Service/Repair request removed' });
    } else {
      res.status(404).json({ message: 'Service/Repair request not found' });
    }
  } catch (error) {
    console.error("Delete Service/Repair Error:", error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service/Repair request not found' });
    }
    res.status(500).json({ message: 'Server Error deleting service/repair request' });
  }
};

module.exports = {
  createServiceRepair,
  getServiceRepairs,
  getServiceRepairById,
  updateServiceRepair,
  deleteServiceRepair,
};

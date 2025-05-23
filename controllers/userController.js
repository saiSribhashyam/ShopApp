const User = require('../models/UserModel');

// @desc    Create a new customer
// @route   POST /api/users
// @access  Private (ShopOwner logged in)
const createUser = async (req, res) => {
  const { name, phno, age, gender, street, city, state, zipCode, customerType } = req.body;

  if (!name || !phno) {
    return res.status(400).json({ message: 'Name and Phone Number are required' });
  }

  try {
    const userExists = await User.findOne({ phno });
    if (userExists) {
      return res.status(400).json({ message: 'Customer with this phone number already exists' });
    }

    const user = new User({
      name, phno, age, gender, street, city, state, zipCode, customerType,
    });

    const createdUser = await user.save();
    res.status(201).json(createdUser);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error creating user', error: error.message });
  }
};

// @desc    Get all customers (with pagination and search by phone)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  const pageSize = parseInt(req.query.pageSize) || 10;
  const page = parseInt(req.query.page) || 1;
  const searchQuery = req.query.phno ? { phno: { $regex: req.query.phno, $options: 'i' } } : {};

  try {
    const count = await User.countDocuments({ ...searchQuery });
    const users = await User.find({ ...searchQuery })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({
      users,
      page,
      pages: Math.ceil(count / pageSize),
      count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching users' });
  }
};

// @desc    Get a single customer by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(500).json({ message: 'Server Error fetching user' });
  }
};

// @desc    Update a customer
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  const { name, phno, age, gender, street, city, state, zipCode, customerType } = req.body;
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = name || user.name;
      user.phno = phno || user.phno;
      user.age = age === undefined ? user.age : age; // Allow setting age to 0 or null
      user.gender = gender || user.gender;
      user.street = street || user.street;
      user.city = city || user.city;
      user.state = state || user.state;
      user.zipCode = zipCode || user.zipCode;
      user.customerType = customerType || user.customerType;

      // Check if phno is being changed and if it conflicts
      if (phno && phno !== user.phno) {
          const existingUserWithPhno = await User.findOne({ phno: phno });
          if (existingUserWithPhno && existingUserWithPhno._id.toString() !== user._id.toString()) {
              return res.status(400).json({ message: 'Phone number already in use by another customer.' });
          }
      }

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error(error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(500).json({ message: 'Server Error updating user', error: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/users/:id
// @access  Private (Potentially OwnerOnly)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      // Add logic here: what happens to their prescriptions/orders?
      // For now, just deleting the user. Consider soft deletes or cascading effects.
      await user.deleteOne(); // or user.remove() in older mongoose
      res.json({ message: 'Customer removed' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(500).json({ message: 'Server Error deleting user' });
  }
};


module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};

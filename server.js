// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan'); // HTTP request logger
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config(); // This will look for a .env file in the root

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes'); // Ensure this is uncommented
const serviceRepairRoutes = require('./routes/serviceRepairRoutes'); // Ensure this is uncommented

const app = express();

// Body parser middleware
app.use(express.json()); // To accept JSON data in req.body
app.use(express.urlencoded({ extended: false })); // To accept URL encoded data

// CORS middleware - allow requests from your Flutter app's origin
app.use(cors()); // For development, you can open it. For production, specify origins.
// Example for production:
// const allowedOrigins = ['http://localhost:3000', 'https://yourfluttersite.com'];
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   }
// }));


// Morgan for logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routers
app.get('/', (req, res) => res.send('Optical Shop API Running - Full Setup')); // Basic health check
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes); // Ensure this is uncommented and used
app.use('/api/services', serviceRepairRoutes);   // Ensure this is uncommented and used


// Custom error handling middleware
app.use(notFound); // For 404 errors (routes not found)
app.use(errorHandler); // For other errors

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  )
);

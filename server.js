// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan'); // HTTP request logger
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config(); 

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes'); 
const serviceRepairRoutes = require('./routes/serviceRepairRoutes'); 
const analyticsRoutes = require('./routes/analyticsRoutes'); // ADD THIS IMPORT

const app = express();

// Body parser middleware
app.use(express.json()); 
app.use(express.urlencoded({ extended: false })); 

// CORS middleware
app.use(cors()); 
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
app.get('/', (req, res) => res.send('Optical Shop API Running - Full Setup with Analytics')); // Updated health check message
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes); 
app.use('/api/services', serviceRepairRoutes);   
app.use('/api/analytics', analyticsRoutes); // MOUNT THE NEW ROUTES

// Custom error handling middleware
app.use(notFound); 
app.use(errorHandler); 

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  )
);

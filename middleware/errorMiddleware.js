// middleware/errorMiddleware.js
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Sometimes you might get a 200 status code even if there's an error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Only show stack in development
    ...(err.errors && { errors: err.errors }), // For Mongoose validation errors
  });
};

module.exports = { notFound, errorHandler };

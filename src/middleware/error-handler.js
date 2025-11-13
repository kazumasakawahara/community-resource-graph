/**
 * Error Handler Middleware
 *
 * Global error handling middleware for Express.
 *
 * Requirements: All requirements (centralized error handling)
 * Task: 16.1 グローバルエラーハンドラ実装
 */

const { AppError } = require('../utils/errors');

/**
 * Global Error Handler Middleware
 *
 * Catches all errors and sends appropriate HTTP response.
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleError(err, req, res, next) {
  // Log error for debugging (in production, use proper logging service)
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error Handler]', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Handle operational errors (expected errors)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.errors && { errors: err.errors }) // Include validation errors if present
      }
    });
  }

  // Handle Neo4j errors
  if (err.code && err.code.startsWith('Neo')) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Database error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token has expired'
      }
    });
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError' && err.array) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        errors: err.array()
      }
    });
  }

  // Handle unexpected errors (programming errors)
  // Don't leak error details in production
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  });
}

/**
 * 404 Not Found Handler
 *
 * Middleware to handle routes that don't exist.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.path}`
    }
  });
}

module.exports = {
  handleError,
  notFoundHandler
};

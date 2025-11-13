/**
 * Custom Error Classes
 *
 * Defines custom error types for better error handling.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 16.1 グローバルエラーハンドラ実装
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguish operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalServerError
};

/**
 * Validation Middleware
 *
 * Request validation using express-validator.
 *
 * Requirements: All requirements (input validation)
 * Task: 17.1 リクエストバリデーション実装
 */

const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation Result Handler
 *
 * Checks validation results and throws ValidationError if there are errors.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return next(new ValidationError('Validation failed', errorMessages));
  }

  next();
}

module.exports = {
  handleValidationErrors
};

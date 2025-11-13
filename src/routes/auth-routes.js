/**
 * Authentication Routes
 *
 * Defines routes for authentication endpoints.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 24.1 バックエンドサーバー起動設定
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth-controller');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('role')
      .isIn(['supporter', 'individual', 'family', 'resident'])
      .withMessage('Invalid role'),
    body('organization').optional().trim(),
    handleValidationErrors
  ],
  authController.register
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  authController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    handleValidationErrors
  ],
  authController.refreshToken
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/profile
 * Get user profile (requires authentication)
 */
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;

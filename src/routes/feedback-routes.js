/**
 * Feedback Routes
 *
 * Defines routes for feedback endpoints.
 *
 * Requirements: 5 (Feedback System)
 * Task: 20.1 フィードバックエンドポイント実装
 */

const express = require('express');
const { body, param } = require('express-validator');
const feedbackController = require('../controllers/feedback-controller');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/resources/:resourceId/feedback
 * Create feedback for a resource (requires authentication)
 */
router.post(
  '/resources/:resourceId/feedback',
  authenticate,
  [
    param('resourceId').notEmpty().withMessage('Resource ID is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('visit_date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('visit_date must be in YYYY-MM-DD format'),
    handleValidationErrors
  ],
  feedbackController.createFeedback
);

/**
 * GET /api/resources/:resourceId/feedback
 * Get feedbacks for a resource
 */
router.get(
  '/resources/:resourceId/feedback',
  [
    param('resourceId').notEmpty().withMessage('Resource ID is required'),
    handleValidationErrors
  ],
  feedbackController.getFeedbacksByResource
);

/**
 * POST /api/feedback/:id/helpful
 * Mark feedback as helpful
 */
router.post(
  '/feedback/:id/helpful',
  [
    param('id').notEmpty().withMessage('Feedback ID is required'),
    handleValidationErrors
  ],
  feedbackController.markHelpful
);

module.exports = router;

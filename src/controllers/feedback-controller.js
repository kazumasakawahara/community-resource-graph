/**
 * Feedback Controller
 *
 * Handles feedback-related HTTP requests.
 *
 * Requirements: 5 (Feedback System)
 * Task: 20.1 フィードバックエンドポイント実装（FeedbackController）
 */

const feedbackService = require('../services/feedback-service');

/**
 * Create feedback for a resource
 * POST /api/resources/:resourceId/feedback
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.resourceId - Resource ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.content - Feedback content
 * @param {string} req.body.visit_date - Visit date (YYYY-MM-DD)
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 */
async function createFeedback(req, res, next) {
  try {
    const resourceId = req.params.resourceId;
    const userId = req.user.userId;
    const { content, visit_date } = req.body;

    const feedback = await feedbackService.createFeedback(
      resourceId,
      { content, visit_date },
      userId
    );

    res.status(201).json({
      success: true,
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get feedbacks for a resource
 * GET /api/resources/:resourceId/feedback
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.resourceId - Resource ID
 * @param {Object} res - Express response object
 */
async function getFeedbacksByResource(req, res, next) {
  try {
    const resourceId = req.params.resourceId;

    const feedbacks = await feedbackService.getFeedbacksByResource(resourceId);

    res.status(200).json({
      success: true,
      data: {
        feedbacks
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark feedback as helpful
 * POST /api/feedback/:id/helpful
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Feedback ID
 * @param {Object} res - Express response object
 */
async function markHelpful(req, res, next) {
  try {
    const feedbackId = req.params.id;

    const feedback = await feedbackService.incrementHelpfulCount(feedbackId);

    res.status(200).json({
      success: true,
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createFeedback,
  getFeedbacksByResource,
  markHelpful
};

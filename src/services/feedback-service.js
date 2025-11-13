/**
 * Feedback Service
 *
 * Handles feedback business logic.
 *
 * Requirements: 5 (Feedback System)
 * Task: 11.1 フィードバック投稿機能実装（FeedbackService）
 */

const feedbackDAO = require('../dao/feedback-dao');
const resourceDAO = require('../dao/resource-dao');
const {
  NotFoundError,
  ValidationError
} = require('../utils/errors');

/**
 * Create feedback for a resource
 *
 * Automatically increments resource.feedback_count
 *
 * @param {string} resourceId - Resource ID
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.content - Feedback content
 * @param {string} feedbackData.visit_date - Visit date (YYYY-MM-DD format)
 * @param {string} userId - User ID who creates the feedback
 * @returns {Promise<Object>} Created feedback object
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If validation fails
 */
async function createFeedback(resourceId, feedbackData, userId) {
  // Validate required fields
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!feedbackData.content || !feedbackData.visit_date) {
    throw new ValidationError('Content and visit_date are required');
  }

  // Validate visit_date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(feedbackData.visit_date)) {
    throw new ValidationError('visit_date must be in YYYY-MM-DD format');
  }

  // Verify resource exists
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Create feedback (DAO handles feedback_count increment)
  const feedback = await feedbackDAO.create(
    {
      content: feedbackData.content,
      visit_date: feedbackData.visit_date
    },
    userId,
    resourceId
  );

  return feedback;
}

/**
 * Get feedbacks for a resource
 *
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} Array of feedbacks with author information
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If resourceId is missing
 */
async function getFeedbacksByResource(resourceId) {
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  // Verify resource exists
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Get feedbacks
  const feedbacks = await feedbackDAO.findByResourceId(resourceId);

  return feedbacks;
}

/**
 * Increment helpful count for a feedback
 *
 * @param {string} feedbackId - Feedback ID
 * @returns {Promise<void>}
 * @throws {NotFoundError} If feedback not found
 * @throws {ValidationError} If feedbackId is missing
 */
async function incrementHelpfulCount(feedbackId) {
  if (!feedbackId) {
    throw new ValidationError('Feedback ID is required');
  }

  // Increment helpful count (throws error if not found)
  await feedbackDAO.incrementHelpfulCount(feedbackId);
}

module.exports = {
  createFeedback,
  getFeedbacksByResource,
  incrementHelpfulCount
};

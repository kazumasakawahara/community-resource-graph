/**
 * Analytics Service
 *
 * Handles analytics and statistics business logic.
 *
 * Requirements: 9 (Dashboard Analytics)
 * Task: 14.1 分析サービス実装（AnalyticsService）
 */

const analyticsDAO = require('../dao/analytics-dao');
const { ValidationError } = require('../utils/errors');

/**
 * Get overview statistics
 *
 * Returns total counts for resources, feedback, and needs.
 *
 * @returns {Promise<Object>} Overview statistics
 */
async function getOverviewStats() {
  const [resourceCount, feedbackCount, needCount, needsByStatus] = await Promise.all([
    analyticsDAO.countAllResources(),
    analyticsDAO.countAllFeedback(),
    analyticsDAO.countAllNeeds(),
    analyticsDAO.countNeedsByStatus()
  ]);

  return {
    total_resources: resourceCount,
    total_feedback: feedbackCount,
    total_needs: needCount,
    needs_by_status: needsByStatus
  };
}

/**
 * Get resource distribution by area
 *
 * @returns {Promise<Array>} Array of area statistics
 */
async function getResourceDistributionByArea() {
  return await analyticsDAO.getResourceDistributionByArea();
}

/**
 * Get popular tags
 *
 * @param {number} [limit=10] - Maximum number of tags to return
 * @returns {Promise<Array>} Array of popular tags with usage counts
 */
async function getPopularTags(limit = 10) {
  if (limit < 1 || limit > 50) {
    throw new ValidationError('Limit must be between 1 and 50');
  }

  return await analyticsDAO.getPopularTags(limit);
}

/**
 * Get user ranking
 *
 * Returns top users by contribution (resources + feedback)
 *
 * @param {number} [limit=10] - Maximum number of users to return
 * @returns {Promise<Array>} Array of top users
 */
async function getUserRanking(limit = 10) {
  if (limit < 1 || limit > 50) {
    throw new ValidationError('Limit must be between 1 and 50');
  }

  return await analyticsDAO.getUserRanking(limit);
}

/**
 * Analyze unmatched needs
 *
 * Returns needs that haven't been matched with resources yet.
 *
 * @returns {Promise<Array>} Array of unmatched needs with statistics
 */
async function analyzeUnmatchedNeeds() {
  return await analyticsDAO.analyzeUnmatchedNeeds();
}

module.exports = {
  getOverviewStats,
  getResourceDistributionByArea,
  getPopularTags,
  getUserRanking,
  analyzeUnmatchedNeeds
};

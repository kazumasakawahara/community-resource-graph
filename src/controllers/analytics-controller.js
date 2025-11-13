/**
 * Analytics Controller
 *
 * Handles analytics-related HTTP requests.
 *
 * Requirements: 9 (Dashboard Analytics)
 * Task: 23.1 分析エンドポイント実装（AnalyticsController）
 */

const analyticsService = require('../services/analytics-service');

/**
 * Get overview statistics
 * GET /api/analytics/overview
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getOverview(req, res, next) {
  try {
    const stats = await analyticsService.getOverviewStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get resource distribution by area
 * GET /api/analytics/distribution/areas
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAreaDistribution(req, res, next) {
  try {
    const distribution = await analyticsService.getResourceDistributionByArea();

    res.status(200).json({
      success: true,
      data: {
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get popular tags
 * GET /api/analytics/tags/popular
 *
 * Query parameters:
 * - limit: Maximum number of tags (default: 10)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPopularTags(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const tags = await analyticsService.getPopularTags(limit);

    res.status(200).json({
      success: true,
      data: {
        tags
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user ranking
 * GET /api/analytics/users/ranking
 *
 * Query parameters:
 * - limit: Maximum number of users (default: 10)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserRanking(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const ranking = await analyticsService.getUserRanking(limit);

    res.status(200).json({
      success: true,
      data: {
        ranking
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Analyze unmatched needs
 * GET /api/analytics/needs/unmatched
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUnmatchedNeeds(req, res, next) {
  try {
    const analysis = await analyticsService.analyzeUnmatchedNeeds();

    res.status(200).json({
      success: true,
      data: {
        unmatched_needs: analysis
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getAreaDistribution,
  getPopularTags,
  getUserRanking,
  getUnmatchedNeeds
};

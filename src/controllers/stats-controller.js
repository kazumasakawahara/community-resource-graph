/**
 * Statistics Controller
 *
 * Handles HTTP requests for statistics and analytics
 *
 * Requirements: 12 (Statistics and Analysis)
 * Task: 統計エンドポイント実装
 */

const statsService = require('../services/stats-service');
const { handleError } = require('../middleware/error-handler');

/**
 * Get overview statistics
 * @route GET /api/stats/overview
 */
async function getOverview(req, res) {
  try {
    const stats = await statsService.getOverviewStats();

    res.status(200).json({
      success: true,
      data: {
        stats: stats
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

/**
 * Get area statistics
 * @route GET /api/stats/areas
 */
async function getAreas(req, res) {
  try {
    const areas = await statsService.getAreaStats();

    res.status(200).json({
      success: true,
      data: {
        areas: areas
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

/**
 * Get tag statistics
 * @route GET /api/stats/tags
 */
async function getTags(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const tags = await statsService.getTagStats(limit);

    res.status(200).json({
      success: true,
      data: {
        tags: tags
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

/**
 * Get contributor statistics
 * @route GET /api/stats/contributors
 */
async function getContributors(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const contributors = await statsService.getContributorStats(limit);

    res.status(200).json({
      success: true,
      data: {
        contributors: contributors
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

module.exports = {
  getOverview,
  getAreas,
  getTags,
  getContributors
};

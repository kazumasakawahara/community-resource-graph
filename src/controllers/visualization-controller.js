/**
 * Visualization Controller
 *
 * Handles visualization-related HTTP requests.
 *
 * Requirements: 7 (Network Visualization)
 * Task: 22.1 可視化エンドポイント実装（VisualizationController）
 */

const visualizationService = require('../services/visualization-service');

/**
 * Get ego network for a resource
 * GET /api/visualization/ego-network/:id
 *
 * Query parameters:
 * - depth: Network depth (1-3, default: 2)
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resource ID
 * @param {Object} res - Express response object
 */
async function getEgoNetwork(req, res, next) {
  try {
    const resourceId = req.params.id;
    const depth = req.query.depth ? parseInt(req.query.depth, 10) : 2;

    const graphData = await visualizationService.getEgoNetwork(resourceId, depth);

    res.status(200).json({
      success: true,
      data: graphData
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEgoNetwork
};

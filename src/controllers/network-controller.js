/**
 * Network Controller
 *
 * Handles HTTP requests for network operations
 *
 * Requirements: 7 (Ego Network Visualization)
 * Task: 22.1 エゴネットワークエンドポイント実装
 */

const networkService = require('../services/network-service');
const { handleError } = require('../middleware/error-handler');

/**
 * Get ego network for a resource
 * @route GET /api/resources/:id/network
 */
async function getEgoNetwork(req, res) {
  try {
    const { id } = req.params;
    const depth = parseInt(req.query.depth) || 2;

    const network = await networkService.getEgoNetwork(id, depth);

    res.status(200).json({
      success: true,
      data: {
        network: network
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

/**
 * Get relation type styles for visualization
 * @route GET /api/network/styles
 */
async function getRelationStyles(req, res) {
  try {
    const styles = networkService.getRelationTypeStyles();

    res.status(200).json({
      success: true,
      data: {
        styles: styles
      }
    });
  } catch (error) {
    handleError(error, req, res);
  }
}

module.exports = {
  getEgoNetwork,
  getRelationStyles
};

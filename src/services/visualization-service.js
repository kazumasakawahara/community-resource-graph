/**
 * Visualization Service
 *
 * Handles graph visualization data generation.
 *
 * Requirements: 7 (Network Visualization)
 * Task: 13.1 可視化サービス実装（VisualizationService）
 */

const resourceDAO = require('../dao/resource-dao');
const {
  NotFoundError,
  ValidationError
} = require('../utils/errors');

/**
 * Get ego network for a resource
 *
 * Returns graph data centered on a specific resource with all connected nodes
 * up to specified depth.
 *
 * @param {string} resourceId - Center resource ID
 * @param {number} [depth=2] - Depth of network (1-3)
 * @returns {Promise<Object>} Graph data with nodes and edges
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If validation fails
 */
async function getEgoNetwork(resourceId, depth = 2) {
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  // Validate depth
  if (depth < 1 || depth > 3) {
    throw new ValidationError('Depth must be between 1 and 3');
  }

  // Verify resource exists
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Fetch ego network
  const graphData = await resourceDAO.fetchEgoNetwork(resourceId, depth);

  return graphData;
}

module.exports = {
  getEgoNetwork
};

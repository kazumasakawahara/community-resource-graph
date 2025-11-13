/**
 * Statistics Routes
 *
 * Defines routes for statistics and analytics endpoints
 *
 * Requirements: 12 (Statistics and Analysis)
 * Task: 統計エンドポイント実装
 */

const express = require('express');
const { query } = require('express-validator');
const statsController = require('../controllers/stats-controller');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/stats/overview
 * Get overview statistics (total counts)
 */
router.get(
  '/overview',
  statsController.getOverview
);

/**
 * GET /api/stats/areas
 * Get area statistics (resources and needs per area)
 */
router.get(
  '/areas',
  statsController.getAreas
);

/**
 * GET /api/stats/tags
 * Get tag statistics (most frequently used tags)
 */
router.get(
  '/tags',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors
  ],
  statsController.getTags
);

/**
 * GET /api/stats/contributors
 * Get contributor statistics (user contribution rankings)
 */
router.get(
  '/contributors',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors
  ],
  statsController.getContributors
);

module.exports = router;

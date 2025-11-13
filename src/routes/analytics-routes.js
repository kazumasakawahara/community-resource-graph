/**
 * Analytics Routes
 *
 * Defines routes for analytics endpoints.
 *
 * Requirements: 9 (Dashboard Analytics)
 * Task: 23.1 分析エンドポイント実装
 */

const express = require('express');
const { query } = require('express-validator');
const analyticsController = require('../controllers/analytics-controller');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Get overview statistics
 */
router.get('/overview', analyticsController.getOverview);

/**
 * GET /api/analytics/distribution/areas
 * Get resource distribution by area
 */
router.get('/distribution/areas', analyticsController.getAreaDistribution);

/**
 * GET /api/analytics/tags/popular
 * Get popular tags
 */
router.get(
  '/tags/popular',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    handleValidationErrors
  ],
  analyticsController.getPopularTags
);

/**
 * GET /api/analytics/users/ranking
 * Get user ranking
 */
router.get(
  '/users/ranking',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    handleValidationErrors
  ],
  analyticsController.getUserRanking
);

/**
 * GET /api/analytics/needs/unmatched
 * Analyze unmatched needs
 */
router.get('/needs/unmatched', analyticsController.getUnmatchedNeeds);

module.exports = router;

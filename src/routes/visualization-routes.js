/**
 * Visualization Routes
 *
 * Defines routes for visualization endpoints.
 *
 * Requirements: 7 (Network Visualization)
 * Task: 22.1 可視化エンドポイント実装
 */

const express = require('express');
const { param, query } = require('express-validator');
const visualizationController = require('../controllers/visualization-controller');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/visualization/ego-network/:id
 * Get ego network for a resource
 */
router.get(
  '/ego-network/:id',
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    query('depth').optional().isInt({ min: 1, max: 3 }),
    handleValidationErrors
  ],
  visualizationController.getEgoNetwork
);

module.exports = router;

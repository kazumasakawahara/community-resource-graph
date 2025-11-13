/**
 * Need Routes
 *
 * Defines routes for need endpoints.
 *
 * Requirements: 8 (Need Recording and Matching)
 * Task: 21.1 ニーズエンドポイント実装
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const needController = require('../controllers/need-controller');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/needs
 * Create a new need (requires authentication)
 */
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('target').trim().notEmpty().withMessage('Target is required'),
    body('purpose').trim().notEmpty().withMessage('Purpose is required'),
    body('areaId').notEmpty().withMessage('Area ID is required'),
    handleValidationErrors
  ],
  needController.createNeed
);

/**
 * GET /api/needs
 * Get needs with filters
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['open', 'matched', 'closed']),
    query('areaId').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors
  ],
  needController.getNeeds
);

/**
 * GET /api/needs/:id
 * Get need by ID
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Need ID is required'),
    handleValidationErrors
  ],
  needController.getNeedById
);

/**
 * GET /api/needs/:id/matches
 * Get matching candidates for a need
 */
router.get(
  '/:id/matches',
  [
    param('id').notEmpty().withMessage('Need ID is required'),
    handleValidationErrors
  ],
  needController.getMatchingCandidates
);

/**
 * POST /api/needs/:id/match
 * Create match between need and resource (requires authentication)
 */
router.post(
  '/:id/match',
  authenticate,
  [
    param('id').notEmpty().withMessage('Need ID is required'),
    body('resourceId').notEmpty().withMessage('Resource ID is required'),
    body('note').optional().trim(),
    handleValidationErrors
  ],
  needController.createMatch
);

module.exports = router;

/**
 * Resource Routes
 *
 * Defines routes for resource endpoints.
 *
 * Requirements: 1 (Resource Registration), 3 (Area-based Management), 4 (Resource Search)
 * Task: 24.1 バックエンドサーバー起動設定
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const resourceController = require('../controllers/resource-controller');
const networkController = require('../controllers/network-controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/resources/search/semantic
 * Semantic search using vector embeddings (must be before /search)
 * Default: limit=5, threshold=0.65 for high-relevance results
 */
router.get(
  '/search/semantic',
  [
    query('query').notEmpty().withMessage('Query is required'),
    query('limit').optional().isInt({ min: 1, max: 10 }),
    query('threshold').optional().isFloat({ min: 0, max: 1 }),
    handleValidationErrors
  ],
  resourceController.semanticSearchResources
);

/**
 * GET /api/resources/search
 * Search resources (must be before /:id route)
 */
router.get(
  '/search',
  [
    query('tags').optional().isString(),
    query('areaId').optional().isString(),
    query('areaIds').optional().isString(),
    query('keyword').optional().isString(),
    query('sortBy')
      .optional()
      .isIn(['feedback_count', 'created_at', 'view_count']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors
  ],
  resourceController.searchResources
);

/**
 * GET /api/resources/tags/suggestions
 * Get suggested tags
 */
router.get(
  '/tags/suggestions',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    handleValidationErrors
  ],
  resourceController.getSuggestedTags
);

/**
 * POST /api/resources
 * Create new resource (requires authentication)
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type')
      .isIn(['place', 'person', 'activity', 'information'])
      .withMessage('Invalid type'),
    body('areaId').notEmpty().withMessage('Area ID is required'),
    body('description').optional().trim(),
    body('address').optional().trim(),
    body('contact').optional().trim(),
    body('hours').optional().trim(),
    body('tags').optional().isArray(),
    body('tags.*.name').optional().trim().notEmpty(),
    body('tags.*.category').optional().trim().notEmpty(),
    handleValidationErrors
  ],
  resourceController.createResource
);

/**
 * GET /api/resources/:id
 * Get resource by ID
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    handleValidationErrors
  ],
  resourceController.getResourceById
);

/**
 * POST /api/resources/:id/tags
 * Add tags to resource (requires authentication)
 */
router.post(
  '/:id/tags',
  authenticate,
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    body('tags').isArray({ min: 1 }).withMessage('At least one tag is required'),
    body('tags.*.name').trim().notEmpty().withMessage('Tag name is required'),
    body('tags.*.category').trim().notEmpty().withMessage('Tag category is required'),
    handleValidationErrors
  ],
  resourceController.addTags
);

/**
 * POST /api/resources/:id/relationships
 * Create relationship between resources (requires authentication)
 */
router.post(
  '/:id/relationships',
  authenticate,
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    body('toId').notEmpty().withMessage('Target resource ID is required'),
    body('relation_type')
      .isIn(['nearby', 'similar', 'sequential'])
      .withMessage('Invalid relation type'),
    body('distance').optional().trim(),
    body('description').optional().trim(),
    handleValidationErrors
  ],
  resourceController.createRelationship
);

/**
 * GET /api/resources/:id/recommendations
 * Get recommended resources based on vector similarity
 */
router.get(
  '/:id/recommendations',
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('threshold').optional().isFloat({ min: 0, max: 1 }),
    handleValidationErrors
  ],
  resourceController.getResourceRecommendations
);

/**
 * GET /api/resources/:id/connections
 * Get connected resources
 */
router.get(
  '/:id/connections',
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    handleValidationErrors
  ],
  resourceController.getConnections
);

/**
 * GET /api/resources/:id/network
 * Get ego network for a resource
 * Requirements: 7 (Ego Network Visualization)
 */
router.get(
  '/:id/network',
  [
    param('id').notEmpty().withMessage('Resource ID is required'),
    query('depth')
      .optional()
      .isInt({ min: 1, max: 3 })
      .withMessage('Depth must be between 1 and 3'),
    handleValidationErrors
  ],
  networkController.getEgoNetwork
);

/**
 * GET /api/network/styles
 * Get relation type styles for visualization
 * Requirements: 7 (Ego Network Visualization)
 */
router.get(
  '/network/styles',
  networkController.getRelationStyles
);

module.exports = router;

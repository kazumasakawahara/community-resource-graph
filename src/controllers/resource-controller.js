/**
 * Resource Controller
 *
 * Handles resource-related HTTP requests.
 *
 * Requirements: 1 (Resource Registration), 3 (Area-based Management), 4 (Resource Search)
 * Task: 19.1 資源CRUDエンドポイント実装（ResourceController）, 19.2 資源検索エンドポイント実装
 */

const resourceService = require('../services/resource-service');

/**
 * Create new resource
 * POST /api/resources
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Resource name
 * @param {string} req.body.type - Resource type
 * @param {string} req.body.areaId - Area ID
 * @param {string} [req.body.description] - Resource description
 * @param {string} [req.body.address] - Resource address
 * @param {string} [req.body.contact] - Contact information
 * @param {string} [req.body.hours] - Operating hours
 * @param {Array<Object>} [req.body.tags] - Tags to attach
 * @param {Object} req.user - Authenticated user (from JWT middleware)
 * @param {Object} res - Express response object
 */
async function createResource(req, res, next) {
  try {
    const userId = req.user.userId;
    const resourceData = req.body;

    // Create resource
    const resource = await resourceService.createResource(resourceData, userId);

    res.status(201).json({
      success: true,
      data: {
        resource
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get resource by ID
 * GET /api/resources/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resource ID
 * @param {Object} res - Express response object
 */
async function getResourceById(req, res, next) {
  try {
    const resourceId = req.params.id;

    // Get resource (view count is automatically incremented)
    const resource = await resourceService.getResourceById(resourceId);

    res.status(200).json({
      success: true,
      data: {
        resource
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search resources
 * GET /api/resources/search
 *
 * Query parameters:
 * - tags: Comma-separated tag IDs
 * - areaId: Single area ID
 * - areaIds: Comma-separated area IDs
 * - keyword: Search keyword
 * - sortBy: Sort field (feedback_count, created_at, view_count)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function searchResources(req, res, next) {
  try {
    const { tags, areaId, areaIds, keyword, sortBy, page, limit } = req.query;

    console.log('🔍 Search request received:', { tags, areaId, areaIds, keyword, sortBy, page, limit });

    // Parse query parameters
    const criteria = {
      tags: tags ? tags.split(',') : undefined,
      areaId: areaId || undefined,
      areaIds: areaIds ? areaIds.split(',') : undefined,
      keyword: keyword || undefined,
      sortBy: sortBy || undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    };

    console.log('📋 Parsed criteria:', criteria);

    // Search resources
    console.log('⏳ Starting search...');
    const result = await resourceService.searchResources(criteria);
    console.log('✅ Search completed:', { resourceCount: result.resources?.length, total: result.pagination?.total });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
}

/**
 * Add tags to resource
 * POST /api/resources/:id/tags
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resource ID
 * @param {Object} req.body - Request body
 * @param {Array<Object>} req.body.tags - Tags to add
 * @param {Object} res - Express response object
 */
async function addTags(req, res, next) {
  try {
    const resourceId = req.params.id;
    const { tags } = req.body;

    // Add tags
    await resourceService.addTagsToResource(resourceId, tags);

    res.status(200).json({
      success: true,
      message: 'Tags added successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create relationship between resources
 * POST /api/resources/:id/relationships
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Source resource ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.toId - Target resource ID
 * @param {string} req.body.relation_type - Relationship type
 * @param {string} [req.body.distance] - Distance (for nearby)
 * @param {string} [req.body.description] - Description
 * @param {Object} res - Express response object
 */
async function createRelationship(req, res, next) {
  try {
    const fromId = req.params.id;
    const { toId, relation_type, distance, description } = req.body;

    if (!req.user || !req.user.userId) {
      throw new Error('User authentication required');
    }

    // Create relationship
    await resourceService.createRelationship(fromId, toId, {
      relation_type,
      distance,
      description,
      created_by: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Relationship created successfully',
      data: {
        relationship: {
          relation_type,
          distance,
          description
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get connected resources
 * GET /api/resources/:id/connections
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resource ID
 * @param {Object} res - Express response object
 */
async function getConnections(req, res, next) {
  try {
    const resourceId = req.params.id;

    // Get connected resources
    const connections = await resourceService.getConnectedResources(resourceId);

    res.status(200).json({
      success: true,
      data: {
        connections
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get suggested tags
 * GET /api/resources/tags/suggestions
 *
 * Query parameters:
 * - limit: Maximum number of tags (default: 10)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSuggestedTags(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    // Get suggested tags
    const tags = await resourceService.suggestTags(limit);

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
 * Semantic search resources using vector embeddings
 * GET /api/resources/search/semantic
 *
 * Query parameters:
 * - query: Natural language search query (required)
 * - limit: Maximum number of results (default: 20)
 * - threshold: Minimum similarity threshold 0-1 (default: 0.5)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function semanticSearchResources(req, res, next) {
  try {
    const { query, limit, threshold } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const options = {
      limit: limit ? parseInt(limit, 10) : 20,
      threshold: threshold ? parseFloat(threshold) : 0.5
    };

    console.log('🔍 Semantic search request:', { query, options });

    const resources = await resourceService.semanticSearch(query, options);

    res.status(200).json({
      success: true,
      data: {
        query,
        resources,
        count: resources.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get recommendations for a resource
 * GET /api/resources/:id/recommendations
 *
 * Query parameters:
 * - limit: Maximum number of recommendations (default: 10)
 * - threshold: Minimum similarity threshold 0-1 (default: 0.6)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getResourceRecommendations(req, res, next) {
  try {
    const resourceId = req.params.id;
    const { limit, threshold } = req.query;

    const options = {
      limit: limit ? parseInt(limit, 10) : 10,
      threshold: threshold ? parseFloat(threshold) : 0.6
    };

    console.log('💡 Recommendations request:', { resourceId, options });

    const recommendations = await resourceService.getRecommendations(resourceId, options);

    res.status(200).json({
      success: true,
      data: {
        resource_id: resourceId,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createResource,
  getResourceById,
  searchResources,
  semanticSearchResources,
  getResourceRecommendations,
  addTags,
  createRelationship,
  getConnections,
  getSuggestedTags
};

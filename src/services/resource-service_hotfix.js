/**
 * Resource Service (HOTFIX VERSION)
 *
 * Handles resource management and search business logic.
 *
 * HOTFIXES:
 * 1. ベクトル検索を一時的に無効化（ハング問題の回避）
 * 2. view_count の型変換を安全に処理
 *
 * Requirements: 1 (Resource Registration), 3 (Area-based Management), 4 (Resource Search)
 * Task: 10.1 資源管理ビジネスロジック実装（ResourceService）
 */

const resourceDAO = require('../dao/resource-dao');
const { generateEmbedding } = require('./embedding-service');
const { expandQuery } = require('./query-expansion-service');
const neo4jDriver = require('../db/neo4j-driver');
const neo4j = require('neo4j-driver');
const {
  NotFoundError,
  ValidationError,
  AuthorizationError
} = require('../utils/errors');

/**
 * Convert Neo4j Integer to JavaScript number
 * @param {Object} value - Neo4j Integer object or regular value
 * @returns {number|*} JavaScript number or original value
 */
function convertNeo4jInt(value) {
  // null or undefined
  if (value == null) {
    return 0;
  }
  
  // Already a number
  if (typeof value === 'number') {
    return value;
  }
  
  // Neo4j Integer object
  if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
    return neo4j.int(value).toNumber();
  }
  
  // Try to convert to number
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Create a new resource
 *
 * @param {Object} resourceData - Resource data
 * @param {string} resourceData.name - Resource name
 * @param {string} resourceData.type - Resource type (place, person, activity, information)
 * @param {string} [resourceData.description] - Resource description
 * @param {string} [resourceData.address] - Resource address
 * @param {string} [resourceData.contact] - Contact information
 * @param {string} [resourceData.hours] - Operating hours
 * @param {string} resourceData.areaId - Area ID where this resource is located
 * @param {Array<Object>} [resourceData.tags] - Tags to attach to resource
 * @param {string} userId - User ID who registers this resource
 * @returns {Promise<Object>} Created resource object
 * @throws {ValidationError} If validation fails
 */
async function createResource(resourceData, userId) {
  // Validate required fields
  if (!resourceData.name || !resourceData.type || !resourceData.areaId) {
    throw new ValidationError('Missing required fields: name, type, areaId');
  }

  // Validate type
  const validTypes = ['place', 'person', 'activity', 'information'];
  if (!validTypes.includes(resourceData.type)) {
    throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Create resource
  const resource = await resourceDAO.create(
    {
      name: resourceData.name,
      type: resourceData.type,
      description: resourceData.description,
      address: resourceData.address,
      contact: resourceData.contact,
      hours: resourceData.hours
    },
    userId,
    resourceData.areaId
  );

  // Add tags if provided
  if (resourceData.tags && resourceData.tags.length > 0) {
    await resourceDAO.addTags(resource.id, resourceData.tags);
  }

  return resource;
}

/**
 * Get resource by ID with detailed information
 *
 * Automatically increments view_count when resource is fetched.
 *
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Object>} Resource detail object
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If resourceId is missing
 */
async function getResourceById(resourceId) {
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  // Fetch resource
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Increment view count
  await resourceDAO.incrementViewCount(resourceId);

  // Update view_count in returned object (safe conversion)
  const currentViewCount = convertNeo4jInt(resource.view_count);
  return {
    ...resource,
    view_count: currentViewCount + 1
  };
}

/**
 * Search resources using semantic vector search
 *
 * @param {string} query - Search query text
 * @param {Object} options - Search options
 * @param {number} [options.limit=10] - Maximum number of results
 * @param {number} [options.minScore=0.5] - Minimum similarity score (0-1)
 * @returns {Promise<Array>} Array of resources with similarity scores
 */
async function searchResourcesBySemantic(query, options = {}) {
  const limit = Math.floor(options.limit || 10); // Ensure integer
  const minScore = options.minScore || 0.5;

  console.log(`🔎 searchResourcesBySemantic called with query: "${query}", options:`, options);

  if (!query || query.trim().length === 0) {
    console.log('⚠️ Empty query, returning empty results');
    return [];
  }

  try {
    // TEMPORARY: Disable query expansion for testing
    // const expansion = expandQuery(query);
    // const searchQuery = expansion.expandedQuery || query;
    const searchQuery = query; // Use original query without expansion

    console.log(`Original query: "${query}"`);
    console.log(`Search query (expansion disabled): "${searchQuery}"`);

    // Generate embedding for query
    console.log('🧠 Generating embedding for query...');
    const queryEmbedding = await generateEmbedding(searchQuery);
    console.log(`✅ Embedding generated, dimensions: ${queryEmbedding.length}`);

    // Perform vector similarity search
    console.log('🗄️ Querying Neo4j with vector similarity...');
    const session = neo4jDriver.getSession();
    try {
      const result = await session.run(`
        MATCH (r:Resource)
        WHERE r.embedding IS NOT NULL
        WITH r, vector.similarity.cosine(r.embedding, $queryEmbedding) AS score
        WHERE score >= $minScore
        OPTIONAL MATCH (r)-[:LOCATED_IN]->(a:Area)
        OPTIONAL MATCH (r)-[:HAS_TAG]->(tag:Tag)
        WITH r, a, score, collect(DISTINCT tag) as tags
        RETURN
          r.id as id,
          r.name as name,
          r.description as description,
          r.address as address,
          r.contact as contact,
          r.hours as hours,
          r.view_count as view_count,
          r.feedback_count as feedback_count,
          r.created_at as created_at,
          r.updated_at as updated_at,
          r.type as type,
          a {.id, .name} as area,
          [tag IN tags | tag {.id, .name, .category}] as tags,
          score
        ORDER BY score DESC
        LIMIT $limit
      `, {
        queryEmbedding: queryEmbedding,
        minScore: minScore,
        limit: neo4j.int(limit)
      });

      console.log(`✅ Vector search completed, found ${result.records.length} results`);

      return result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        description: record.get('description'),
        address: record.get('address'),
        contact: record.get('contact'),
        hours: record.get('hours'),
        view_count: convertNeo4jInt(record.get('view_count')),
        feedback_count: convertNeo4jInt(record.get('feedback_count')),
        created_at: record.get('created_at'),
        updated_at: record.get('updated_at'),
        type: record.get('type'),
        area: record.get('area'),
        tags: record.get('tags'),
        similarity_score: record.get('score')
      }));
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('❌ Error in searchResourcesBySemantic:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Search resources with filters
 *
 * If keyword is provided, uses semantic vector search.
 * Otherwise, uses traditional filtering.
 *
 * @param {Object} criteria - Search criteria
 * @param {Array<string>} [criteria.tags] - Tag IDs to filter by
 * @param {string} [criteria.areaId] - Single area ID (for backward compatibility)
 * @param {Array<string>} [criteria.areaIds] - Multiple area IDs to filter by
 * @param {string} [criteria.keyword] - Keyword to search in name/description (uses vector search)
 * @param {string} [criteria.sortBy] - Sort field (feedback_count, created_at, view_count)
 * @param {number} [criteria.page=1] - Page number (1-based)
 * @param {number} [criteria.limit=20] - Items per page
 * @returns {Promise<Object>} Search result with resources and pagination info
 */
async function searchResources(criteria = {}) {
  // Set defaults
  const page = criteria.page || 1;
  const limit = criteria.limit || 20;

  // Validate pagination
  if (page < 1) {
    throw new ValidationError('Page must be >= 1');
  }
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  // Validate sortBy
  const validSortFields = ['feedback_count', 'created_at', 'view_count'];
  if (criteria.sortBy && !validSortFields.includes(criteria.sortBy)) {
    throw new ValidationError(`Invalid sortBy. Must be one of: ${validSortFields.join(', ')}`);
  }

  // HOTFIX: Temporarily disable semantic search to avoid hanging
  // TODO: Fix embedding service timeout issue
  if (false && criteria.keyword && criteria.keyword.trim().length > 0) {
    console.warn('⚠️ Vector search temporarily disabled, using traditional search');
    let resources = await searchResourcesBySemantic(criteria.keyword, {
      limit: Math.floor(limit * 1.5), // Get more results for filtering (ensure integer)
      minScore: 0.75 // Very high threshold for maximum precision
    });

    // Apply additional filters
    if (criteria.tags && criteria.tags.length > 0) {
      resources = resources.filter(r =>
        r.tags && r.tags.some(tag => criteria.tags.includes(tag.id))
      );
    }

    if (criteria.areaId) {
      resources = resources.filter(r => r.area && r.area.id === criteria.areaId);
    } else if (criteria.areaIds && criteria.areaIds.length > 0) {
      resources = resources.filter(r =>
        r.area && criteria.areaIds.includes(r.area.id)
      );
    }

    // Apply sorting
    if (criteria.sortBy) {
      resources.sort((a, b) => {
        if (criteria.sortBy === 'feedback_count') {
          return b.feedback_count - a.feedback_count;
        } else if (criteria.sortBy === 'view_count') {
          return b.view_count - a.view_count;
        } else if (criteria.sortBy === 'created_at') {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return 0;
      });
    }

    // Apply pagination
    const total = resources.length;
    const startIndex = (page - 1) * limit;
    const paginatedResources = resources.slice(startIndex, startIndex + limit);

    return {
      resources: paginatedResources,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total
      }
    };
  }

  // Use traditional search (includes keyword LIKE search)
  console.log('Using traditional search with criteria:', criteria);
  const searchResult = await resourceDAO.search({
    tags: criteria.tags,
    areaId: criteria.areaId,
    areaIds: criteria.areaIds,
    keyword: criteria.keyword,
    sortBy: criteria.sortBy,
    page,
    limit
  });

  return searchResult;
}

/**
 * Add tags to a resource
 *
 * Creates new tags if they don't exist, or increments usage_count if they do.
 *
 * @param {string} resourceId - Resource ID
 * @param {Array<Object>} tags - Tags to add
 * @param {string} tags[].name - Tag name
 * @param {string} tags[].category - Tag category
 * @returns {Promise<void>}
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If validation fails
 */
async function addTagsToResource(resourceId, tags) {
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  if (!tags || tags.length === 0) {
    throw new ValidationError('At least one tag is required');
  }

  // Validate tag structure
  for (const tag of tags) {
    if (!tag.name || !tag.category) {
      throw new ValidationError('Each tag must have name and category');
    }
  }

  // Verify resource exists
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Add tags (DAO handles create or increment)
  await resourceDAO.addTags(resourceId, tags);
}

/**
 * Create relationship between two resources
 *
 * @param {string} fromId - Source resource ID
 * @param {string} toId - Target resource ID
 * @param {Object} relationData - Relationship data
 * @param {string} relationData.relation_type - Relationship type (nearby, similar, sequential)
 * @param {string} [relationData.distance] - Distance (for nearby)
 * @param {string} [relationData.description] - Description
 * @returns {Promise<void>}
 * @throws {NotFoundError} If either resource not found
 * @throws {ValidationError} If validation fails
 */
async function createRelationship(fromId, toId, relationData) {
  if (!fromId || !toId) {
    throw new ValidationError('Both fromId and toId are required');
  }

  if (fromId === toId) {
    throw new ValidationError('Cannot create relationship to the same resource');
  }

  // Validate relation_type
  const validTypes = ['nearby', 'similar', 'sequential'];
  if (!relationData.relation_type || !validTypes.includes(relationData.relation_type)) {
    throw new ValidationError(`Invalid relation_type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Verify both resources exist
  const fromResource = await resourceDAO.findById(fromId);
  const toResource = await resourceDAO.findById(toId);

  if (!fromResource) {
    throw new NotFoundError(`Source resource not found: ${fromId}`);
  }
  if (!toResource) {
    throw new NotFoundError(`Target resource not found: ${toId}`);
  }

  // Create relationship
  await resourceDAO.createRelationship(fromId, toId, relationData);
}

/**
 * Get connected resources
 *
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} Array of connected resources
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If resourceId is missing
 */
async function getConnectedResources(resourceId) {
  if (!resourceId) {
    throw new ValidationError('Resource ID is required');
  }

  // Verify resource exists
  const resource = await resourceDAO.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  // Get connected resources
  return await resourceDAO.findConnectedResources(resourceId);
}

/**
 * Suggest popular tags
 *
 * @param {number} [limit=10] - Maximum number of tags to return
 * @returns {Promise<Array>} Array of suggested tags
 */
async function suggestTags(limit = 10) {
  if (limit < 1 || limit > 50) {
    throw new ValidationError('Limit must be between 1 and 50');
  }

  return await resourceDAO.suggestTags(limit);
}

module.exports = {
  createResource,
  getResourceById,
  searchResources,
  searchResourcesBySemantic,
  addTagsToResource,
  createRelationship,
  getConnectedResources,
  suggestTags
};

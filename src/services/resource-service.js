/**
 * Resource Service
 *
 * Handles resource management and search business logic.
 *
 * Requirements: 1 (Resource Registration), 3 (Area-based Management), 4 (Resource Search)
 * Task: 10.1 資源管理ビジネスロジック実装（ResourceService）
 */

const resourceDAO = require('../dao/resource-dao');
const areaDAO = require('../dao/area-dao');
const { generateEmbedding, cosineSimilarity } = require('./ollama-embedding-service');
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
  if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
    return neo4j.int(value).toNumber();
  }
  return value;
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

  // Handle area: find or create if it's a new area name
  let areaId = resourceData.areaId;

  // If areaId doesn't start with 'area_', it's a new area name
  if (!areaId.startsWith('area_')) {
    console.log(`📍 Creating new area: ${areaId}`);
    const area = await areaDAO.findOrCreateArea(areaId);
    areaId = area.id;
    console.log(`✅ Area created/found with ID: ${areaId}`);
  }

  // Check for duplicates (same name + address)
  if (resourceData.address) {
    const session = neo4jDriver.getSession();
    try {
      const duplicateCheck = await session.run(
        `MATCH (r:Resource {name: $name})
         WHERE r.address = $address
         RETURN r
         LIMIT 1`,
        { name: resourceData.name, address: resourceData.address }
      );
      
      if (duplicateCheck.records.length > 0) {
        throw new ValidationError('この資源は既に登録されています（同じ名前と住所）');
      }
    } finally {
      await session.close();
    }
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
    areaId
  );

  // Generate and save embedding for semantic search
  try {
    const textForEmbedding = `${resourceData.name}. ${resourceData.description || ''}`;
    console.log('🧠 Generating embedding for new resource...');
    const embedding = await generateEmbedding(textForEmbedding);
    console.log(`✅ Embedding generated, dimensions: ${embedding.length}`);
    
    // Save embedding to Neo4j
    const session = neo4jDriver.getSession();
    try {
      await session.run(
        `MATCH (r:Resource {id: $resourceId})
         SET r.embedding = $embedding`,
        { resourceId: resource.id, embedding: embedding }
      );
      console.log('✅ Embedding saved to database');
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('⚠️  Failed to generate/save embedding:', error.message);
    // Don't fail the entire operation if embedding generation fails
  }

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
 * @param {Object} options - Retrieval options
 * @param {boolean} [options.includeCoUtilized=false] - Include co-utilized resources
 * @returns {Promise<Object>} Resource detail object
 * @throws {NotFoundError} If resource not found
 * @throws {ValidationError} If resourceId is missing
 */
async function getResourceById(resourceId, options = {}) {
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

  // Base resource object with updated view count
  const result = {
    ...resource,
    view_count: resource.view_count + 1
  };

  // Include co-utilized resources if requested
  if (options.includeCoUtilized === true) {
    const patternDetectionService = require('./pattern-detection-service');
    const coUtilizedResources = await patternDetectionService.getCoUtilizedResources(
      resourceId,
      {
        minStrength: 0.2,
        limit: 5
      }
    );
    result.coUtilizedResources = coUtilizedResources;
  }

  return result;
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

  // Use traditional keyword-based search (DAO handles CONTAINS matching)
  // Semantic search is only available through the dedicated /api/resources/search/semantic endpoint
  const skip = (page - 1) * limit;
  
  const searchResult = await resourceDAO.search({
    tags: criteria.tags,
    areaId: criteria.areaId,
    areaIds: criteria.areaIds,
    keyword: criteria.keyword,
    sortBy: criteria.sortBy,
    skip: skip,
    limit: limit
  });

  // Format response with pagination info
  return {
    resources: searchResult.resources,
    pagination: {
      total: searchResult.total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(searchResult.total / limit),
      hasMore: skip + limit < searchResult.total
    },
    suggestions: searchResult.suggestions
  };
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

/**
 * Semantic search using vector embeddings
 *
 * @param {string} query - Search query in natural language
 * @param {Object} options - Search options
 * @param {number} [options.limit=5] - Maximum number of results (default: 5, max: 10)
 * @param {number} [options.threshold=0.65] - Minimum similarity threshold (0-1, default: 0.65 for high relevance)
 * @returns {Promise<Array>} Array of resources with similarity scores
 */
async function semanticSearch(query, options = {}) {
  const { limit = 5, threshold = 0.65 } = options;

  console.log(`🔍 Semantic search query: "${query}"`);

  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(query);

  // Get all resources with embeddings from Neo4j
  const session = neo4jDriver.getSession();
  try {
    const result = await session.run(`
      MATCH (r:Resource)
      WHERE r.embedding IS NOT NULL

      // Get additional data
      OPTIONAL MATCH (r)-[:LOCATED_IN]->(a:Area)
      OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)

      RETURN
        r.id AS id,
        r.name AS name,
        r.description AS description,
        r.address AS address,
        r.contact AS contact,
        r.hours AS hours,
        r.embedding AS embedding,
        r.feedback_count AS feedback_count,
        r.view_count AS view_count,
        r.created_at AS created_at,
        r.type AS type,
        {
          id: a.id,
          name: a.name,
          type: a.type
        } AS area,
        collect(DISTINCT {
          name: t.name,
          category: t.category
        }) AS tags
    `);

    // Calculate similarity scores in JavaScript
    const resourcesWithSimilarity = result.records
      .map(record => {
        const embedding = record.get('embedding');
        const similarity = cosineSimilarity(queryEmbedding, embedding);

        return {
          id: record.get('id'),
          name: record.get('name'),
          description: record.get('description'),
          address: record.get('address'),
          contact: record.get('contact'),
          hours: record.get('hours'),
          feedback_count: convertNeo4jInt(record.get('feedback_count')),
          view_count: convertNeo4jInt(record.get('view_count')),
          created_at: record.get('created_at'),
          type: record.get('type'),
          area: record.get('area'),
          tags: record.get('tags').filter(tag => tag.name),
          similarity: similarity
        };
      })
      .filter(resource => resource.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`✅ Found ${resourcesWithSimilarity.length} resources with similarity >= ${threshold}`);
    return resourcesWithSimilarity;
  } finally {
    await session.close();
  }
}

/**
 * Get recommendations for a resource based on vector similarity
 *
 * @param {string} resourceId - Resource ID
 * @param {Object} options - Recommendation options
 * @param {number} [options.limit=10] - Maximum number of recommendations
 * @param {number} [options.threshold=0.6] - Minimum similarity threshold (0-1)
 * @returns {Promise<Array>} Array of recommended resources with similarity scores
 */
async function getRecommendations(resourceId, options = {}) {
  const { limit = 10, threshold = 0.6 } = options;

  console.log(`💡 Getting recommendations for resource: ${resourceId}`);

  const session = neo4jDriver.getSession();
  try {
    // Get the target resource embedding and all other resources
    const resourceResult = await session.run(`
      MATCH (target:Resource {id: $resourceId})
      WHERE target.embedding IS NOT NULL
      RETURN target.embedding AS target_embedding
    `, { resourceId });

    if (resourceResult.records.length === 0) {
      throw new NotFoundError('Resource not found or has no embedding');
    }

    const targetEmbedding = resourceResult.records[0].get('target_embedding');

    // Get all other resources with embeddings
    const result = await session.run(`
      MATCH (target:Resource {id: $resourceId})
      MATCH (r:Resource)
      WHERE r.id <> $resourceId
        AND r.embedding IS NOT NULL

      // Get additional data
      OPTIONAL MATCH (r)-[:LOCATED_IN]->(a:Area)
      OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)

      // Check if already connected
      OPTIONAL MATCH (target)-[rel:CONNECTS_TO]-(r)

      RETURN
        r.id AS id,
        r.name AS name,
        r.description AS description,
        r.address AS address,
        r.contact AS contact,
        r.hours AS hours,
        r.embedding AS embedding,
        r.feedback_count AS feedback_count,
        r.view_count AS view_count,
        r.created_at AS created_at,
        r.type AS type,
        {
          id: a.id,
          name: a.name,
          type: a.type
        } AS area,
        collect(DISTINCT {
          name: t.name,
          category: t.category
        }) AS tags,
        rel IS NOT NULL AS is_connected
    `, { resourceId });

    // Calculate similarity scores in JavaScript
    const recommendationsWithSimilarity = result.records
      .map(record => {
        const embedding = record.get('embedding');
        const similarity = cosineSimilarity(targetEmbedding, embedding);

        return {
          id: record.get('id'),
          name: record.get('name'),
          description: record.get('description'),
          address: record.get('address'),
          contact: record.get('contact'),
          hours: record.get('hours'),
          feedback_count: convertNeo4jInt(record.get('feedback_count')),
          view_count: convertNeo4jInt(record.get('view_count')),
          created_at: record.get('created_at'),
          type: record.get('type'),
          area: record.get('area'),
          tags: record.get('tags').filter(tag => tag.name),
          similarity: similarity,
          is_connected: record.get('is_connected')
        };
      })
      .filter(resource => resource.similarity >= threshold)
      .sort((a, b) => {
        // Sort by similarity DESC, then feedback_count DESC
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }
        return b.feedback_count - a.feedback_count;
      })
      .slice(0, limit);

    console.log(`✅ Found ${recommendationsWithSimilarity.length} recommendations`);
    return recommendationsWithSimilarity;
  } finally {
    await session.close();
  }
}

module.exports = {
  createResource,
  getResourceById,
  searchResources,
  semanticSearch,
  getRecommendations,
  searchResourcesBySemantic,
  addTagsToResource,
  createRelationship,
  getConnectedResources,
  suggestTags
};

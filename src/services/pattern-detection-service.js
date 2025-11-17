/**
 * Pattern Detection Service
 *
 * Business logic for co-utilization pattern detection from feedback data
 *
 * Requirements: 1 (Pattern Detection), 2 (CO_UTILIZED Relationship Management), 4 (Co-Utilized Resources Retrieval), NFR-2 (Data Integrity)
 * Tasks: 1.1 パターン検出関数の実装, 1.2 共利用資源取得関数の実装
 */

const neo4jDriver = require('../db/neo4j-driver');
const neo4j = require('neo4j-driver');
const { ValidationError, NotFoundError, InternalServerError } = require('../utils/errors');

/**
 * Helper function to format log messages
 * Format: [TIMESTAMP] [LEVEL] [PatternDetection] message
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] [PatternDetection] ${message}`;

  if (level === 'ERROR') {
    console.error(formattedMessage);
  } else if (level === 'WARN') {
    console.warn(formattedMessage);
  } else {
    console.log(formattedMessage);
  }
}

/**
 * Detect co-utilization patterns across all resources
 *
 * Analyzes User-Feedback-Resource relationships to find resources that have been
 * used by common users. Creates or updates CO_UTILIZED relationships with strength
 * and users_count properties.
 *
 * @param {Object} options - Detection options
 * @param {number} options.minUsers - Minimum common users threshold (default: 2)
 * @param {Object} options.driver - Neo4j driver instance for dependency injection (default: neo4jDriver)
 * @returns {Promise<Array<Object>>} Detected patterns with resource info and strength
 *
 * @example
 * const patterns = await detectCoUtilizationPatterns({ minUsers: 3 });
 * // Returns: [{ resource1_id, resource1_name, resource2_id, resource2_name, users_count, strength }, ...]
 */
async function detectCoUtilizationPatterns(options = {}) {
  const { minUsers = 2, driver = neo4jDriver } = options;

  // Validation: minUsers must be a positive integer
  if (typeof minUsers !== 'number' || !Number.isInteger(minUsers) || minUsers <= 0) {
    throw new ValidationError('minUsers must be a positive integer');
  }

  const session = driver.getSession();
  const startTime = Date.now();

  // Log execution start
  log('INFO', `Starting co-utilization pattern detection with minUsers=${minUsers}`);

  try {
    // Cypher query adapted to current schema: Resource-[:HAS_FEEDBACK]->Feedback-[:GIVEN_BY]->User
    const query = `
      // Step 1: Find resource pairs with common users
      MATCH (u:User)<-[:GIVEN_BY]-(f1:Feedback)<-[:HAS_FEEDBACK]-(r1:Resource)
      MATCH (u)<-[:GIVEN_BY]-(f2:Feedback)<-[:HAS_FEEDBACK]-(r2:Resource)
      WHERE id(r1) < id(r2)
      WITH r1, r2, count(DISTINCT u) as co_users
      WHERE co_users >= $minUsers

      // Step 2: Calculate strength
      WITH r1, r2, co_users, toFloat(co_users) / 10.0 as strength

      // Step 3: MERGE CO_UTILIZED relationship (idempotent)
      MERGE (r1)-[rel:CO_UTILIZED]-(r2)
      SET rel.strength = strength,
          rel.users_count = co_users,
          rel.detected_at = datetime()

      // Step 4: Return results for logging
      RETURN r1.id as resource1_id, r1.name as resource1_name,
             r2.id as resource2_id, r2.name as resource2_name,
             co_users, strength
      ORDER BY co_users DESC, strength DESC
    `;

    const result = await session.run(query, { minUsers: neo4j.int(minUsers) });

    // Format results
    const patterns = result.records.map(record => ({
      resource1_id: record.get('resource1_id'),
      resource1_name: record.get('resource1_name'),
      resource2_id: record.get('resource2_id'),
      resource2_name: record.get('resource2_name'),
      users_count: neo4j.isInt(record.get('co_users')) ? record.get('co_users').toNumber() : record.get('co_users'),
      strength: record.get('strength')
    }));

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log completion
    log('INFO', `Completed: ${patterns.length} patterns detected in ${duration}ms`);

    // Log warning if execution exceeded 30 seconds
    if (duration > 30000) {
      log('WARN', `Pattern detection took ${duration}ms (>30s)`);
    }

    return patterns;
  } catch (error) {
    // Log error details
    log('ERROR', 'Failed to detect co-utilization patterns');
    console.error(error.stack || error.message || error);

    // Wrap database errors in InternalServerError
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new InternalServerError('Failed to detect co-utilization patterns');
  } finally {
    await session.close();
  }
}

/**
 * Get co-utilized resources for a specific resource
 *
 * Retrieves resources that have CO_UTILIZED relationships with the target resource,
 * sorted by strength in descending order.
 *
 * @param {string} resourceId - Target resource ID
 * @param {Object} options - Retrieval options
 * @param {number} options.minStrength - Minimum strength threshold (default: 0.2)
 * @param {number} options.limit - Maximum number of results (default: 5)
 * @param {Object} options.driver - Neo4j driver instance for dependency injection (default: neo4jDriver)
 * @returns {Promise<Array<Object>>} Co-utilized resources with metadata
 *
 * @example
 * const resources = await getCoUtilizedResources('resource_001', { minStrength: 0.3, limit: 10 });
 * // Returns: [{ id, name, type, description, area, strength, users_count }, ...]
 */
async function getCoUtilizedResources(resourceId, options = {}) {
  const { minStrength = 0.2, limit = 5, driver = neo4jDriver } = options;

  // Validation: resourceId must be a non-empty string
  if (!resourceId || typeof resourceId !== 'string' || resourceId.trim() === '') {
    throw new ValidationError('resourceId must be a non-empty string');
  }

  // Validation: minStrength must be between 0 and 1
  if (typeof minStrength !== 'number' || minStrength < 0 || minStrength > 1) {
    throw new ValidationError('minStrength must be between 0 and 1');
  }

  // Validation: limit must be a positive integer
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new ValidationError('limit must be a positive integer');
  }

  const session = driver.getSession();
  const startTime = Date.now();

  // Log execution start
  log('INFO', `Retrieving co-utilized resources for ${resourceId}`);

  try {
    const query = `
      MATCH (r:Resource {id: $resourceId})-[rel:CO_UTILIZED]-(coUtilized:Resource)
      WHERE rel.strength >= $minStrength
      OPTIONAL MATCH (coUtilized)-[:LOCATED_IN]->(area:Area)
      RETURN coUtilized.id as id,
             coUtilized.name as name,
             coUtilized.type as type,
             coUtilized.description as description,
             area.name as area,
             rel.strength as strength,
             rel.users_count as users_count
      ORDER BY rel.strength DESC, rel.users_count DESC
      LIMIT $limit
    `;

    const result = await session.run(query, {
      resourceId,
      minStrength,
      limit: neo4j.int(limit)
    });

    // Format results
    const resources = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      type: record.get('type'),
      description: record.get('description'),
      area: record.get('area'),
      strength: record.get('strength'),
      users_count: neo4j.isInt(record.get('users_count')) ? record.get('users_count').toNumber() : record.get('users_count')
    }));

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log completion
    log('INFO', `Completed: ${resources.length} resources retrieved in ${duration}ms`);

    return resources;
  } catch (error) {
    // Log error details
    log('ERROR', 'Failed to retrieve co-utilized resources');
    console.error(error.stack || error.message || error);

    // Wrap database errors in InternalServerError
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new InternalServerError('Failed to retrieve co-utilized resources');
  } finally {
    await session.close();
  }
}

module.exports = {
  detectCoUtilizationPatterns,
  getCoUtilizedResources
};

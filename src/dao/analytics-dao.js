/**
 * Analytics DAO
 * Handles analytics and statistics queries
 * Requirements: 12 (Analytics and Statistics)
 */

const neo4j = require('neo4j-driver');
const neo4jDriver = require('../db/neo4j-driver');

/**
 * Count all resources
 * @returns {Promise<number>} Total resource count
 */
async function countAllResources() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      'MATCH (r:Resource) RETURN count(r) as count'
    );

    return result.records[0].get('count').toNumber();
  } finally {
    await session.close();
  }
}

/**
 * Count all feedback
 * @returns {Promise<number>} Total feedback count
 */
async function countAllFeedback() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      'MATCH (f:Feedback) RETURN count(f) as count'
    );

    return result.records[0].get('count').toNumber();
  } finally {
    await session.close();
  }
}

/**
 * Count all needs
 * @returns {Promise<number>} Total need count
 */
async function countAllNeeds() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      'MATCH (n:Need) RETURN count(n) as count'
    );

    return result.records[0].get('count').toNumber();
  } finally {
    await session.close();
  }
}

/**
 * Count needs by status
 * @returns {Promise<Array>} Array of status counts
 */
async function countNeedsByStatus() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Need)
      RETURN n.status as status, count(n) as count
      ORDER BY count DESC
      `
    );

    return result.records.map(record => ({
      status: record.get('status'),
      count: record.get('count').toNumber()
    }));
  } finally {
    await session.close();
  }
}

/**
 * Get resource distribution by area
 * @returns {Promise<Array>} Array of area resource counts
 */
async function getResourceDistributionByArea() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (r:Resource)-[:LOCATED_IN]->(a:Area)
      RETURN a.id as area_id, a.name as area_name, count(r) as resource_count
      ORDER BY resource_count DESC
      `
    );

    return result.records.map(record => ({
      area_id: record.get('area_id'),
      area_name: record.get('area_name'),
      resource_count: record.get('resource_count').toNumber()
    }));
  } finally {
    await session.close();
  }
}

/**
 * Get popular tags by usage count
 * @param {number} limit - Maximum number of tags to return
 * @returns {Promise<Array>} Array of popular tags
 */
async function getPopularTags(limit = 10) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (t:Tag)
      RETURN t.id as id, t.name as name, t.category as category, t.usage_count as usage_count
      ORDER BY usage_count DESC
      LIMIT $limit
      `,
      { limit: neo4j.int(limit) }
    );

    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category'),
      usage_count: typeof record.get('usage_count') === 'object'
        ? record.get('usage_count').toNumber()
        : record.get('usage_count')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Get user ranking by contribution (resources + feedback)
 * @param {number} limit - Maximum number of users to return
 * @returns {Promise<Array>} Array of users with contribution counts
 */
async function getUserRanking(limit = 10) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      OPTIONAL MATCH (u)<-[:REGISTERED_BY]-(r:Resource)
      OPTIONAL MATCH (u)<-[:GIVEN_BY]-(f:Feedback)
      WITH u, count(DISTINCT r) as resource_count, count(DISTINCT f) as feedback_count
      RETURN u.id as user_id, u.name as user_name,
        resource_count, feedback_count,
        resource_count + feedback_count as total_contribution
      ORDER BY total_contribution DESC
      LIMIT $limit
      `,
      { limit: neo4j.int(limit) }
    );

    return result.records.map(record => ({
      user_id: record.get('user_id'),
      user_name: record.get('user_name'),
      resource_count: record.get('resource_count').toNumber(),
      feedback_count: record.get('feedback_count').toNumber(),
      total_contribution: record.get('total_contribution').toNumber()
    }));
  } finally {
    await session.close();
  }
}

/**
 * Analyze unmatched needs by target classification
 * @returns {Promise<Array>} Array of unmatched need analysis by target
 */
async function analyzeUnmatchedNeeds() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Need)
      WHERE n.status = 'open'
      RETURN n.target as target, n.purpose as purpose, count(n) as count
      ORDER BY count DESC
      `
    );

    return result.records.map(record => ({
      target: record.get('target'),
      purpose: record.get('purpose'),
      count: record.get('count').toNumber()
    }));
  } finally {
    await session.close();
  }
}

module.exports = {
  countAllResources,
  countAllFeedback,
  countAllNeeds,
  countNeedsByStatus,
  getResourceDistributionByArea,
  getPopularTags,
  getUserRanking,
  analyzeUnmatchedNeeds
};

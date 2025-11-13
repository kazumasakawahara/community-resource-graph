/**
 * Statistics Service
 *
 * Business logic for statistics and analytics
 *
 * Requirements: 12 (Statistics and Analysis)
 * Task: 統計・分析機能実装
 */

const neo4jDriver = require('../db/neo4j-driver');

/**
 * Get overview statistics
 * @returns {Promise<Object>} Overview statistics
 */
async function getOverviewStats() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (r:Resource)
      WITH count(r) as resourceCount
      MATCH (f:Feedback)
      WITH resourceCount, count(f) as feedbackCount
      MATCH (n:Need)
      WITH resourceCount, feedbackCount, count(n) as needCount
      MATCH (u:User)
      RETURN
        resourceCount,
        feedbackCount,
        needCount,
        count(u) as userCount
      `
    );

    if (result.records.length === 0) {
      return {
        resource_count: 0,
        feedback_count: 0,
        need_count: 0,
        user_count: 0
      };
    }

    const record = result.records[0];

    return {
      resource_count: typeof record.get('resourceCount') === 'object'
        ? record.get('resourceCount').toNumber()
        : record.get('resourceCount'),
      feedback_count: typeof record.get('feedbackCount') === 'object'
        ? record.get('feedbackCount').toNumber()
        : record.get('feedbackCount'),
      need_count: typeof record.get('needCount') === 'object'
        ? record.get('needCount').toNumber()
        : record.get('needCount'),
      user_count: typeof record.get('userCount') === 'object'
        ? record.get('userCount').toNumber()
        : record.get('userCount')
    };
  } finally {
    await session.close();
  }
}

/**
 * Get area statistics (resources per area)
 * @returns {Promise<Array>} Area statistics
 */
async function getAreaStats() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (a:Area)
      OPTIONAL MATCH (r:Resource)-[:LOCATED_IN]->(a)
      WITH a, count(r) as resourceCount
      OPTIONAL MATCH (n:Need)-[:IN_AREA]->(a)
      RETURN
        a.id as areaId,
        a.name as areaName,
        a.type as areaType,
        resourceCount,
        count(n) as needCount
      ORDER BY resourceCount DESC
      `
    );

    return result.records.map(record => ({
      area_id: record.get('areaId'),
      area_name: record.get('areaName'),
      area_type: record.get('areaType'),
      resource_count: typeof record.get('resourceCount') === 'object'
        ? record.get('resourceCount').toNumber()
        : record.get('resourceCount'),
      need_count: typeof record.get('needCount') === 'object'
        ? record.get('needCount').toNumber()
        : record.get('needCount')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Get tag statistics (most frequently used tags)
 * @param {number} limit - Number of top tags to return
 * @returns {Promise<Array>} Tag statistics
 */
async function getTagStats(limit = 20) {
  const session = neo4jDriver.getSession();
  const neo4j = require('neo4j-driver');

  try {
    const result = await session.run(
      `
      MATCH (r:Resource)-[:HAS_TAG]->(t:Tag)
      WITH t.name as tagName, t.category as tagCategory, count(r) as usageCount
      RETURN tagName, tagCategory, usageCount
      ORDER BY usageCount DESC
      LIMIT $limit
      `,
      { limit: neo4j.int(limit) }
    );

    return result.records.map(record => ({
      tag_name: record.get('tagName'),
      tag_category: record.get('tagCategory'),
      usage_count: typeof record.get('usageCount') === 'object'
        ? record.get('usageCount').toNumber()
        : record.get('usageCount')
    }));
  } finally {
    await session.close();
  }
}

/**
 * Get contributor statistics (users by contribution)
 * @param {number} limit - Number of top contributors to return
 * @returns {Promise<Array>} Contributor statistics
 */
async function getContributorStats(limit = 20) {
  const session = neo4jDriver.getSession();
  const neo4j = require('neo4j-driver');

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      OPTIONAL MATCH (r:Resource)-[:REGISTERED_BY]->(u)
      WITH u, count(r) as resourceCount
      OPTIONAL MATCH (f:Feedback)-[:SUBMITTED_BY]->(u)
      WITH u, resourceCount, count(f) as feedbackCount
      OPTIONAL MATCH (n:Need)-[:RECORDED_BY]->(u)
      WITH u, resourceCount, feedbackCount, count(n) as needCount
      WITH u, resourceCount, feedbackCount, needCount,
           (resourceCount * 3 + feedbackCount + needCount) as contributionScore
      WHERE contributionScore > 0
      RETURN
        u.id as userId,
        u.name as userName,
        u.role as userRole,
        resourceCount,
        feedbackCount,
        needCount,
        contributionScore
      ORDER BY contributionScore DESC
      LIMIT $limit
      `,
      { limit: neo4j.int(limit) }
    );

    return result.records.map(record => ({
      user_id: record.get('userId'),
      user_name: record.get('userName'),
      user_role: record.get('userRole'),
      resource_count: typeof record.get('resourceCount') === 'object'
        ? record.get('resourceCount').toNumber()
        : record.get('resourceCount'),
      feedback_count: typeof record.get('feedbackCount') === 'object'
        ? record.get('feedbackCount').toNumber()
        : record.get('feedbackCount'),
      need_count: typeof record.get('needCount') === 'object'
        ? record.get('needCount').toNumber()
        : record.get('needCount'),
      contribution_score: typeof record.get('contributionScore') === 'object'
        ? record.get('contributionScore').toNumber()
        : record.get('contributionScore')
    }));
  } finally {
    await session.close();
  }
}

module.exports = {
  getOverviewStats,
  getAreaStats,
  getTagStats,
  getContributorStats
};

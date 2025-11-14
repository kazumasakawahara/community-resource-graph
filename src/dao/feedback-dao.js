/**
 * Feedback DAO
 * Handles feedback CRUD operations for resources
 * Requirements: 5 (Feedback System)
 */

const crypto = require('crypto');
const neo4j = require('neo4j-driver');
const neo4jDriver = require('../db/neo4j-driver');

/**
 * Create a new feedback
 * @param {Object} feedbackData - Feedback data (content, visit_date)
 * @param {string} userId - User ID who created the feedback
 * @param {string} resourceId - Resource ID the feedback is for
 * @returns {Promise<Object>} Created feedback object
 */
async function create(feedbackData, userId, resourceId) {
  const session = neo4jDriver.getSession();

  try {
    const { content, visit_date } = feedbackData;
    const feedbackId = `feedback_${crypto.randomUUID()}`;

    const result = await session.run(
      `
      MATCH (r:Resource {id: $resourceId})
      MATCH (u:User {id: $userId})
      CREATE (f:Feedback {
        id: $feedbackId,
        content: $content,
        visit_date: $visit_date,
        helpful_count: 0,
        created_at: datetime()
      })
      CREATE (r)-[:HAS_FEEDBACK]->(f)
      CREATE (f)-[:GIVEN_BY]->(u)
      SET r.feedback_count = COALESCE(r.feedback_count, 0) + 1
      RETURN f
      `,
      {
        feedbackId,
        content,
        visit_date,
        resourceId,
        userId
      }
    );

    const feedbackNode = result.records[0].get('f').properties;

    return {
      id: feedbackNode.id,
      content: feedbackNode.content,
      visit_date: feedbackNode.visit_date,
      helpful_count: typeof feedbackNode.helpful_count === 'object'
        ? feedbackNode.helpful_count.toNumber()
        : feedbackNode.helpful_count,
      created_at: feedbackNode.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

/**
 * Find all feedbacks for a resource
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} Array of feedback objects with author information
 */
async function findByResourceId(resourceId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (r:Resource {id: $resourceId})-[:HAS_FEEDBACK]->(f:Feedback)
      MATCH (f)-[:GIVEN_BY]->(u:User)
      RETURN f, u.id as user_id, u.name as user_name
      ORDER BY f.created_at DESC
      `,
      { resourceId }
    );

    return result.records.map(record => {
      const feedback = record.get('f').properties;
      const userId = record.get('user_id');
      const userName = record.get('user_name');

      return {
        id: feedback.id,
        content: feedback.content,
        visit_date: feedback.visit_date,
        helpful_count: typeof feedback.helpful_count === 'object'
          ? feedback.helpful_count.toNumber()
          : feedback.helpful_count,
        created_at: feedback.created_at.toString(),
        author_name: userName,
        user: {
          id: userId,
          name: userName
        }
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Increment helpful_count for a feedback
 * @param {string} feedbackId - Feedback ID
 * @returns {Promise<Object|null>} Updated feedback object or null if not found
 */
async function incrementHelpfulCount(feedbackId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (f:Feedback {id: $feedbackId})
      SET f.helpful_count = f.helpful_count + 1
      RETURN f
      `,
      { feedbackId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const feedback = result.records[0].get('f').properties;

    return {
      id: feedback.id,
      content: feedback.content,
      visit_date: feedback.visit_date,
      helpful_count: typeof feedback.helpful_count === 'object'
        ? feedback.helpful_count.toNumber()
        : feedback.helpful_count,
      created_at: feedback.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

module.exports = {
  create,
  findByResourceId,
  incrementHelpfulCount
};

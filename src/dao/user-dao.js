/**
 * User DAO (Data Access Object)
 *
 * Handles all User-related database operations.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 4.1 ユーザーCRUD操作
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const neo4jDriver = require('../db/neo4j-driver');

/**
 * Create a new user
 *
 * @param {Object} userData - User data
 * @param {string} userData.name - User name
 * @param {string} userData.email - User email
 * @param {string} userData.password - Plain text password (will be hashed)
 * @param {string} userData.role - User role (supporter, individual, family, resident)
 * @param {string} [userData.organization] - Organization name (optional)
 * @returns {Promise<Object>} Created user object
 */
async function create(userData) {
  const session = neo4jDriver.getSession();

  try {
    // Generate unique user ID using crypto.randomUUID()
    const userId = `user_${crypto.randomUUID()}`;

    // Hash password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create User node in Neo4j
    const result = await session.run(
      `
      CREATE (u:User {
        id: $id,
        name: $name,
        email: $email,
        password: $password,
        role: $role,
        organization: $organization,
        created_at: datetime()
      })
      RETURN u
      `,
      {
        id: userId,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        organization: userData.organization || null
      }
    );

    const userNode = result.records[0].get('u').properties;

    // Convert Neo4j DateTime to ISO string
    return {
      id: userNode.id,
      name: userNode.name,
      email: userNode.email,
      password: userNode.password, // Include for authentication purposes
      role: userNode.role,
      organization: userNode.organization,
      created_at: userNode.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

/**
 * Find user by email
 *
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findByEmail(email) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:User {email: $email})
      RETURN u
      `,
      { email }
    );

    if (result.records.length === 0) {
      return null;
    }

    const userNode = result.records[0].get('u').properties;

    // Include password for authentication purposes
    return {
      id: userNode.id,
      name: userNode.name,
      email: userNode.email,
      password: userNode.password,
      role: userNode.role,
      organization: userNode.organization,
      created_at: userNode.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

/**
 * Find user by ID
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findById(userId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      RETURN u
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const userNode = result.records[0].get('u').properties;

    // Do NOT include password in profile queries
    return {
      id: userNode.id,
      name: userNode.name,
      email: userNode.email,
      role: userNode.role,
      organization: userNode.organization,
      created_at: userNode.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

/**
 * Get user contributions (registered resources and given feedbacks count)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User contributions object with counts
 */
async function getUserContributions(userId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (r:Resource)-[:REGISTERED_BY]->(u)
      OPTIONAL MATCH (f:Feedback)-[:GIVEN_BY]->(u)
      RETURN
        count(DISTINCT r) AS registered_resources_count,
        count(DISTINCT f) AS given_feedbacks_count
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return {
        registered_resources_count: 0,
        given_feedbacks_count: 0
      };
    }

    const record = result.records[0];

    return {
      registered_resources_count: record.get('registered_resources_count').toNumber(),
      given_feedbacks_count: record.get('given_feedbacks_count').toNumber()
    };
  } finally {
    await session.close();
  }
}

module.exports = {
  create,
  findByEmail,
  findById,
  getUserContributions
};

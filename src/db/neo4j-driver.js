/**
 * Neo4j Driver Singleton
 *
 * Provides a single Neo4j driver instance with connection pooling
 * and session management.
 *
 * Requirements: 11 (Database Index Optimization)
 * Task: 3.1 ドライバシングルトン実装
 */

const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');

dotenv.config();

// Singleton driver instance
let driver = null;

/**
 * Neo4j connection configuration
 */
const config = {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 60000, // 60 seconds
  maxTransactionRetryTime: 30000, // 30 seconds
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    logger: (level, message) => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Neo4j ${level}] ${message}`);
      }
    }
  }
};

/**
 * Get or create Neo4j driver instance (Singleton pattern)
 *
 * @returns {neo4j.Driver} Neo4j driver instance
 */
function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:17687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      config
    );
  }

  return driver;
}

/**
 * Get a new Neo4j session
 *
 * @param {Object} options - Session options
 * @param {string} options.database - Database name (default: neo4j)
 * @param {string} options.defaultAccessMode - Access mode (READ or WRITE)
 * @returns {neo4j.Session} Neo4j session instance
 */
function getSession(options = {}) {
  const currentDriver = getDriver();

  const sessionConfig = {
    database: options.database || 'neo4j',
    defaultAccessMode: options.defaultAccessMode || neo4j.session.WRITE
  };

  return currentDriver.session(sessionConfig);
}

/**
 * Close the Neo4j driver connection
 *
 * @returns {Promise<void>}
 */
async function close() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Verify Neo4j connectivity
 *
 * @returns {Promise<void>}
 * @throws {Error} If connection fails
 */
async function verifyConnectivity() {
  const currentDriver = getDriver();

  try {
    await currentDriver.verifyConnectivity();
  } catch (error) {
    throw new Error(`Neo4j connection failed: ${error.message}`);
  }
}

module.exports = {
  getDriver,
  getSession,
  close,
  verifyConnectivity
};

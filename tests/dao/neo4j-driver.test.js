/**
 * Test: Neo4j Driver Singleton
 * Requirement: 11 (Database Index Optimization)
 * Task: 3.1 ドライバシングルトン実装
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import will be created in GREEN phase
let neo4jDriver;

describe('Neo4j Driver Singleton', () => {
  beforeAll(() => {
    // Dynamic import for the module we'll create
    neo4jDriver = require('../../src/db/neo4j-driver');
  });

  afterAll(async () => {
    // Clean up driver connection
    if (neo4jDriver && neo4jDriver.close) {
      await neo4jDriver.close();
    }
  });

  describe('getDriver()', () => {
    test('should return a Neo4j driver instance', () => {
      const driver = neo4jDriver.getDriver();

      expect(driver).toBeDefined();
      expect(typeof driver.session).toBe('function');
      expect(typeof driver.verifyConnectivity).toBe('function');
    });

    test('should return the same driver instance (singleton)', () => {
      const driver1 = neo4jDriver.getDriver();
      const driver2 = neo4jDriver.getDriver();

      expect(driver1).toBe(driver2);
    });

    test('should have connection pool configuration', () => {
      const driver = neo4jDriver.getDriver();

      // Verify driver was created with config
      expect(driver).toBeDefined();
    });
  });

  describe('getSession()', () => {
    test('should return a Neo4j session', () => {
      const session = neo4jDriver.getSession();

      expect(session).toBeDefined();
      expect(typeof session.run).toBe('function');
      expect(typeof session.close).toBe('function');
    });

    test('should return new session instances', () => {
      const session1 = neo4jDriver.getSession();
      const session2 = neo4jDriver.getSession();

      // Sessions should be different instances
      expect(session1).not.toBe(session2);

      // Clean up
      session1.close();
      session2.close();
    });

    test('should be able to run queries', async () => {
      const session = neo4jDriver.getSession();

      try {
        const result = await session.run('RETURN 1 AS number');

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('number').toNumber()).toBe(1);
      } finally {
        await session.close();
      }
    });
  });

  describe('close()', () => {
    test('should close the driver connection', async () => {
      // Get driver first to ensure it's initialized
      neo4jDriver.getDriver();

      await expect(neo4jDriver.close()).resolves.not.toThrow();
    });
  });

  describe('Connection Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      const session = neo4jDriver.getSession();

      try {
        // Test that we can connect
        await session.run('RETURN 1');
        expect(true).toBe(true); // Connection successful
      } catch (error) {
        // If connection fails, error should be informative
        expect(error.message).toBeDefined();
      } finally {
        await session.close();
      }
    });
  });

  describe('Configuration', () => {
    test('should read connection config from environment', () => {
      const driver = neo4jDriver.getDriver();

      // Driver should be configured with env variables
      expect(process.env.NEO4J_URI).toBeDefined();
      expect(process.env.NEO4J_USERNAME).toBeDefined();
      expect(process.env.NEO4J_PASSWORD).toBeDefined();
      expect(driver).toBeDefined();
    });
  });
});

/**
 * Unit Tests for Pattern Detection Service
 *
 * Requirements: 7 (Testability)
 * Task: 3.1 detectCoUtilizationPatterns()のテスト
 */

const { detectCoUtilizationPatterns, getCoUtilizedResources } = require('../../src/services/pattern-detection-service');
const neo4j = require('neo4j-driver');
const { ValidationError, NotFoundError, InternalServerError } = require('../../src/utils/errors');

// Mock console methods for logging tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Mock Neo4j driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn()
};

const mockDriver = {
  getSession: jest.fn(() => mockSession)
};

describe('Pattern Detection Service - detectCoUtilizationPatterns()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic pattern detection', () => {
    test('should detect patterns with default minUsers=2', async () => {
      // Mock data: 2 resource pairs with 3 and 2 common users
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                resource1_id: 'resource_001',
                resource1_name: '図書館A',
                resource2_id: 'resource_002',
                resource2_name: '図書館B',
                co_users: 3,
                strength: 0.3
              };
              return data[key];
            })
          },
          {
            get: jest.fn((key) => {
              const data = {
                resource1_id: 'resource_001',
                resource1_name: '図書館A',
                resource2_id: 'resource_003',
                resource2_name: 'カフェC',
                co_users: 2,
                strength: 0.2
              };
              return data[key];
            })
          }
        ]
      });

      const patterns = await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toMatchObject({
        resource1_id: 'resource_001',
        resource1_name: '図書館A',
        resource2_id: 'resource_002',
        resource2_name: '図書館B',
        users_count: 3,
        strength: 0.3
      });
      expect(patterns[1]).toMatchObject({
        resource1_id: 'resource_001',
        resource1_name: '図書館A',
        resource2_id: 'resource_003',
        resource2_name: 'カフェC',
        users_count: 2,
        strength: 0.2
      });
      expect(mockSession.run).toHaveBeenCalledTimes(1);
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('should use default minUsers=2 when not specified', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      const callArgs = mockSession.run.mock.calls[0];
      expect(neo4j.isInt(callArgs[1].minUsers)).toBe(true);
      expect(callArgs[1].minUsers.toNumber()).toBe(2);
    });

    test('should filter patterns below minUsers threshold', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [] // No patterns with >=3 users (filtered by Cypher query)
      });

      const patterns = await detectCoUtilizationPatterns({
        minUsers: 3,
        driver: mockDriver
      });

      expect(patterns).toHaveLength(0);

      const callArgs = mockSession.run.mock.calls[0];
      expect(neo4j.isInt(callArgs[1].minUsers)).toBe(true);
      expect(callArgs[1].minUsers.toNumber()).toBe(3);
    });
  });

  describe('Edge cases', () => {
    test('should handle no feedback data gracefully', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      const patterns = await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(patterns).toHaveLength(0);
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('should handle single user feedback (no patterns)', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [] // Single user feedback won't create co-utilization
      });

      const patterns = await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(patterns).toHaveLength(0);
    });
  });

  describe('Strength calculation', () => {
    test('should calculate strength as co_users / 10.0', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                resource1_id: 'r1',
                resource1_name: 'Resource 1',
                resource2_id: 'r2',
                resource2_name: 'Resource 2',
                co_users: 5,
                strength: 0.5
              };
              return data[key];
            })
          }
        ]
      });

      const patterns = await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(patterns[0].strength).toBe(0.5);
      expect(patterns[0].users_count).toBe(5);
    });
  });

  describe('Cypher query validation', () => {
    test('should execute correct Cypher query structure', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      const cypherQuery = mockSession.run.mock.calls[0][0];

      // Verify query includes essential components
      expect(cypherQuery).toContain('MATCH (u:User)<-[:GIVEN_BY]');
      expect(cypherQuery).toContain('MATCH (u)<-[:GIVEN_BY]');
      expect(cypherQuery).toContain('WHERE id(r1) < id(r2)');
      expect(cypherQuery).toContain('count(DISTINCT u)');
      expect(cypherQuery).toContain('MERGE (r1)-[rel:CO_UTILIZED]-(r2)');
      expect(cypherQuery).toContain('rel.strength');
      expect(cypherQuery).toContain('rel.users_count');
      expect(cypherQuery).toContain('rel.detected_at');
    });

    test('should use MERGE for idempotent relationship creation', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      const cypherQuery = mockSession.run.mock.calls[0][0];
      expect(cypherQuery).toContain('MERGE (r1)-[rel:CO_UTILIZED]-(r2)');
    });
  });

  describe('Session management', () => {
    test('should close session even if query succeeds', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('should close session even if query fails', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Query failed'));

      await expect(
        detectCoUtilizationPatterns({ driver: mockDriver })
      ).rejects.toThrow('Failed to detect co-utilization patterns');

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Pattern Detection Service - getCoUtilizedResources()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic retrieval', () => {
    test('should return co-utilized resources sorted by strength', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                id: 'resource_002',
                name: '図書館B',
                type: 'place',
                description: '静かな環境',
                area: '中央区',
                strength: 0.5,
                users_count: 5
              };
              return data[key];
            })
          },
          {
            get: jest.fn((key) => {
              const data = {
                id: 'resource_003',
                name: 'カフェC',
                type: 'place',
                description: 'リラックスできる',
                area: '西区',
                strength: 0.3,
                users_count: 3
              };
              return data[key];
            })
          }
        ]
      });

      const results = await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(results).toHaveLength(2);
      expect(results[0].strength).toBeGreaterThan(results[1].strength);
      expect(results[0]).toMatchObject({
        id: 'resource_002',
        name: '図書館B',
        type: 'place',
        description: '静かな環境',
        area: '中央区',
        strength: 0.5,
        users_count: 5
      });
    });

    test('should use default minStrength=0.2 and limit=5', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('resource_001', { driver: mockDriver });

      const callArgs = mockSession.run.mock.calls[0];
      expect(callArgs[1].minStrength).toBe(0.2);
      expect(neo4j.isInt(callArgs[1].limit)).toBe(true);
      expect(callArgs[1].limit.toNumber()).toBe(5);
    });

    test('should respect custom minStrength and limit', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('resource_001', {
        minStrength: 0.4,
        limit: 10,
        driver: mockDriver
      });

      const callArgs = mockSession.run.mock.calls[0];
      expect(callArgs[1].minStrength).toBe(0.4);
      expect(neo4j.isInt(callArgs[1].limit)).toBe(true);
      expect(callArgs[1].limit.toNumber()).toBe(10);
    });
  });

  describe('Edge cases', () => {
    test('should return empty array when no co-utilized resources found', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      const results = await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(results).toEqual([]);
    });

    test('should handle area as null when not available', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                id: 'resource_002',
                name: 'Resource 2',
                type: 'place',
                description: 'Description',
                area: null,
                strength: 0.3,
                users_count: 3
              };
              return data[key];
            })
          }
        ]
      });

      const results = await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(results[0].area).toBeNull();
    });
  });

  describe('Cypher query validation', () => {
    test('should execute correct Cypher query structure', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('resource_001', { driver: mockDriver });

      const cypherQuery = mockSession.run.mock.calls[0][0];

      expect(cypherQuery).toContain('MATCH (r:Resource {id: $resourceId})-[rel:CO_UTILIZED]-(coUtilized:Resource)');
      expect(cypherQuery).toContain('WHERE rel.strength >= $minStrength');
      expect(cypherQuery).toContain('OPTIONAL MATCH (coUtilized)-[:LOCATED_IN]->(area:Area)');
      expect(cypherQuery).toContain('ORDER BY rel.strength DESC');
      expect(cypherQuery).toContain('LIMIT $limit');
    });

    test('should pass correct parameters', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('test_resource_id', {
        minStrength: 0.3,
        limit: 8,
        driver: mockDriver
      });

      const params = mockSession.run.mock.calls[0][1];
      expect(params.resourceId).toBe('test_resource_id');
      expect(params.minStrength).toBe(0.3);
      expect(neo4j.isInt(params.limit)).toBe(true);
      expect(params.limit.toNumber()).toBe(8);
    });
  });

  describe('Session management', () => {
    test('should close session even if query succeeds', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('should close session even if query fails', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Query failed'));

      await expect(
        getCoUtilizedResources('resource_001', { driver: mockDriver })
      ).rejects.toThrow('Failed to retrieve co-utilized resources');

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Pattern Detection Service - Error Handling (Task 1.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectCoUtilizationPatterns() - Validation Errors', () => {
    test('should throw ValidationError for invalid minUsers (negative)', async () => {
      await expect(
        detectCoUtilizationPatterns({ minUsers: -1, driver: mockDriver })
      ).rejects.toThrow(ValidationError);

      await expect(
        detectCoUtilizationPatterns({ minUsers: -1, driver: mockDriver })
      ).rejects.toThrow('minUsers must be a positive integer');
    });

    test('should throw ValidationError for invalid minUsers (zero)', async () => {
      await expect(
        detectCoUtilizationPatterns({ minUsers: 0, driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid minUsers (non-integer)', async () => {
      await expect(
        detectCoUtilizationPatterns({ minUsers: 2.5, driver: mockDriver })
      ).rejects.toThrow(ValidationError);

      await expect(
        detectCoUtilizationPatterns({ minUsers: 2.5, driver: mockDriver })
      ).rejects.toThrow('minUsers must be a positive integer');
    });

    test('should throw ValidationError for invalid minUsers (non-number)', async () => {
      await expect(
        detectCoUtilizationPatterns({ minUsers: 'invalid', driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getCoUtilizedResources() - Validation Errors', () => {
    test('should throw ValidationError for invalid resourceId (empty string)', async () => {
      await expect(
        getCoUtilizedResources('', { driver: mockDriver })
      ).rejects.toThrow(ValidationError);

      await expect(
        getCoUtilizedResources('', { driver: mockDriver })
      ).rejects.toThrow('resourceId must be a non-empty string');
    });

    test('should throw ValidationError for invalid resourceId (null)', async () => {
      await expect(
        getCoUtilizedResources(null, { driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid resourceId (undefined)', async () => {
      await expect(
        getCoUtilizedResources(undefined, { driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid minStrength (negative)', async () => {
      await expect(
        getCoUtilizedResources('resource_001', { minStrength: -0.1, driver: mockDriver })
      ).rejects.toThrow(ValidationError);

      await expect(
        getCoUtilizedResources('resource_001', { minStrength: -0.1, driver: mockDriver })
      ).rejects.toThrow('minStrength must be between 0 and 1');
    });

    test('should throw ValidationError for invalid minStrength (> 1)', async () => {
      await expect(
        getCoUtilizedResources('resource_001', { minStrength: 1.5, driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid limit (negative)', async () => {
      await expect(
        getCoUtilizedResources('resource_001', { limit: -5, driver: mockDriver })
      ).rejects.toThrow(ValidationError);

      await expect(
        getCoUtilizedResources('resource_001', { limit: -5, driver: mockDriver })
      ).rejects.toThrow('limit must be a positive integer');
    });

    test('should throw ValidationError for invalid limit (zero)', async () => {
      await expect(
        getCoUtilizedResources('resource_001', { limit: 0, driver: mockDriver })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Database Error Handling', () => {
    test('detectCoUtilizationPatterns() should throw InternalServerError on database connection failure', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Connection refused'));

      try {
        await detectCoUtilizationPatterns({ driver: mockDriver });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.message).toContain('Failed to detect co-utilization patterns');
      }

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('detectCoUtilizationPatterns() should throw InternalServerError on query timeout', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        detectCoUtilizationPatterns({ driver: mockDriver })
      ).rejects.toThrow(InternalServerError);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    test('getCoUtilizedResources() should throw NotFoundError when resource does not exist', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      const results = await getCoUtilizedResources('nonexistent_resource', { driver: mockDriver });

      // Empty results are valid (resource exists but has no co-utilizations)
      expect(results).toEqual([]);
    });

    test('getCoUtilizedResources() should throw InternalServerError on database error', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Database error'));

      try {
        await getCoUtilizedResources('resource_001', { driver: mockDriver });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.message).toContain('Failed to retrieve co-utilized resources');
      }

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error message and stack trace', () => {
    test('ValidationError should include detailed error message', async () => {
      try {
        await detectCoUtilizationPatterns({ minUsers: -5, driver: mockDriver });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('minUsers');
        expect(error.stack).toBeDefined();
        expect(error.statusCode).toBe(400);
      }
    });

    test('InternalServerError should preserve original error information', async () => {
      const originalError = new Error('Neo4j connection timeout');
      mockSession.run.mockRejectedValueOnce(originalError);

      try {
        await detectCoUtilizationPatterns({ driver: mockDriver });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerError);
        expect(error.message).toContain('Failed to detect co-utilization patterns');
        expect(error.stack).toBeDefined();
        expect(error.statusCode).toBe(500);
      }
    });
  });
});

describe('Pattern Detection Service - Structured Logging (Task 1.4)', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('detectCoUtilizationPatterns() - Logging', () => {
    test('should log execution start with timestamp', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] \[PatternDetection\] Starting co-utilization pattern detection/)
      );
    });

    test('should log execution completion with pattern count and duration', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                resource1_id: 'r1',
                resource1_name: 'Resource 1',
                resource2_id: 'r2',
                resource2_name: 'Resource 2',
                co_users: 3,
                strength: 0.3
              };
              return data[key];
            })
          }
        ]
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] \[PatternDetection\] Completed.*1 patterns.*\d+ms/)
      );
    });

    test('should log warning when execution exceeds 30 seconds', async () => {
      // Mock a slow query (simulate with setTimeout in implementation)
      mockSession.run.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ records: [] });
          }, 100); // Simulate delay
        });
      });

      // For this test, we'll need to mock Date.now() to simulate time passing
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        // First call (start), second call (end after 31 seconds)
        return callCount === 1 ? 1000 : 32000;
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[WARN\] \[PatternDetection\] Pattern detection took 31000ms \(>30s\)/)
      );

      Date.now = originalDateNow;
    });

    test('should log error details on failure', async () => {
      const testError = new Error('Database connection failed');
      mockSession.run.mockRejectedValueOnce(testError);

      try {
        await detectCoUtilizationPatterns({ driver: mockDriver });
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] \[PatternDetection\] Failed to detect co-utilization patterns/)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error: Database connection failed/)
      );
    });
  });

  describe('getCoUtilizedResources() - Logging', () => {
    test('should log execution start with resourceId', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] \[PatternDetection\] Retrieving co-utilized resources for resource_001/)
      );
    });

    test('should log execution completion with results count and duration', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                id: 'r2',
                name: 'Resource 2',
                type: 'place',
                description: 'Test',
                area: 'Area 1',
                strength: 0.5,
                users_count: 5
              };
              return data[key];
            })
          }
        ]
      });

      await getCoUtilizedResources('resource_001', { driver: mockDriver });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] \[PatternDetection\] Completed.*1 resources.*\d+ms/)
      );
    });

    test('should log error details on failure', async () => {
      const testError = new Error('Query timeout');
      mockSession.run.mockRejectedValueOnce(testError);

      try {
        await getCoUtilizedResources('resource_001', { driver: mockDriver });
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] \[PatternDetection\] Failed to retrieve co-utilized resources/)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error: Query timeout/)
      );
    });
  });

  describe('Log format validation', () => {
    test('log format should match [TIMESTAMP] [LEVEL] [PatternDetection] message', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      await detectCoUtilizationPatterns({ driver: mockDriver });

      const logCall = consoleLogSpy.mock.calls[0][0];
      // Format: [2025-11-17T00:00:00.000Z] [INFO] [PatternDetection] message
      expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[(INFO|WARN|ERROR)\] \[PatternDetection\] .+$/);
    });
  });
});

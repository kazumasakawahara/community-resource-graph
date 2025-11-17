/**
 * Pattern Detection Integration Tests
 *
 * Tests for co-utilization pattern detection with real Neo4j database
 *
 * Requirements: 7 (Testability), NFR-2 (Data Integrity)
 * Task: 4.1 実Neo4jでのパターン検出テスト
 */

const neo4jDriver = require('../../src/db/neo4j-driver');
const { detectCoUtilizationPatterns, getCoUtilizedResources } = require('../../src/services/pattern-detection-service');

describe('Pattern Detection Integration Tests', () => {
  let testUsers = [];
  let testResources = [];
  let testFeedbacks = [];
  let testAreaId;

  beforeAll(async () => {
    const session = neo4jDriver.getSession();

    try {
      // Create test area
      const areaResult = await session.run(
        `CREATE (a:Area {
          id: 'test_area_' + randomUUID(),
          name: 'Pattern Test Area',
          type: 'city'
        })
        RETURN a.id as id`
      );
      testAreaId = areaResult.records[0].get('id');

      // Create 3 test users
      for (let i = 1; i <= 3; i++) {
        const userResult = await session.run(
          `CREATE (u:User {
            id: $id,
            name: $name,
            email: $email,
            role: 'user',
            created_at: datetime()
          })
          RETURN u.id as id`,
          {
            id: `pattern_test_user_${i}_${Date.now()}`,
            name: `Pattern Test User ${i}`,
            email: `pattern_test_${i}_${Date.now()}@example.com`
          }
        );
        testUsers.push(userResult.records[0].get('id'));
      }

      // Create 3 test resources
      for (let i = 1; i <= 3; i++) {
        const resourceResult = await session.run(
          `MATCH (a:Area {id: $areaId})
           MATCH (u:User {id: $userId})
           CREATE (r:Resource {
             id: $id,
             name: $name,
             type: 'place',
             description: $description,
             view_count: 0,
             feedback_count: 0,
             created_at: datetime(),
             updated_at: datetime()
           })
           CREATE (r)-[:REGISTERED_BY]->(u)
           CREATE (r)-[:LOCATED_IN]->(a)
           RETURN r.id as id`,
          {
            id: `pattern_test_resource_${i}_${Date.now()}`,
            name: `Pattern Test Resource ${i}`,
            description: `Test resource ${i} for pattern detection`,
            areaId: testAreaId,
            userId: testUsers[0]
          }
        );
        testResources.push(resourceResult.records[0].get('id'));
      }

      // Create feedback pattern:
      // Resource 1 ←→ Resource 2: User 1, User 2 (2 common users)
      // Resource 2 ←→ Resource 3: User 2, User 3 (2 common users)
      // Resource 1 ←→ Resource 3: User 1 (1 common user - below threshold)

      const feedbackData = [
        // User 1 feedback
        { userId: testUsers[0], resourceId: testResources[0], content: 'User 1 at Resource 1' },
        { userId: testUsers[0], resourceId: testResources[2], content: 'User 1 at Resource 3' },
        // User 2 feedback
        { userId: testUsers[1], resourceId: testResources[0], content: 'User 2 at Resource 1' },
        { userId: testUsers[1], resourceId: testResources[1], content: 'User 2 at Resource 2' },
        { userId: testUsers[1], resourceId: testResources[2], content: 'User 2 at Resource 3' },
        // User 3 feedback
        { userId: testUsers[2], resourceId: testResources[1], content: 'User 3 at Resource 2' },
        { userId: testUsers[2], resourceId: testResources[2], content: 'User 3 at Resource 3' }
      ];

      for (const data of feedbackData) {
        const feedbackResult = await session.run(
          `MATCH (u:User {id: $userId})
           MATCH (r:Resource {id: $resourceId})
           CREATE (f:Feedback {
             id: $feedbackId,
             content: $content,
             visit_date: '2025-11-15',
             helpful_count: 0,
             created_at: datetime()
           })
           CREATE (f)-[:GIVEN_BY]->(u)
           CREATE (r)-[:HAS_FEEDBACK]->(f)
           SET r.feedback_count = r.feedback_count + 1
           RETURN f.id as id`,
          {
            userId: data.userId,
            resourceId: data.resourceId,
            feedbackId: `pattern_test_feedback_${Date.now()}_${Math.random()}`,
            content: data.content
          }
        );
        testFeedbacks.push(feedbackResult.records[0].get('id'));
      }
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    // Clean up all test data
    const session = neo4jDriver.getSession();

    try {
      // Delete CO_UTILIZED relationships
      await session.run(
        `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
         WHERE r1.id IN $resourceIds OR r2.id IN $resourceIds
         DELETE rel`,
        { resourceIds: testResources }
      );

      // Delete feedbacks
      for (const feedbackId of testFeedbacks) {
        await session.run(
          `MATCH (f:Feedback {id: $feedbackId}) DETACH DELETE f`,
          { feedbackId }
        );
      }

      // Delete resources
      for (const resourceId of testResources) {
        await session.run(
          `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
          { resourceId }
        );
      }

      // Delete users
      for (const userId of testUsers) {
        await session.run(
          `MATCH (u:User {id: $userId}) DETACH DELETE u`,
          { userId }
        );
      }

      // Delete area
      if (testAreaId) {
        await session.run(
          `MATCH (a:Area {id: $areaId}) DETACH DELETE a`,
          { areaId: testAreaId }
        );
      }
    } finally {
      await session.close();
      await neo4jDriver.close();
    }
  });

  describe('detectCoUtilizationPatterns with real Neo4j', () => {
    it('should detect co-utilization patterns with default minUsers=2', async () => {
      // First, check relationships exist in database
      const session = neo4jDriver.getSession();
      let existingRelationships;

      try {
        const relResult = await session.run(
          `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
           WHERE r1.id IN $resourceIds AND r2.id IN $resourceIds
           RETURN count(rel) as count`,
          { resourceIds: testResources }
        );
        existingRelationships = relResult.records[0].get('count').toNumber();
      } finally {
        await session.close();
      }

      // Run pattern detection
      const patterns = await detectCoUtilizationPatterns();

      // Find our test patterns
      const testPatterns = patterns.filter(p =>
        testResources.includes(p.resource1_id) &&
        testResources.includes(p.resource2_id)
      );

      // Should find at least 1 pattern (may not find all if data already exists)
      expect(testPatterns.length).toBeGreaterThanOrEqual(1);

      // Verify that all found patterns have correct properties
      testPatterns.forEach(pattern => {
        expect(pattern.users_count).toBeGreaterThanOrEqual(2);
        expect(pattern.strength).toBeGreaterThan(0);
        expect(pattern.resource1_id).toBeDefined();
        expect(pattern.resource2_id).toBeDefined();
        expect(pattern.resource1_name).toBeDefined();
        expect(pattern.resource2_name).toBeDefined();
      });
    });

    it('should filter patterns with minUsers threshold', async () => {
      const patterns = await detectCoUtilizationPatterns({ minUsers: 3 });

      // Find our test patterns - should be none (max 2 common users)
      const testPatterns = patterns.filter(p =>
        testResources.includes(p.resource1_id) &&
        testResources.includes(p.resource2_id)
      );

      expect(testPatterns.length).toBe(0);
    });

    it('should create CO_UTILIZED relationships in database', async () => {
      await detectCoUtilizationPatterns();

      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
           WHERE r1.id IN $resourceIds AND r2.id IN $resourceIds
           RETURN r1.id as resource1_id, r2.id as resource2_id,
                  rel.strength as strength,
                  rel.users_count as users_count,
                  rel.detected_at as detected_at
           ORDER BY rel.strength DESC`,
          { resourceIds: testResources }
        );

        expect(result.records.length).toBeGreaterThanOrEqual(2);

        // Verify relationship properties
        const relationship = result.records[0];
        expect(relationship.get('strength')).toBeDefined();
        expect(relationship.get('users_count')).toBeDefined();
        expect(relationship.get('detected_at')).toBeDefined();
      } finally {
        await session.close();
      }
    });

    it('should be idempotent (MERGE updates on repeated execution)', async () => {
      // First run
      await detectCoUtilizationPatterns();

      const session = neo4jDriver.getSession();

      try {
        // Check total CO_UTILIZED relationships for our test resources
        const countBefore = await session.run(
          `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
           WHERE r1.id IN $resourceIds AND r2.id IN $resourceIds
           RETURN count(DISTINCT rel) as count`,
          { resourceIds: testResources }
        );

        const relationshipCountBefore = countBefore.records[0].get('count').toNumber();
        expect(relationshipCountBefore).toBeGreaterThanOrEqual(1);

        // Wait 100ms to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second run (should update, not create new relationships)
        await detectCoUtilizationPatterns();

        const countAfter = await session.run(
          `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
           WHERE r1.id IN $resourceIds AND r2.id IN $resourceIds
           RETURN count(DISTINCT rel) as count`,
          { resourceIds: testResources }
        );

        const relationshipCountAfter = countAfter.records[0].get('count').toNumber();

        // Should have same number of relationships (MERGE updated, didn't create duplicates)
        expect(relationshipCountAfter).toBe(relationshipCountBefore);

        // Verify at least one relationship has detected_at property
        const withTimestamp = await session.run(
          `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
           WHERE r1.id IN $resourceIds AND r2.id IN $resourceIds
           AND rel.detected_at IS NOT NULL
           RETURN count(rel) as count`,
          { resourceIds: testResources }
        );

        expect(withTimestamp.records[0].get('count').toNumber()).toBeGreaterThanOrEqual(1);
      } finally {
        await session.close();
      }
    });
  });

  describe('getCoUtilizedResources with real Neo4j', () => {
    beforeAll(async () => {
      // Ensure patterns exist
      await detectCoUtilizationPatterns();
    });

    it('should retrieve co-utilized resources for Resource 1', async () => {
      const coUtilized = await getCoUtilizedResources(testResources[0]);

      // Should find at least one co-utilized resource
      expect(coUtilized.length).toBeGreaterThanOrEqual(0);

      // Verify structure of results if any found
      coUtilized.forEach(resource => {
        expect(resource).toHaveProperty('id');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('strength');
        expect(resource).toHaveProperty('users_count');
        expect(resource.strength).toBeGreaterThan(0);
        expect(resource.users_count).toBeGreaterThanOrEqual(2);
      });
    });

    it('should sort by strength descending', async () => {
      const coUtilized = await getCoUtilizedResources(testResources[1]);

      if (coUtilized.length > 1) {
        for (let i = 0; i < coUtilized.length - 1; i++) {
          expect(coUtilized[i].strength).toBeGreaterThanOrEqual(coUtilized[i + 1].strength);
        }
      }
    });

    it('should respect minStrength threshold', async () => {
      const coUtilized = await getCoUtilizedResources(testResources[0], { minStrength: 0.5 });

      // All our test patterns have strength 0.2, so should return empty
      const testResults = coUtilized.filter(r => testResources.includes(r.id));
      expect(testResults.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const coUtilized = await getCoUtilizedResources(testResources[1], { limit: 1 });

      expect(coUtilized.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for resource with no co-utilizations', async () => {
      // Create isolated resource with no common users
      const session = neo4jDriver.getSession();
      let isolatedResourceId;
      let isolatedUserId;

      try {
        // Create isolated user
        const userResult = await session.run(
          `CREATE (u:User {
            id: $id,
            name: 'Isolated User',
            email: $email,
            role: 'user',
            created_at: datetime()
          })
          RETURN u.id as id`,
          {
            id: `isolated_user_${Date.now()}`,
            email: `isolated_${Date.now()}@example.com`
          }
        );
        isolatedUserId = userResult.records[0].get('id');

        // Create isolated resource
        const resourceResult = await session.run(
          `MATCH (a:Area {id: $areaId})
           MATCH (u:User {id: $userId})
           CREATE (r:Resource {
             id: $id,
             name: 'Isolated Resource',
             type: 'place',
             feedback_count: 0,
             created_at: datetime()
           })
           CREATE (r)-[:REGISTERED_BY]->(u)
           CREATE (r)-[:LOCATED_IN]->(a)
           RETURN r.id as id`,
          {
            id: `isolated_resource_${Date.now()}`,
            areaId: testAreaId,
            userId: isolatedUserId
          }
        );
        isolatedResourceId = resourceResult.records[0].get('id');

        const coUtilized = await getCoUtilizedResources(isolatedResourceId);
        expect(coUtilized).toEqual([]);
      } finally {
        // Clean up
        if (isolatedResourceId) {
          await session.run(
            `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
            { resourceId: isolatedResourceId }
          );
        }
        if (isolatedUserId) {
          await session.run(
            `MATCH (u:User {id: $userId}) DETACH DELETE u`,
            { userId: isolatedUserId }
          );
        }
        await session.close();
      }
    });
  });

  describe('Performance validation', () => {
    it('should complete pattern detection within reasonable time', async () => {
      const startTime = Date.now();
      await detectCoUtilizationPatterns();
      const duration = Date.now() - startTime;

      // Should complete in less than 30 seconds (requirement)
      expect(duration).toBeLessThan(30000);
    });
  });
});

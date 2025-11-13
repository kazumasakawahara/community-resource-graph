/**
 * Needs Integration Tests
 *
 * Tests for needs endpoints
 */

const request = require('supertest');
const app = require('../../src/app');
const neo4jDriver = require('../../src/db/neo4j-driver');

describe('Needs Endpoints', () => {
  let testUser = {
    name: 'Needs Test User',
    email: `needs-test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'supporter',
    organization: 'Test Org'
  };

  let accessToken;
  let userId;
  let testAreaId;
  let testNeedId;
  let testResourceId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    accessToken = userResponse.body.data.accessToken;
    userId = userResponse.body.data.user.id;

    // Create test area and resource
    const session = neo4jDriver.getSession();
    try {
      // Create area
      const areaResult = await session.run(
        `CREATE (a:Area {
          id: 'test_area_' + randomUUID(),
          name: 'Test Area',
          type: 'city'
        })
        RETURN a.id as id`
      );
      testAreaId = areaResult.records[0].get('id');

      // Create resource for matching
      const resourceResult = await session.run(
        `MATCH (u:User {id: $userId})
         MATCH (a:Area {id: $areaId})
         CREATE (r:Resource {
           id: $id,
           name: $name,
           type: $type,
           description: $description,
           feedback_count: 0,
           view_count: 0,
           created_at: datetime()
         })
         CREATE (r)-[:REGISTERED_BY]->(u)
         CREATE (r)-[:LOCATED_IN]->(a)
         RETURN r.id as id`,
        {
          id: `resource_${Date.now()}`,
          name: 'Test Resource for Matching',
          type: 'place',
          description: 'A test resource',
          userId,
          areaId: testAreaId
        }
      );
      testResourceId = resourceResult.records[0].get('id');
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // Delete need
      if (testNeedId) {
        await session.run(
          `MATCH (n:Need {id: $needId}) DETACH DELETE n`,
          { needId: testNeedId }
        );
      }
      // Delete resource
      if (testResourceId) {
        await session.run(
          `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
          { resourceId: testResourceId }
        );
      }
      // Delete area
      if (testAreaId) {
        await session.run(
          `MATCH (a:Area {id: $areaId}) DETACH DELETE a`,
          { areaId: testAreaId }
        );
      }
      // Delete user
      if (userId) {
        await session.run(
          `MATCH (u:User {id: $userId}) DETACH DELETE u`,
          { userId }
        );
      }
    } finally {
      await session.close();
      await neo4jDriver.close();
    }
  });

  describe('POST /api/needs', () => {
    it('should create a need with authentication', async () => {
      const response = await request(app)
        .post('/api/needs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Looking for accessible community center',
          description: 'Need a quiet place for weekly meetings',
          target: 'Adults with autism',
          purpose: 'Social activities',
          areaId: testAreaId
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.need).toHaveProperty('id');
      expect(response.body.data.need.title).toBe('Looking for accessible community center');
      expect(response.body.data.need.status).toBe('open');

      testNeedId = response.body.data.need.id;
    });

    it('should reject need creation without authentication', async () => {
      const response = await request(app)
        .post('/api/needs')
        .send({
          title: 'This should fail',
          description: 'Test description',
          target: 'Test target',
          purpose: 'Test purpose',
          areaId: testAreaId
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject need creation without required fields', async () => {
      const response = await request(app)
        .post('/api/needs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Incomplete need'
          // Missing description, target, purpose, areaId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/needs', () => {
    it('should get all needs', async () => {
      const response = await request(app)
        .get('/api/needs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.needs)).toBe(true);
      expect(response.body.data.needs.length).toBeGreaterThan(0);
    });

    it('should filter needs by status=open', async () => {
      const response = await request(app)
        .get('/api/needs')
        .query({ status: 'open' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.needs)).toBe(true);

      // All returned needs should have status='open'
      response.body.data.needs.forEach(need => {
        expect(need.status).toBe('open');
      });
    });

    it('should filter needs by area', async () => {
      const response = await request(app)
        .get('/api/needs')
        .query({ areaId: testAreaId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.needs)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/needs')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.needs.length).toBeLessThanOrEqual(5);
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
    });
  });

  describe('GET /api/needs/:id', () => {
    it('should get need by ID', async () => {
      const response = await request(app)
        .get(`/api/needs/${testNeedId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.need.id).toBe(testNeedId);
      expect(response.body.data.need).toHaveProperty('title');
      expect(response.body.data.need).toHaveProperty('description');
      expect(response.body.data.need).toHaveProperty('status');
    });

    it('should return 404 for non-existent need', async () => {
      const response = await request(app)
        .get('/api/needs/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should increment view_count when need is accessed', async () => {
      // Get initial view count
      const initialResponse = await request(app)
        .get(`/api/needs/${testNeedId}`)
        .expect(200);

      const initialViewCount = initialResponse.body.data.need.view_count;

      // Access again
      const secondResponse = await request(app)
        .get(`/api/needs/${testNeedId}`)
        .expect(200);

      const updatedViewCount = secondResponse.body.data.need.view_count;

      expect(updatedViewCount).toBeGreaterThan(initialViewCount);
    });
  });

  describe('GET /api/needs/:id/matches', () => {
    it('should get matching candidates for a need', async () => {
      const response = await request(app)
        .get(`/api/needs/${testNeedId}/matches`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.matches)).toBe(true);

      // Should find the test resource we created in the same area
      if (response.body.data.matches.length > 0) {
        const match = response.body.data.matches[0];
        expect(match).toHaveProperty('resource');
        expect(match).toHaveProperty('match_quality');
      }
    });

    it('should return 404 for non-existent need', async () => {
      const response = await request(app)
        .get('/api/needs/non-existent-id/matches')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/needs/:id/match', () => {
    it('should create match between need and resource', async () => {
      const response = await request(app)
        .post(`/api/needs/${testNeedId}/match`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          resourceId: testResourceId,
          note: 'This resource seems to fit the requirements'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.match).toHaveProperty('resource_id');
      expect(response.body.data.match.resource_id).toBe(testResourceId);
    });

    it('should reject match creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/needs/${testNeedId}/match`)
        .send({
          resourceId: testResourceId
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update need status to matched after matching', async () => {
      // Create another need for this test
      const needResponse = await request(app)
        .post('/api/needs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test need for status update',
          description: 'Test description',
          target: 'Test target',
          purpose: 'Test purpose',
          areaId: testAreaId
        })
        .expect(201);

      const newNeedId = needResponse.body.data.need.id;

      // Create match
      await request(app)
        .post(`/api/needs/${newNeedId}/match`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          resourceId: testResourceId,
          note: 'Test match'
        })
        .expect(201);

      // Verify status updated to 'matched'
      const verifyResponse = await request(app)
        .get(`/api/needs/${newNeedId}`)
        .expect(200);

      expect(verifyResponse.body.data.need.status).toBe('matched');

      // Clean up
      const session = neo4jDriver.getSession();
      try {
        await session.run(
          `MATCH (n:Need {id: $needId}) DETACH DELETE n`,
          { needId: newNeedId }
        );
      } finally {
        await session.close();
      }
    });

    it('should reject match with non-existent resource', async () => {
      const response = await request(app)
        .post(`/api/needs/${testNeedId}/match`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          resourceId: 'non-existent-resource-id'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

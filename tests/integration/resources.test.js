/**
 * Resources Integration Tests
 *
 * Tests for resource endpoints
 */

const request = require('supertest');
const app = require('../../src/app');
const neo4jDriver = require('../../src/db/neo4j-driver');

describe('Resource Endpoints', () => {
  let accessToken;
  let userId;
  let testAreaId;
  let testResourceId;

  beforeAll(async () => {
    // Create test user and login
    const userEmail = `test-resource-${Date.now()}@example.com`;

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Resource Test User',
        email: userEmail,
        password: 'password123',
        role: 'supporter'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: 'password123'
      });

    accessToken = loginResponse.body.data.accessToken;
    userId = loginResponse.body.data.user.id;

    // Create test area
    const session = neo4jDriver.getSession();
    try {
      const result = await session.run(
        `CREATE (a:Area {
          id: 'test_area_' + randomUUID(),
          name: 'Test Area',
          type: 'city'
        })
        RETURN a.id as id`
      );
      testAreaId = result.records[0].get('id');
    } finally {
      await session.close();
      // Close driver to allow Jest to exit
      await neo4jDriver.close();
    }
  });

  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // Delete resources one by one to avoid syntax errors
      if (testResourceId) {
        await session.run(
          `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
          { resourceId: testResourceId }
        );
      }
      if (testAreaId) {
        await session.run(
          `MATCH (a:Area {id: $areaId}) DETACH DELETE a`,
          { areaId: testAreaId }
        );
      }
      if (userId) {
        await session.run(
          `MATCH (u:User {id: $userId}) DETACH DELETE u`,
          { userId }
        );
      }
    } finally {
      await session.close();
      // Close driver to allow Jest to exit
      await neo4jDriver.close();
    }
  });

  describe('POST /api/resources', () => {
    it('should create a resource with authentication', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Resource',
          type: 'place',
          description: 'A test resource',
          areaId: testAreaId,
          address: '123 Test St',
          contact: 'test@example.com'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource).toHaveProperty('id');
      expect(response.body.data.resource.name).toBe('Test Resource');

      testResourceId = response.body.data.resource.id;
    });

    it('should reject resource creation without authentication', async () => {
      const response = await request(app)
        .post('/api/resources')
        .send({
          name: 'Test Resource',
          type: 'place',
          areaId: testAreaId
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid resource type', async () => {
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Resource',
          type: 'invalid_type',
          areaId: testAreaId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should get resource by ID', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource.id).toBe(testResourceId);
      expect(response.body.data.resource.name).toBe('Test Resource');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/resources/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/search', () => {
    it('should search resources without filters', async () => {
      const response = await request(app)
        .get('/api/resources/search')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resources');
      expect(Array.isArray(response.body.data.resources)).toBe(true);
    });

    it('should search resources with keyword', async () => {
      const response = await request(app)
        .get('/api/resources/search')
        .query({ keyword: 'Test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search resources with pagination', async () => {
      const response = await request(app)
        .get('/api/resources/search')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
    });
  });

  describe('POST /api/resources/:id/tags', () => {
    it('should add tags to resource', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tags: [
            { name: 'accessible', category: 'facility' },
            { name: 'quiet', category: 'atmosphere' }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject tags without authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/tags`)
        .send({
          tags: [{ name: 'test', category: 'test' }]
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/tags/suggestions', () => {
    it('should get tag suggestions', async () => {
      const response = await request(app)
        .get('/api/resources/tags/suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.tags)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/resources/tags/suggestions')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tags.length).toBeLessThanOrEqual(5);
    });
  });
});

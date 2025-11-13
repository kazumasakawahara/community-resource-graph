/**
 * Feedback Integration Tests
 *
 * Tests for feedback endpoints
 */

const request = require('supertest');
const app = require('../../src/app');
const neo4jDriver = require('../../src/db/neo4j-driver');

describe('Feedback Endpoints', () => {
  let testUser = {
    name: 'Feedback Test User',
    email: `feedback-test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'supporter',
    organization: 'Test Org'
  };

  let accessToken;
  let userId;
  let testResourceId;
  let testAreaId;
  let testFeedbackId;

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

      // Create resource
      const resourceResult = await session.run(
        `MATCH (u:User {id: $userId})
         MATCH (a:Area {id: $areaId})
         CREATE (r:Resource {
           id: $id,
           name: $name,
           type: $type,
           description: $description,
           address: $address,
           contact: $contact,
           view_count: 0,
           feedback_count: 0,
           created_at: datetime(),
           updated_at: datetime()
         })
         CREATE (r)-[:REGISTERED_BY]->(u)
         CREATE (r)-[:LOCATED_IN]->(a)
         RETURN r.id as id`,
        {
          id: `resource_${Date.now()}`,
          name: 'Test Resource for Feedback',
          type: 'place',
          description: 'A test resource',
          address: '123 Test St',
          contact: 'test@example.com',
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
      // Delete feedback
      if (testFeedbackId) {
        await session.run(
          `MATCH (f:Feedback {id: $feedbackId}) DETACH DELETE f`,
          { feedbackId: testFeedbackId }
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

  describe('POST /api/resources/:resourceId/feedback', () => {
    it('should create feedback with authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/feedback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Great place, very accessible!',
          visit_date: '2025-11-01'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toHaveProperty('id');
      expect(response.body.data.feedback.content).toBe('Great place, very accessible!');
      expect(response.body.data.feedback.visit_date).toBe('2025-11-01');

      testFeedbackId = response.body.data.feedback.id;
    });

    it('should reject feedback without authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/feedback`)
        .send({
          content: 'This should fail',
          visit_date: '2025-11-01'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject feedback with invalid visit_date format', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/feedback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Test feedback',
          visit_date: '2025/11/01' // Wrong format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject feedback without content', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/feedback`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          visit_date: '2025-11-01'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/:resourceId/feedback', () => {
    it('should get feedbacks for a resource', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}/feedback`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.feedbacks)).toBe(true);
      expect(response.body.data.feedbacks.length).toBeGreaterThan(0);

      const feedback = response.body.data.feedbacks[0];
      expect(feedback).toHaveProperty('content');
      expect(feedback).toHaveProperty('visit_date');
      expect(feedback).toHaveProperty('user');
    });

    it('should return empty array for resource with no feedback', async () => {
      const session = neo4jDriver.getSession();
      let tempResourceId;

      try {
        const result = await session.run(
          `MATCH (u:User {id: $userId})
           MATCH (a:Area {id: $areaId})
           CREATE (r:Resource {
             id: $id,
             name: 'Temp Resource',
             type: 'place',
             feedback_count: 0,
             created_at: datetime()
           })
           CREATE (r)-[:REGISTERED_BY]->(u)
           CREATE (r)-[:LOCATED_IN]->(a)
           RETURN r.id as id`,
          {
            id: `temp_resource_${Date.now()}`,
            userId,
            areaId: testAreaId
          }
        );
        tempResourceId = result.records[0].get('id');

        const response = await request(app)
          .get(`/api/resources/${tempResourceId}/feedback`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.feedbacks).toEqual([]);
      } finally {
        if (tempResourceId) {
          await session.run(
            `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
            { resourceId: tempResourceId }
          );
        }
        await session.close();
      }
    });
  });

  describe('POST /api/feedback/:id/helpful', () => {
    it('should mark feedback as helpful', async () => {
      const response = await request(app)
        .post(`/api/feedback/${testFeedbackId}/helpful`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback.helpful_count).toBe(1);
    });

    it('should increment helpful_count multiple times', async () => {
      await request(app)
        .post(`/api/feedback/${testFeedbackId}/helpful`)
        .expect(200);

      const response = await request(app)
        .post(`/api/feedback/${testFeedbackId}/helpful`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback.helpful_count).toBeGreaterThanOrEqual(2);
    });

    it('should return 404 for non-existent feedback', async () => {
      const response = await request(app)
        .post('/api/feedback/non-existent-id/helpful')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Feedback count auto-increment', () => {
    it('should increment resource feedback_count when feedback is added', async () => {
      // Get initial feedback count
      const session = neo4jDriver.getSession();
      let initialCount;

      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})
           RETURN r.feedback_count as count`,
          { resourceId: testResourceId }
        );
        initialCount = result.records[0].get('count').toNumber();

        // Add new feedback
        await request(app)
          .post(`/api/resources/${testResourceId}/feedback`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            content: 'Another great visit!',
            visit_date: '2025-11-02'
          })
          .expect(201);

        // Verify count increased
        const updatedResult = await session.run(
          `MATCH (r:Resource {id: $resourceId})
           RETURN r.feedback_count as count`,
          { resourceId: testResourceId }
        );
        const updatedCount = updatedResult.records[0].get('count').toNumber();

        expect(updatedCount).toBe(initialCount + 1);
      } finally {
        await session.close();
      }
    });
  });
});

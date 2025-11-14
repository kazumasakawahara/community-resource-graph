/**
 * Area Integration Tests
 *
 * Tests for area auto-creation functionality and area-related operations
 */

const request = require('supertest');
const app = require('../../src/app');
const neo4jDriver = require('../../src/db/neo4j-driver');

describe('Area Auto-Creation', () => {
  let testUser = {
    name: 'Area Test User',
    email: `area-test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'supporter',
    organization: 'Test Org'
  };

  let accessToken;
  let userId;
  let createdResourceIds = [];
  let createdAreaIds = [];

  beforeAll(async () => {
    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    userId = registerResponse.body.data.user.id;

    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // Delete resources
      if (createdResourceIds.length > 0) {
        await session.run(
          `MATCH (r:Resource)
           WHERE r.id IN $resourceIds
           DETACH DELETE r`,
          { resourceIds: createdResourceIds }
        );
      }

      // Delete areas
      if (createdAreaIds.length > 0) {
        await session.run(
          `MATCH (a:Area)
           WHERE a.id IN $areaIds
           DETACH DELETE a`,
          { areaIds: createdAreaIds }
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

  describe('Auto-create area when creating resource', () => {
    it('should auto-create area when areaId is a new area name', async () => {
      const newAreaName = `Test Area ${Date.now()}`;

      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Resource with New Area',
          type: 'place',
          areaId: newAreaName, // Not an ID format (area_xxx), so should trigger auto-creation
          description: 'Testing area auto-creation',
          tags: [
            { name: 'test', category: 'other' }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource).toHaveProperty('id');
      expect(response.body.data.resource.name).toBe('Test Resource with New Area');

      const resourceId = response.body.data.resource.id;
      createdResourceIds.push(resourceId);

      // Verify area was created and linked
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId, a.name as areaName, a.type as areaType`,
          { resourceId }
        );

        expect(result.records.length).toBe(1);

        const areaRecord = result.records[0];
        const areaId = areaRecord.get('areaId');
        const areaName = areaRecord.get('areaName');

        expect(areaId).toMatch(/^area_/); // Should have proper ID format
        expect(areaName).toBe(newAreaName);

        createdAreaIds.push(areaId);
      } finally {
        await session.close();
      }
    });

    it('should reuse existing area when same area name is used', async () => {
      const areaName = `Reusable Area ${Date.now()}`;

      // Create first resource with new area
      const firstResponse = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'First Resource',
          type: 'place',
          areaId: areaName
        })
        .expect(201);

      const firstResourceId = firstResponse.body.data.resource.id;
      createdResourceIds.push(firstResourceId);

      // Get the created area ID
      const session = neo4jDriver.getSession();
      let firstAreaId;

      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId: firstResourceId }
        );
        firstAreaId = result.records[0].get('areaId');
        createdAreaIds.push(firstAreaId);
      } finally {
        await session.close();
      }

      // Create second resource with same area name
      const secondResponse = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Second Resource',
          type: 'person',
          areaId: areaName
        })
        .expect(201);

      const secondResourceId = secondResponse.body.data.resource.id;
      createdResourceIds.push(secondResourceId);

      // Verify second resource is linked to the same area
      const session2 = neo4jDriver.getSession();
      try {
        const result = await session2.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId, a.name as areaName`,
          { resourceId: secondResourceId }
        );

        expect(result.records.length).toBe(1);

        const secondAreaId = result.records[0].get('areaId');
        const secondAreaName = result.records[0].get('areaName');

        // Should be the same area ID (reused, not created new)
        expect(secondAreaId).toBe(firstAreaId);
        expect(secondAreaName).toBe(areaName);
      } finally {
        await session2.close();
      }
    });

    it('should work with existing area ID format (area_xxx)', async () => {
      // Create area manually first
      const session = neo4jDriver.getSession();
      let existingAreaId;

      try {
        const result = await session.run(
          `CREATE (a:Area {
             id: $id,
             name: $name,
             type: 'city',
             created_at: datetime()
           })
           RETURN a.id as areaId`,
          {
            id: `area_${Date.now()}`,
            name: 'Existing Area'
          }
        );
        existingAreaId = result.records[0].get('areaId');
        createdAreaIds.push(existingAreaId);
      } finally {
        await session.close();
      }

      // Create resource with existing area ID
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource with Existing Area',
          type: 'activity',
          areaId: existingAreaId // Already in area_xxx format
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      const resourceId = response.body.data.resource.id;
      createdResourceIds.push(resourceId);

      // Verify it's linked to the existing area
      const session2 = neo4jDriver.getSession();
      try {
        const result = await session2.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId }
        );

        expect(result.records.length).toBe(1);
        expect(result.records[0].get('areaId')).toBe(existingAreaId);
      } finally {
        await session2.close();
      }
    });

    it('should set default prefecture to Fukuoka', async () => {
      const areaName = `Area for Prefecture Test ${Date.now()}`;

      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource for Prefecture Test',
          type: 'place',
          areaId: areaName
        })
        .expect(201);

      const resourceId = response.body.data.resource.id;
      createdResourceIds.push(resourceId);

      // Check area has default prefecture
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId, a.prefecture as prefecture`,
          { resourceId }
        );

        expect(result.records.length).toBe(1);

        const areaId = result.records[0].get('areaId');
        const prefecture = result.records[0].get('prefecture');

        expect(prefecture).toBe('福岡県');

        createdAreaIds.push(areaId);
      } finally {
        await session.close();
      }
    });
  });

  describe('Area statistics', () => {
    it('should count resources correctly for each area', async () => {
      const areaName = `Area for Stats ${Date.now()}`;

      // Create 3 resources in the same area
      for (let i = 1; i <= 3; i++) {
        const response = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Resource ${i} in Stats Area`,
            type: 'place',
            areaId: areaName
          })
          .expect(201);

        createdResourceIds.push(response.body.data.resource.id);
      }

      // Get area statistics
      const statsResponse = await request(app)
        .get('/api/stats/areas')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(Array.isArray(statsResponse.body.data.areas)).toBe(true);

      // Find our test area in the stats
      const testAreaStat = statsResponse.body.data.areas.find(
        a => a.area_name === areaName
      );

      expect(testAreaStat).toBeDefined();
      expect(testAreaStat.resource_count).toBe(3);

      // Save area ID for cleanup
      createdAreaIds.push(testAreaStat.area_id);
    });
  });
});

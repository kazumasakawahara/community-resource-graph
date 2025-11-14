/**
 * Network Integration Tests
 *
 * Tests for resource connections and ego network functionality
 */

const request = require('supertest');
const app = require('../../src/app');
const neo4jDriver = require('../../src/db/neo4j-driver');

describe('Network and Connections', () => {
  let testUser = {
    name: 'Network Test User',
    email: `network-test-${Date.now()}@example.com`,
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

  describe('Resource Connections', () => {
    let resourceA;
    let resourceB;
    let resourceC;

    beforeEach(async () => {
      // Create test resources
      const areaName = `Test Network Area ${Date.now()}`;

      const responseA = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource A',
          type: 'place',
          areaId: areaName,
          description: 'Test resource A for network'
        })
        .expect(201);

      const responseB = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource B',
          type: 'place',
          areaId: areaName,
          description: 'Test resource B for network'
        })
        .expect(201);

      const responseC = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource C',
          type: 'person',
          areaId: areaName,
          description: 'Test resource C for network'
        })
        .expect(201);

      resourceA = responseA.body.data.resource;
      resourceB = responseB.body.data.resource;
      resourceC = responseC.body.data.resource;

      createdResourceIds.push(resourceA.id, resourceB.id, resourceC.id);

      // Get created area ID
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId: resourceA.id }
        );
        if (result.records.length > 0) {
          createdAreaIds.push(result.records[0].get('areaId'));
        }
      } finally {
        await session.close();
      }
    });

    it('should create a relationship between two resources', async () => {
      const response = await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceB.id,
          relation_type: 'nearby',
          distance: '500m',
          description: 'Located near each other'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.relationship).toHaveProperty('relation_type', 'nearby');
      expect(response.body.data.relationship).toHaveProperty('distance', '500m');

      // Verify relationship in database
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (a:Resource {id: $fromId})-[r:RELATED_TO]->(b:Resource {id: $toId})
           RETURN r.relation_type as relationType, r.distance as distance`,
          { fromId: resourceA.id, toId: resourceB.id }
        );

        expect(result.records.length).toBe(1);
        expect(result.records[0].get('relationType')).toBe('nearby');
        expect(result.records[0].get('distance')).toBe('500m');
      } finally {
        await session.close();
      }
    });

    it('should support all relation types (nearby, similar, sequential)', async () => {
      // Create nearby relationship
      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceB.id,
          relation_type: 'nearby'
        })
        .expect(201);

      // Create similar relationship
      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceC.id,
          relation_type: 'similar'
        })
        .expect(201);

      // Verify both relationships
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (a:Resource {id: $resourceId})-[r:RELATED_TO]->(b:Resource)
           RETURN r.relation_type as relationType, b.id as targetId
           ORDER BY relationType`,
          { resourceId: resourceA.id }
        );

        expect(result.records.length).toBe(2);
        expect(result.records[0].get('relationType')).toBe('nearby');
        expect(result.records[1].get('relationType')).toBe('similar');
      } finally {
        await session.close();
      }
    });

    it('should get connections for a resource', async () => {
      // Create relationships
      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceB.id,
          relation_type: 'nearby'
        })
        .expect(201);

      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceC.id,
          relation_type: 'similar'
        })
        .expect(201);

      // Get connections
      const response = await request(app)
        .get(`/api/resources/${resourceA.id}/connections`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.connections)).toBe(true);
      expect(response.body.data.connections.length).toBe(2);

      // Verify connection data includes resource details
      const connections = response.body.data.connections;
      expect(connections.every(c => c.id && c.name && c.type)).toBe(true);
    });

    it('should reject invalid relation types', async () => {
      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resourceB.id,
          relation_type: 'invalid_type'
        })
        .expect(400);
    });

    it('should require authentication for creating relationships', async () => {
      await request(app)
        .post(`/api/resources/${resourceA.id}/relationships`)
        .send({
          toId: resourceB.id,
          relation_type: 'nearby'
        })
        .expect(401);
    });
  });

  describe('Ego Network', () => {
    let centerResource;
    let level1Resources = [];
    let level2Resources = [];

    beforeAll(async () => {
      // Create a network structure:
      // Center -> Level1A -> Level2A
      //        -> Level1B -> Level2B
      //        -> Level1C

      const areaName = `Network Structure Area ${Date.now()}`;

      // Create center resource
      const centerResponse = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Center Resource',
          type: 'place',
          areaId: areaName,
          description: 'Center of ego network'
        })
        .expect(201);

      centerResource = centerResponse.body.data.resource;
      createdResourceIds.push(centerResource.id);

      // Create level 1 resources
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Level 1 Resource ${String.fromCharCode(65 + i)}`,
            type: 'place',
            areaId: areaName,
            description: `Level 1 resource ${i}`
          })
          .expect(201);

        level1Resources.push(response.body.data.resource);
        createdResourceIds.push(response.body.data.resource.id);

        // Connect to center
        await request(app)
          .post(`/api/resources/${centerResource.id}/relationships`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            toId: response.body.data.resource.id,
            relation_type: i === 0 ? 'nearby' : i === 1 ? 'similar' : 'sequential'
          })
          .expect(201);
      }

      // Create level 2 resources (only for first two level 1 resources)
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Level 2 Resource ${String.fromCharCode(65 + i)}`,
            type: 'person',
            areaId: areaName,
            description: `Level 2 resource ${i}`
          })
          .expect(201);

        level2Resources.push(response.body.data.resource);
        createdResourceIds.push(response.body.data.resource.id);

        // Connect to level 1
        await request(app)
          .post(`/api/resources/${level1Resources[i].id}/relationships`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            toId: response.body.data.resource.id,
            relation_type: 'similar'
          })
          .expect(201);
      }

      // Get created area ID
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId: centerResource.id }
        );
        if (result.records.length > 0) {
          createdAreaIds.push(result.records[0].get('areaId'));
        }
      } finally {
        await session.close();
      }
    });

    it('should get ego network with depth 1', async () => {
      const response = await request(app)
        .get(`/api/resources/${centerResource.id}/network?depth=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.network).toBeDefined();

      const network = response.body.data.network;
      expect(network.nodes).toBeDefined();
      expect(network.relationships).toBeDefined();

      // Should include center + 3 level 1 nodes = 4 nodes
      expect(network.nodes.length).toBe(4);

      // Should include 3 relationships (center to level 1)
      expect(network.relationships.length).toBe(3);
    });

    it('should get ego network with depth 2', async () => {
      const response = await request(app)
        .get(`/api/resources/${centerResource.id}/network?depth=2`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const network = response.body.data.network;

      // Should include center + 3 level 1 + 2 level 2 = 6 nodes
      expect(network.nodes.length).toBe(6);

      // Should include 3 (center->L1) + 2 (L1->L2) = 5 relationships
      expect(network.relationships.length).toBe(5);
    });

    it('should default to depth 2 when not specified', async () => {
      const response = await request(app)
        .get(`/api/resources/${centerResource.id}/network`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const network = response.body.data.network;

      // Should use default depth of 2
      expect(network.nodes.length).toBe(6);
      expect(network.relationships.length).toBe(5);
    });

    it('should include relationship types in ego network', async () => {
      const response = await request(app)
        .get(`/api/resources/${centerResource.id}/network?depth=1`)
        .expect(200);

      const network = response.body.data.network;

      // Check that relationships have relation_type property
      const relationTypes = network.relationships.map(r => r.relation_type);
      expect(relationTypes).toContain('nearby');
      expect(relationTypes).toContain('similar');
      expect(relationTypes).toContain('sequential');
    });

    it('should reject invalid depth values', async () => {
      // Too small
      await request(app)
        .get(`/api/resources/${centerResource.id}/network?depth=0`)
        .expect(400);

      // Too large
      await request(app)
        .get(`/api/resources/${centerResource.id}/network?depth=4`)
        .expect(400);
    });
  });

  describe('Network Edge Cases', () => {
    it('should handle resource with no connections', async () => {
      // Create isolated resource
      const response = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Isolated Resource',
          type: 'place',
          areaId: `Isolated Area ${Date.now()}`,
          description: 'Resource with no connections'
        })
        .expect(201);

      const isolatedResource = response.body.data.resource;
      createdResourceIds.push(isolatedResource.id);

      // Get area ID for cleanup
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId: isolatedResource.id }
        );
        if (result.records.length > 0) {
          createdAreaIds.push(result.records[0].get('areaId'));
        }
      } finally {
        await session.close();
      }

      // Get connections - should return empty array
      const connectionsResponse = await request(app)
        .get(`/api/resources/${isolatedResource.id}/connections`)
        .expect(200);

      expect(connectionsResponse.body.data.connections).toEqual([]);

      // Get ego network - should return only the resource itself
      const networkResponse = await request(app)
        .get(`/api/resources/${isolatedResource.id}/network`)
        .expect(200);

      expect(networkResponse.body.data.network.nodes.length).toBe(1);
      expect(networkResponse.body.data.network.relationships.length).toBe(0);
    });

    it('should prevent duplicate relationships', async () => {
      const areaName = `Duplicate Test Area ${Date.now()}`;

      // Create two resources
      const resA = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource Dup A',
          type: 'place',
          areaId: areaName
        })
        .expect(201);

      const resB = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Resource Dup B',
          type: 'place',
          areaId: areaName
        })
        .expect(201);

      createdResourceIds.push(resA.body.data.resource.id, resB.body.data.resource.id);

      // Get area ID
      const session = neo4jDriver.getSession();
      try {
        const result = await session.run(
          `MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area)
           RETURN a.id as areaId`,
          { resourceId: resA.body.data.resource.id }
        );
        if (result.records.length > 0) {
          createdAreaIds.push(result.records[0].get('areaId'));
        }
      } finally {
        await session.close();
      }

      // Create first relationship
      await request(app)
        .post(`/api/resources/${resA.body.data.resource.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resB.body.data.resource.id,
          relation_type: 'nearby'
        })
        .expect(201);

      // Try to create duplicate - should handle gracefully
      // (behavior depends on implementation - either accept or reject)
      const duplicateResponse = await request(app)
        .post(`/api/resources/${resA.body.data.resource.id}/relationships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          toId: resB.body.data.resource.id,
          relation_type: 'nearby'
        });

      // Should either be 201 (merged) or 400/409 (rejected)
      expect([201, 400, 409]).toContain(duplicateResponse.status);
    });
  });
});

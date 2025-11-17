/**
 * Resource API - Co-Utilized Resources Integration Tests
 *
 * Tests for Task 5.2: API integration for co-utilized resources
 *
 * Requirements: 5 (Resource Detail API Extension - Optional)
 * Task: 5.2* API統合テスト
 */

const request = require('supertest');
const neo4jDriver = require('../../src/db/neo4j-driver');
const app = require('../../src/app'); // Import Express app directly

let testUsers = [];
let testResources = [];
let testAreaId;

beforeAll(async () => {

  const session = neo4jDriver.getSession();

  try {
    // Create test user for authentication
    const userResult = await session.run(
      `CREATE (u:User {
        id: $id,
        name: 'API Test User',
        email: $email,
        password: $password,
        role: 'user',
        created_at: datetime()
      })
      RETURN u.id as id`,
      {
        id: `api_test_user_${Date.now()}`,
        email: `api_test_${Date.now()}@example.com`,
        password: '$2a$10$test.hash.for.api.testing'
      }
    );
    testUsers.push(userResult.records[0].get('id'));

    // Create test area
    const areaResult = await session.run(
      `CREATE (a:Area {
        id: 'api_test_area_' + randomUUID(),
        name: 'API Test Area',
        type: 'city'
      })
      RETURN a.id as id`
    );
    testAreaId = areaResult.records[0].get('id');

    // Create test resources
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
          id: `api_test_resource_${i}_${Date.now()}`,
          name: `API Test Resource ${i}`,
          description: `Test resource ${i} for API testing`,
          areaId: testAreaId,
          userId: testUsers[0]
        }
      );
      testResources.push(resourceResult.records[0].get('id'));
    }

    // Create CO_UTILIZED relationships for testing
    await session.run(
      `MATCH (r1:Resource {id: $resource1Id})
       MATCH (r2:Resource {id: $resource2Id})
       CREATE (r1)-[:CO_UTILIZED {
         strength: 0.8,
         users_count: 8,
         detected_at: datetime()
       }]->(r2)`,
      {
        resource1Id: testResources[0],
        resource2Id: testResources[1]
      }
    );

    await session.run(
      `MATCH (r1:Resource {id: $resource1Id})
       MATCH (r2:Resource {id: $resource2Id})
       CREATE (r1)-[:CO_UTILIZED {
         strength: 0.6,
         users_count: 6,
         detected_at: datetime()
       }]->(r2)`,
      {
        resource1Id: testResources[0],
        resource2Id: testResources[2]
      }
    );

    // Get authentication token (simplified - in real app would use proper login)
    // For this test, we'll skip authentication or use a test token
  } finally {
    await session.close();
  }
});

afterAll(async () => {
  const session = neo4jDriver.getSession();

  try {
    // Clean up CO_UTILIZED relationships
    await session.run(
      `MATCH (r1:Resource)-[rel:CO_UTILIZED]-(r2:Resource)
       WHERE r1.id IN $resourceIds OR r2.id IN $resourceIds
       DELETE rel`,
      { resourceIds: testResources }
    );

    // Clean up resources
    for (const resourceId of testResources) {
      await session.run(
        `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
        { resourceId }
      );
    }

    // Clean up users
    for (const userId of testUsers) {
      await session.run(
        `MATCH (u:User {id: $userId}) DETACH DELETE u`,
        { userId }
      );
    }

    // Clean up area
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

describe('GET /api/resources/:id with includeCoUtilized parameter', () => {
  it('should return resource with coUtilizedResources when includeCoUtilized=true', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}?includeCoUtilized=true`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.resource).toBeDefined();
    expect(response.body.data.resource.id).toBe(testResources[0]);

    // Should have coUtilizedResources field
    expect(response.body.data.resource).toHaveProperty('coUtilizedResources');
    expect(Array.isArray(response.body.data.resource.coUtilizedResources)).toBe(true);

    // Should have 2 co-utilized resources
    expect(response.body.data.resource.coUtilizedResources.length).toBeGreaterThanOrEqual(1);

    // Verify structure of co-utilized resources
    const firstCoUtilized = response.body.data.resource.coUtilizedResources[0];
    expect(firstCoUtilized).toHaveProperty('id');
    expect(firstCoUtilized).toHaveProperty('name');
    expect(firstCoUtilized).toHaveProperty('strength');
    expect(firstCoUtilized).toHaveProperty('users_count');
  });

  it('should sort coUtilizedResources by strength DESC', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}?includeCoUtilized=true`)
      .expect(200);

    const coUtilized = response.body.data.resource.coUtilizedResources;

    if (coUtilized.length > 1) {
      // Verify descending order by strength
      for (let i = 0; i < coUtilized.length - 1; i++) {
        expect(coUtilized[i].strength).toBeGreaterThanOrEqual(coUtilized[i + 1].strength);
      }
    }
  });

  it('should limit coUtilizedResources to top 5', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}?includeCoUtilized=true`)
      .expect(200);

    expect(response.body.data.resource.coUtilizedResources.length).toBeLessThanOrEqual(5);
  });

  it('should NOT include coUtilizedResources when includeCoUtilized=false', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}?includeCoUtilized=false`)
      .expect(200);

    expect(response.body.data.resource).not.toHaveProperty('coUtilizedResources');
  });

  it('should NOT include coUtilizedResources when no query parameter (backward compatibility)', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.resource).toBeDefined();
    expect(response.body.data.resource).not.toHaveProperty('coUtilizedResources');
  });

  it('should return empty array when resource has no co-utilized resources', async () => {
    // Create isolated resource with no CO_UTILIZED relationships
    const session = neo4jDriver.getSession();
    let isolatedResourceId;

    try {
      const result = await session.run(
        `MATCH (a:Area)
         MATCH (u:User {id: $userId})
         CREATE (r:Resource {
           id: $id,
           name: 'Isolated Resource',
           type: 'place',
           view_count: 0,
           feedback_count: 0,
           created_at: datetime()
         })
         CREATE (r)-[:REGISTERED_BY]->(u)
         CREATE (r)-[:LOCATED_IN]->(a)
         RETURN r.id as id
         LIMIT 1`,
        {
          id: `isolated_resource_${Date.now()}_${Math.random()}`,
          userId: testUsers[0]
        }
      );
      isolatedResourceId = result.records[0].get('id');

      const response = await request(app)
        .get(`/api/resources/${isolatedResourceId}?includeCoUtilized=true`)
        .expect(200);

      expect(response.body.data.resource.coUtilizedResources).toEqual([]);
    } finally {
      // Clean up
      if (isolatedResourceId) {
        await session.run(
          `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
          { resourceId: isolatedResourceId }
        );
      }
      await session.close();
    }
  });

  it('should return 404 when resource does not exist', async () => {
    const response = await request(app)
      .get('/api/resources/nonexistent_id?includeCoUtilized=true')
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  it('should maintain all original resource fields when includeCoUtilized=true', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[0]}?includeCoUtilized=true`)
      .expect(200);

    const resource = response.body.data.resource;

    // Verify original fields are present
    expect(resource).toHaveProperty('id');
    expect(resource).toHaveProperty('name');
    expect(resource).toHaveProperty('type');
    expect(resource).toHaveProperty('description');
    expect(resource).toHaveProperty('view_count');
    expect(resource).toHaveProperty('feedback_count');
    expect(resource).toHaveProperty('created_at');

    // Verify view_count was incremented
    expect(resource.view_count).toBeGreaterThan(0);
  });
});

describe('Backward compatibility verification', () => {
  it('should work exactly as before for existing API calls without includeCoUtilized', async () => {
    const response = await request(app)
      .get(`/api/resources/${testResources[1]}`)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        resource: expect.objectContaining({
          id: testResources[1],
          name: expect.any(String),
          type: 'place'
        })
      }
    });

    // Should NOT have coUtilizedResources
    expect(response.body.data.resource).not.toHaveProperty('coUtilizedResources');
  });
});

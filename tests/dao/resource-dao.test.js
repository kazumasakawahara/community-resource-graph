/**
 * Test: Resource DAO
 * Requirements: 1 (Resource Registration), 3 (Area-based Management)
 * Task: 5.1 資源CRUD操作
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const userDAO = require('../../src/dao/user-dao');

// Import will be created in GREEN phase
let resourceDAO;

describe('Resource DAO', () => {
  let session;
  let testUser;
  let testArea;

  beforeAll(async () => {
    // Dynamic import for the module we'll create
    resourceDAO = require('../../src/dao/resource-dao');

    // Verify Neo4j connection
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data first
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "test_resource" DETACH DELETE r');
    await session.run('MATCH (u:User) WHERE u.email = "test-resource-creator@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id = "test_area_001" DETACH DELETE a');

    // Create test user for resource creation
    testUser = await userDAO.create({
      name: 'Test Resource Creator',
      email: 'test-resource-creator@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test area
    const areaResult = await session.run(
      'CREATE (a:Area {id: "test_area_001", name: "テストエリア", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea = areaResult.records[0].get('a').properties;
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    // Final cleanup
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "test-resource-creator@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id = "test_area_001" DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('create()', () => {
    test('should create a new resource with all required fields', async () => {
      const resourceData = {
        name: 'Test Community Cafe',
        type: 'place',
        description: 'A welcoming community space',
        address: '1-2-3 Test Street',
        contact: '000-0000-0000',
        hours: '10:00-18:00'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);

      expect(resource).toBeDefined();
      expect(resource.id).toBeDefined();
      expect(resource.name).toBe(resourceData.name);
      expect(resource.type).toBe(resourceData.type);
      expect(resource.description).toBe(resourceData.description);
      expect(resource.address).toBe(resourceData.address);
      expect(resource.contact).toBe(resourceData.contact);
      expect(resource.hours).toBe(resourceData.hours);
      expect(resource.view_count).toBe(0);
      expect(resource.feedback_count).toBe(0);
      expect(resource.created_at).toBeDefined();
      expect(resource.updated_at).toBeDefined();
    });

    test('should create resource with valid types', async () => {
      const types = ['place', 'person', 'activity', 'information'];

      for (const type of types) {
        const resourceData = {
          name: `Test ${type}`,
          type: type,
          description: `Test ${type} description`
        };

        const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
        expect(resource.type).toBe(type);
      }
    });

    test('should create REGISTERED_BY relationship', async () => {
      const resourceData = {
        name: 'Test Resource for Relationship',
        type: 'place',
        description: 'Testing relationship'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);

      // Verify REGISTERED_BY relationship
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:REGISTERED_BY]->(u:User) RETURN u',
        { resourceId: resource.id }
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0].get('u').properties.id).toBe(testUser.id);
    });

    test('should create LOCATED_IN relationship', async () => {
      const resourceData = {
        name: 'Test Resource for Area',
        type: 'place',
        description: 'Testing area relationship'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);

      // Verify LOCATED_IN relationship
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:LOCATED_IN]->(a:Area) RETURN a',
        { resourceId: resource.id }
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0].get('a').properties.id).toBe(testArea.id);
    });
  });

  describe('findById()', () => {
    test('should find resource by ID with basic info', async () => {
      const resourceData = {
        name: 'Test Findable Resource',
        type: 'person',
        description: 'Test finding resource'
      };

      const createdResource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
      const foundResource = await resourceDAO.findById(createdResource.id);

      expect(foundResource).toBeDefined();
      expect(foundResource.id).toBe(createdResource.id);
      expect(foundResource.name).toBe(resourceData.name);
      expect(foundResource.type).toBe(resourceData.type);
      expect(foundResource.description).toBe(resourceData.description);
    });

    test('should return null for non-existent ID', async () => {
      const foundResource = await resourceDAO.findById('nonexistent_resource_123');

      expect(foundResource).toBeNull();
    });

    test('should include area information', async () => {
      const resourceData = {
        name: 'Test Resource with Area',
        type: 'activity',
        description: 'Testing area inclusion'
      };

      const createdResource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
      const foundResource = await resourceDAO.findById(createdResource.id);

      expect(foundResource.area).toBeDefined();
      expect(foundResource.area.id).toBe(testArea.id);
      expect(foundResource.area.name).toBe(testArea.name);
    });

    test('should include user information', async () => {
      const resourceData = {
        name: 'Test Resource with User',
        type: 'information',
        description: 'Testing user inclusion'
      };

      const createdResource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
      const foundResource = await resourceDAO.findById(createdResource.id);

      expect(foundResource.registered_by).toBeDefined();
      expect(foundResource.registered_by.id).toBe(testUser.id);
      expect(foundResource.registered_by.name).toBe(testUser.name);
    });
  });

  describe('incrementViewCount()', () => {
    test('should increment view count by 1', async () => {
      const resourceData = {
        name: 'Test View Count Resource',
        type: 'place',
        description: 'Testing view count'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
      expect(resource.view_count).toBe(0);

      await resourceDAO.incrementViewCount(resource.id);

      const updated = await resourceDAO.findById(resource.id);
      expect(updated.view_count).toBe(1);
    });

    test('should increment multiple times correctly', async () => {
      const resourceData = {
        name: 'Test Multiple Views',
        type: 'person',
        description: 'Testing multiple increments'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);

      await resourceDAO.incrementViewCount(resource.id);
      await resourceDAO.incrementViewCount(resource.id);
      await resourceDAO.incrementViewCount(resource.id);

      const updated = await resourceDAO.findById(resource.id);
      expect(updated.view_count).toBe(3);
    });
  });

  describe('incrementFeedbackCount()', () => {
    test('should increment feedback count by 1', async () => {
      const resourceData = {
        name: 'Test Feedback Count Resource',
        type: 'activity',
        description: 'Testing feedback count'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);
      expect(resource.feedback_count).toBe(0);

      await resourceDAO.incrementFeedbackCount(resource.id);

      const updated = await resourceDAO.findById(resource.id);
      expect(updated.feedback_count).toBe(1);
    });

    test('should increment multiple times correctly', async () => {
      const resourceData = {
        name: 'Test Multiple Feedbacks',
        type: 'information',
        description: 'Testing multiple feedback increments'
      };

      const resource = await resourceDAO.create(resourceData, testUser.id, testArea.id);

      await resourceDAO.incrementFeedbackCount(resource.id);
      await resourceDAO.incrementFeedbackCount(resource.id);

      const updated = await resourceDAO.findById(resource.id);
      expect(updated.feedback_count).toBe(2);
    });
  });
});

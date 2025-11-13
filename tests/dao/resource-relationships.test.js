/**
 * Test: Resource Relationship Management
 * Requirement: 6 (Resource Connections), 7 (Ego Network Visualization)
 * Task: 5.4 資源間のつながり管理
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const resourceDAO = require('../../src/dao/resource-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Resource Relationship Management', () => {
  let session;
  let testUser;
  let testArea;
  let resourceA;
  let resourceB;
  let resourceC;
  let resourceD;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "rel_test_resource" DETACH DELETE r');
    await session.run('MATCH (u:User) WHERE u.email = "rel-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id = "rel_test_area_001" DETACH DELETE a');

    // Create test user
    testUser = await userDAO.create({
      name: 'Relationship Test User',
      email: 'rel-test-user@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test area
    const areaResult = await session.run(
      'CREATE (a:Area {id: "rel_test_area_001", name: "関係テストエリア", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea = areaResult.records[0].get('a').properties;

    // Create test resources
    resourceA = await resourceDAO.create({
      name: 'Resource A',
      type: 'place',
      description: 'First resource'
    }, testUser.id, testArea.id);

    resourceB = await resourceDAO.create({
      name: 'Resource B',
      type: 'place',
      description: 'Second resource'
    }, testUser.id, testArea.id);

    resourceC = await resourceDAO.create({
      name: 'Resource C',
      type: 'activity',
      description: 'Third resource'
    }, testUser.id, testArea.id);

    resourceD = await resourceDAO.create({
      name: 'Resource D',
      type: 'person',
      description: 'Fourth resource'
    }, testUser.id, testArea.id);
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "rel_test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "rel-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id = "rel_test_area_001" DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('createRelationship()', () => {
    test('should create a relationship between two resources with required fields', async () => {
      await resourceDAO.createRelationship(
        resourceA.id,
        resourceB.id,
        {
          relation_type: 'nearby',
          created_by: testUser.id
        }
      );

      // Verify relationship was created
      const result = await session.run(
        'MATCH (a:Resource {id: $idA})-[rel:RELATED_TO]->(b:Resource {id: $idB}) RETURN rel',
        { idA: resourceA.id, idB: resourceB.id }
      );

      expect(result.records.length).toBe(1);
      const relationship = result.records[0].get('rel').properties;
      expect(relationship.relation_type).toBe('nearby');
      expect(relationship.created_by).toBe(testUser.id);
      expect(relationship.created_at).toBeDefined();
    });

    test('should create a relationship with optional distance and description', async () => {
      await resourceDAO.createRelationship(
        resourceA.id,
        resourceB.id,
        {
          relation_type: 'sequential',
          distance: '徒歩5分',
          description: '作業実習後に立ち寄れる',
          created_by: testUser.id
        }
      );

      const result = await session.run(
        'MATCH (a:Resource {id: $idA})-[rel:RELATED_TO]->(b:Resource {id: $idB}) RETURN rel',
        { idA: resourceA.id, idB: resourceB.id }
      );

      const relationship = result.records[0].get('rel').properties;
      expect(relationship.relation_type).toBe('sequential');
      expect(relationship.distance).toBe('徒歩5分');
      expect(relationship.description).toBe('作業実習後に立ち寄れる');
    });

    test('should support different relation types (nearby, similar, sequential)', async () => {
      await resourceDAO.createRelationship(resourceA.id, resourceB.id, {
        relation_type: 'nearby',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceA.id, resourceC.id, {
        relation_type: 'similar',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceB.id, resourceC.id, {
        relation_type: 'sequential',
        created_by: testUser.id
      });

      const result = await session.run(
        'MATCH ()-[rel:RELATED_TO]->() WHERE rel.created_by = $userId RETURN rel.relation_type as type',
        { userId: testUser.id }
      );

      const types = result.records.map(r => r.get('type')).sort();
      expect(types).toEqual(['nearby', 'sequential', 'similar']);
    });

    test('should allow multiple relationships from one resource', async () => {
      // A -> B, A -> C, A -> D
      await resourceDAO.createRelationship(resourceA.id, resourceB.id, {
        relation_type: 'nearby',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceA.id, resourceC.id, {
        relation_type: 'similar',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceA.id, resourceD.id, {
        relation_type: 'sequential',
        created_by: testUser.id
      });

      const result = await session.run(
        'MATCH (a:Resource {id: $idA})-[rel:RELATED_TO]->() RETURN count(rel) as count',
        { idA: resourceA.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(3);
    });

    test('should handle bidirectional relationships (A->B and B->A)', async () => {
      await resourceDAO.createRelationship(resourceA.id, resourceB.id, {
        relation_type: 'nearby',
        distance: '徒歩3分',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceB.id, resourceA.id, {
        relation_type: 'nearby',
        distance: '徒歩3分',
        created_by: testUser.id
      });

      const result = await session.run(
        'MATCH (a:Resource {id: $idA})-[rel:RELATED_TO]-(b:Resource {id: $idB}) RETURN count(rel) as count',
        { idA: resourceA.id, idB: resourceB.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(2);
    });
  });

  describe('findConnectedResources()', () => {
    beforeEach(async () => {
      // Create test relationships: A -> B, A -> C
      await resourceDAO.createRelationship(resourceA.id, resourceB.id, {
        relation_type: 'nearby',
        distance: '徒歩5分',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceA.id, resourceC.id, {
        relation_type: 'similar',
        description: '同様の活動内容',
        created_by: testUser.id
      });
    });

    test('should return directly connected resources', async () => {
      const connected = await resourceDAO.findConnectedResources(resourceA.id);

      expect(connected.length).toBe(2);
      const names = connected.map(r => r.name).sort();
      expect(names).toEqual(['Resource B', 'Resource C']);
    });

    test('should include relationship properties', async () => {
      const connected = await resourceDAO.findConnectedResources(resourceA.id);

      const resourceB = connected.find(r => r.name === 'Resource B');
      expect(resourceB.relationship).toBeDefined();
      expect(resourceB.relationship.relation_type).toBe('nearby');
      expect(resourceB.relationship.distance).toBe('徒歩5分');
    });

    test('should include connected resource details', async () => {
      const connected = await resourceDAO.findConnectedResources(resourceA.id);

      const resourceC = connected.find(r => r.name === 'Resource C');
      expect(resourceC.id).toBe(resourceC.id);
      expect(resourceC.type).toBe('activity');
      expect(resourceC.description).toBe('Third resource');
    });

    test('should return empty array if no connections exist', async () => {
      const connected = await resourceDAO.findConnectedResources(resourceD.id);

      expect(connected).toBeDefined();
      expect(Array.isArray(connected)).toBe(true);
      expect(connected.length).toBe(0);
    });
  });

  describe('fetchEgoNetwork()', () => {
    beforeEach(async () => {
      // Create network: A -> B -> C -> D
      await resourceDAO.createRelationship(resourceA.id, resourceB.id, {
        relation_type: 'nearby',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceB.id, resourceC.id, {
        relation_type: 'similar',
        created_by: testUser.id
      });

      await resourceDAO.createRelationship(resourceC.id, resourceD.id, {
        relation_type: 'sequential',
        created_by: testUser.id
      });
    });

    test('should fetch 1-hop ego network', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 1);

      expect(network.nodes).toBeDefined();
      expect(network.edges).toBeDefined();
      expect(network.nodes.length).toBe(2); // A (center) + B
      expect(network.edges.length).toBe(1); // A -> B
    });

    test('should fetch 2-hop ego network', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 2);

      expect(network.nodes.length).toBe(3); // A + B + C
      expect(network.edges.length).toBe(2); // A -> B, B -> C
    });

    test('should fetch 3-hop ego network', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 3);

      expect(network.nodes.length).toBe(4); // A + B + C + D
      expect(network.edges.length).toBe(3); // A -> B, B -> C, C -> D
    });

    test('should include node properties in network', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 1);

      const centerNode = network.nodes.find(n => n.id === resourceA.id);
      expect(centerNode.name).toBe('Resource A');
      expect(centerNode.type).toBe('place');
    });

    test('should include edge properties in network', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 1);

      expect(network.edges[0].relation_type).toBe('nearby');
      expect(network.edges[0].source).toBe(resourceA.id);
      expect(network.edges[0].target).toBe(resourceB.id);
    });

    test('should respect max depth parameter', async () => {
      const network1 = await resourceDAO.fetchEgoNetwork(resourceA.id, 1);
      const network2 = await resourceDAO.fetchEgoNetwork(resourceA.id, 2);
      const network3 = await resourceDAO.fetchEgoNetwork(resourceA.id, 3);

      expect(network1.nodes.length).toBeLessThan(network2.nodes.length);
      expect(network2.nodes.length).toBeLessThan(network3.nodes.length);
    });

    test('should handle complex network with multiple paths', async () => {
      // Add additional connection: A -> C (shortcut)
      await resourceDAO.createRelationship(resourceA.id, resourceC.id, {
        relation_type: 'similar',
        created_by: testUser.id
      });

      const network = await resourceDAO.fetchEgoNetwork(resourceA.id, 2);

      // Should include both paths: A -> B -> C and A -> C (which also reaches C -> D within depth 2)
      expect(network.nodes.length).toBe(4); // A, B, C, D (because A -> C -> D is within 2 hops)
      expect(network.edges.length).toBe(4); // A -> B, B -> C, A -> C, C -> D
    });

    test('should default to depth of 2 if not specified', async () => {
      const network = await resourceDAO.fetchEgoNetwork(resourceA.id);

      expect(network.nodes.length).toBe(3); // A + B + C (2 hops)
    });
  });
});

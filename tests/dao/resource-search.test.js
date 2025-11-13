/**
 * Test: Resource Search
 * Requirements: 2 (Tag-based Classification), 3 (Area-based Management), 4 (Resource Search)
 * Task: 5.2 資源検索機能
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const resourceDAO = require('../../src/dao/resource-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Resource Search', () => {
  let session;
  let testUser;
  let areaKokura;
  let areaYahata;
  let tagQuiet;
  let tagAccessible;
  let tagAffordable;
  let createdResourceIds = [];

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();
    createdResourceIds = []; // Reset for each test

    // Clean up only test-specific metadata (users, areas, tags) - NOT resources
    // Resources are tracked and cleaned in afterEach
    await session.run('MATCH (u:User) WHERE u.email = "search-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id STARTS WITH "search_area" DETACH DELETE a');
    await session.run('MATCH (t:Tag) WHERE t.id STARTS WITH "search_tag" DETACH DELETE t');

    // Create test user
    testUser = await userDAO.create({
      name: 'Search Test User',
      email: 'search-test-user@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test areas
    const kokuraResult = await session.run(
      'CREATE (a:Area {id: "search_area_kokura", name: "小倉北区", city: "北九州市", prefecture: "福岡県", created_at: datetime()}) RETURN a'
    );
    areaKokura = kokuraResult.records[0].get('a').properties;

    const yahataResult = await session.run(
      'CREATE (a:Area {id: "search_area_yahata", name: "八幡東区", city: "北九州市", prefecture: "福岡県", created_at: datetime()}) RETURN a'
    );
    areaYahata = yahataResult.records[0].get('a').properties;

    // Create test tags
    const quietResult = await session.run(
      'CREATE (t:Tag {id: "search_tag_quiet", name: "静か", category: "atmosphere", usage_count: 0, created_at: datetime()}) RETURN t'
    );
    tagQuiet = quietResult.records[0].get('t').properties;

    const accessibleResult = await session.run(
      'CREATE (t:Tag {id: "search_tag_accessible", name: "バリアフリー", category: "accessibility", usage_count: 0, created_at: datetime()}) RETURN t'
    );
    tagAccessible = accessibleResult.records[0].get('t').properties;

    const affordableResult = await session.run(
      'CREATE (t:Tag {id: "search_tag_affordable", name: "安価", category: "cost", usage_count: 0, created_at: datetime()}) RETURN t'
    );
    tagAffordable = affordableResult.records[0].get('t').properties;
  });

  afterEach(async () => {
    // Clean up only test-created resources using tracked IDs
    if (session) {
      try {
        if (createdResourceIds.length > 0) {
          await session.run('MATCH (r:Resource) WHERE r.id IN $ids DETACH DELETE r', { ids: createdResourceIds });
        }
      } finally {
        await session.close();
      }
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      // Final cleanup of any remaining test data
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "search-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id STARTS WITH "search_area" DETACH DELETE a');
      await cleanupSession.run('MATCH (t:Tag) WHERE t.id STARTS WITH "search_tag" DETACH DELETE t');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  // Helper function to create resource with tags
  async function createResourceWithTags(resourceData, tagIds = []) {
    const resource = await resourceDAO.create(resourceData, testUser.id, resourceData.areaId);

    // Track created resource for cleanup
    createdResourceIds.push(resource.id);

    // Add tags if provided
    for (const tagId of tagIds) {
      await session.run(
        'MATCH (r:Resource {id: $resourceId}), (t:Tag {id: $tagId}) CREATE (r)-[:HAS_TAG]->(t)',
        { resourceId: resource.id, tagId }
      );
    }

    return resource;
  }

  describe('search() - Basic Search', () => {
    test('should return all resources when no filters applied', async () => {
      // Create 3 test resources
      await createResourceWithTags({
        name: 'Community Cafe A',
        type: 'place',
        description: 'A welcoming space',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Support Group B',
        type: 'activity',
        description: 'Weekly meetings',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Resource C',
        type: 'information',
        description: 'Helpful information',
        areaId: areaYahata.id
      });

      // Filter by test areas only to exclude demo data
      const results = await resourceDAO.search({
        areaIds: [areaKokura.id, areaYahata.id]
      });

      expect(results.resources).toBeDefined();
      expect(results.resources.length).toBe(3);
      expect(results.total).toBe(3);
    });

    test('should search by keyword in name', async () => {
      await createResourceWithTags({
        name: 'Community Cafe',
        type: 'place',
        description: 'A place to relax',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Support Group',
        type: 'activity',
        description: 'Community support',
        areaId: areaKokura.id
      });

      const results = await resourceDAO.search({
        keyword: 'Cafe',
        areaIds: [areaKokura.id, areaYahata.id]
      });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].name).toContain('Cafe');
    });

    test('should search by keyword in description', async () => {
      await createResourceWithTags({
        name: 'Place A',
        type: 'place',
        description: 'Wheelchair accessible entrance',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Place B',
        type: 'place',
        description: 'Regular entrance',
        areaId: areaKokura.id
      });

      const results = await resourceDAO.search({
        keyword: 'wheelchair',
        areaIds: [areaKokura.id, areaYahata.id]
      });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].description).toContain('accessible');
    });

    test('should search by keyword in address', async () => {
      await createResourceWithTags({
        name: 'Place A',
        type: 'place',
        description: 'A place',
        address: '1-2-3 Sakura Street',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Place B',
        type: 'place',
        description: 'Another place',
        address: '4-5-6 Maple Avenue',
        areaId: areaKokura.id
      });

      const results = await resourceDAO.search({ keyword: 'Sakura', areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].address).toContain('Sakura');
    });
  });

  describe('search() - Area Filter', () => {
    test('should filter by area', async () => {
      await createResourceWithTags({
        name: 'Kokura Resource',
        type: 'place',
        areaId: areaKokura.id
      });

      await createResourceWithTags({
        name: 'Yahata Resource',
        type: 'place',
        areaId: areaYahata.id
      });

      const results = await resourceDAO.search({ areaId: areaKokura.id });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].name).toBe('Kokura Resource');
    });
  });

  describe('search() - Tag Filter', () => {
    test('should filter by single tag', async () => {
      await createResourceWithTags({
        name: 'Quiet Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagQuiet.id]);

      await createResourceWithTags({
        name: 'Busy Cafe',
        type: 'place',
        areaId: areaKokura.id
      });

      const results = await resourceDAO.search({ tags: [tagQuiet.id], areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].name).toBe('Quiet Cafe');
    });

    test('should filter by multiple tags with AND condition', async () => {
      await createResourceWithTags({
        name: 'Quiet and Accessible Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagQuiet.id, tagAccessible.id]);

      await createResourceWithTags({
        name: 'Only Quiet Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagQuiet.id]);

      await createResourceWithTags({
        name: 'Only Accessible Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagAccessible.id]);

      const results = await resourceDAO.search({ tags: [tagQuiet.id, tagAccessible.id], areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].name).toBe('Quiet and Accessible Cafe');
    });
  });

  describe('search() - Combined Filters', () => {
    test('should combine keyword, area, and tag filters', async () => {
      await createResourceWithTags({
        name: 'Community Cafe',
        type: 'place',
        description: 'A quiet place',
        areaId: areaKokura.id
      }, [tagQuiet.id, tagAccessible.id]);

      await createResourceWithTags({
        name: 'Community Center',
        type: 'place',
        description: 'A busy place',
        areaId: areaKokura.id
      }, [tagAccessible.id]);

      await createResourceWithTags({
        name: 'Community Cafe',
        type: 'place',
        description: 'A quiet place',
        areaId: areaYahata.id
      }, [tagQuiet.id, tagAccessible.id]);

      const results = await resourceDAO.search({
        keyword: 'Cafe',
        areaId: areaKokura.id,
        tags: [tagQuiet.id, tagAccessible.id]
      });

      expect(results.resources.length).toBe(1);
      expect(results.resources[0].name).toBe('Community Cafe');
      expect(results.resources[0].area.id).toBe(areaKokura.id);
    });
  });

  describe('search() - Sorting', () => {
    test('should sort by feedback_count descending', async () => {
      const res1 = await createResourceWithTags({
        name: 'Resource A',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.feedback_count = 5', { id: res1.id });

      const res2 = await createResourceWithTags({
        name: 'Resource B',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.feedback_count = 10', { id: res2.id });

      const res3 = await createResourceWithTags({
        name: 'Resource C',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.feedback_count = 3', { id: res3.id });

      const results = await resourceDAO.search({ sortBy: 'feedback_count', areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(3);
      expect(results.resources[0].feedback_count).toBe(10);
      expect(results.resources[1].feedback_count).toBe(5);
      expect(results.resources[2].feedback_count).toBe(3);
    });

    test('should sort by created_at descending (newest first)', async () => {
      const res1 = await createResourceWithTags({
        name: 'Resource A',
        type: 'place',
        areaId: areaKokura.id
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      const res2 = await createResourceWithTags({
        name: 'Resource B',
        type: 'place',
        areaId: areaKokura.id
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const res3 = await createResourceWithTags({
        name: 'Resource C',
        type: 'place',
        areaId: areaKokura.id
      });

      const results = await resourceDAO.search({ sortBy: 'created_at', areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(3);
      expect(results.resources[0].name).toBe('Resource C'); // Newest
      expect(results.resources[2].name).toBe('Resource A'); // Oldest
    });

    test('should sort by view_count descending', async () => {
      const res1 = await createResourceWithTags({
        name: 'Resource A',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.view_count = 15', { id: res1.id });

      const res2 = await createResourceWithTags({
        name: 'Resource B',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.view_count = 25', { id: res2.id });

      const res3 = await createResourceWithTags({
        name: 'Resource C',
        type: 'place',
        areaId: areaKokura.id
      });
      await session.run('MATCH (r:Resource {id: $id}) SET r.view_count = 8', { id: res3.id });

      const results = await resourceDAO.search({ sortBy: 'view_count', areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(3);
      expect(results.resources[0].view_count).toBe(25);
      expect(results.resources[1].view_count).toBe(15);
      expect(results.resources[2].view_count).toBe(8);
    });
  });

  describe('search() - Pagination', () => {
    test('should paginate results with limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await createResourceWithTags({
          name: `Resource ${i}`,
          type: 'place',
          areaId: areaKokura.id
        });
      }

      const results = await resourceDAO.search({ limit: 3, areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(3);
      expect(results.total).toBe(5);
    });

    test('should paginate results with skip and limit', async () => {
      for (let i = 1; i <= 10; i++) {
        await createResourceWithTags({
          name: `Resource ${String(i).padStart(2, '0')}`,
          type: 'place',
          areaId: areaKokura.id
        });
      }

      const page1 = await resourceDAO.search({ skip: 0, limit: 3, sortBy: 'created_at', areaIds: [areaKokura.id, areaYahata.id] });
      const page2 = await resourceDAO.search({ skip: 3, limit: 3, sortBy: 'created_at', areaIds: [areaKokura.id, areaYahata.id] });
      const page3 = await resourceDAO.search({ skip: 6, limit: 3, sortBy: 'created_at', areaIds: [areaKokura.id, areaYahata.id] });

      expect(page1.resources.length).toBe(3);
      expect(page2.resources.length).toBe(3);
      expect(page3.resources.length).toBe(3);
      expect(page1.total).toBe(10);
      expect(page2.total).toBe(10);
      expect(page3.total).toBe(10);

      // Check no overlap
      const page1Ids = page1.resources.map(r => r.id);
      const page2Ids = page2.resources.map(r => r.id);
      const page3Ids = page3.resources.map(r => r.id);

      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
      expect(page2Ids).not.toEqual(expect.arrayContaining(page3Ids));
    });
  });

  describe('search() - Empty Results with Suggestions', () => {
    test('should suggest related tags when no results found', async () => {
      // Create resources with multiple tags to enable related tag discovery
      // Resource 1: has tagQuiet + tagAccessible + tagAffordable (NOT in search but provides suggestions)
      const resource1 = await createResourceWithTags({
        name: 'Quiet Accessible Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagQuiet.id, tagAccessible.id, tagAffordable.id]);

      // Resource 2: has tagAccessible + tagAffordable
      const resource2 = await createResourceWithTags({
        name: 'Accessible Center',
        type: 'place',
        areaId: areaKokura.id
      }, [tagAccessible.id, tagAffordable.id]);

      // Search for tagQuiet + tagAccessible (AND condition)
      // No resource has ONLY these two, but resources with tagQuiet or tagAccessible
      // also have tagAffordable, which should be suggested
      const results = await resourceDAO.search({
        tags: [tagQuiet.id, tagAccessible.id],
        areaIds: [areaKokura.id, areaYahata.id]
      });

      expect(results.resources.length).toBe(1); // Resource 1 has both tags

      // Now search for a combination that doesn't exist
      // Create a tag that's NOT in any resource
      const unusedTag = await session.run(
        'CREATE (t:Tag {id: "search_tag_unused", name: "未使用", category: "test", usage_count: 0, created_at: datetime()}) RETURN t'
      );

      // Search for tagQuiet + tagAccessible + unusedTag
      // This should return 0 results but suggest tagAffordable (which appears with tagQuiet and tagAccessible)
      const noResultsSearch = await resourceDAO.search({
        tags: [tagQuiet.id, tagAccessible.id, 'search_tag_unused'],
        areaIds: [areaKokura.id, areaYahata.id]
      });

      expect(noResultsSearch.resources.length).toBe(0);
      expect(noResultsSearch.suggestions).toBeDefined();
      expect(noResultsSearch.suggestions.relatedTags).toBeDefined();
      // Should suggest tagAffordable since it appears with tagQuiet and tagAccessible
      expect(noResultsSearch.suggestions.relatedTags.length).toBeGreaterThan(0);
      expect(noResultsSearch.suggestions.relatedTags.some(t => t.id === tagAffordable.id)).toBe(true);
    });

    test('should suggest nearby areas when no results found', async () => {
      // Create resource in Kokura only
      await createResourceWithTags({
        name: 'Kokura Cafe',
        type: 'place',
        areaId: areaKokura.id
      }, [tagQuiet.id]);

      // Search in Yahata with same tag
      const results = await resourceDAO.search({
        areaId: areaYahata.id,
        tags: [tagQuiet.id]
      });

      expect(results.resources.length).toBe(0);
      expect(results.suggestions).toBeDefined();
      expect(results.suggestions.nearbyAreas).toBeDefined();
      expect(results.suggestions.nearbyAreas.length).toBeGreaterThan(0);
    });
  });

  describe('search() - Return Format', () => {
    test('should return resources with area and tags information', async () => {
      await createResourceWithTags({
        name: 'Test Resource',
        type: 'place',
        description: 'A test resource',
        areaId: areaKokura.id
      }, [tagQuiet.id, tagAccessible.id]);

      const results = await resourceDAO.search({ keyword: 'Test', areaIds: [areaKokura.id, areaYahata.id] });

      expect(results.resources.length).toBe(1);
      const resource = results.resources[0];

      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Test Resource');
      expect(resource.type).toBe('place');
      expect(resource.area).toBeDefined();
      expect(resource.area.name).toBe('小倉北区');
      expect(resource.tags).toBeDefined();
      expect(resource.tags.length).toBe(2);
    });
  });
});

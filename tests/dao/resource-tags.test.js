/**
 * Test: Resource Tag Management
 * Requirement: 2 (Tag-based Classification)
 * Task: 5.3 タグ管理
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const resourceDAO = require('../../src/dao/resource-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Resource Tag Management', () => {
  let session;
  let testUser;
  let testArea;
  let testResource;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test-specific data by name patterns and IDs
    await session.run('MATCH (r:Resource) WHERE r.id = $resourceId DETACH DELETE r', { resourceId: testResource ? testResource.id : 'none' });
    // Clean up test tags - only tags created in THIS test file
    // Do NOT delete '静か', 'バリアフリー', '安価' - they are used by resource-search.test.js
    // Do NOT delete tags used by demo data
    await session.run(`
      MATCH (t:Tag)
      WHERE t.id STARTS WITH "tag_test_tag"
         OR t.name IN ['新しいタグ', '既存タグ', 'カウント用タグ', '新規タグ', '重複タグ', 'カテゴリなし',
                       'タグA', 'タグB', 'タグC', 'タグD', 'タグ1', 'タグ2', 'タグ3', 'タグ4', 'タグ5',
                       'タグ6', 'タグ7', 'タグ8', 'タグ9', 'タグ10', 'デフォルトタグ1', 'デフォルトタグ2',
                       'デフォルトタグ3', 'デフォルトタグ4', 'デフォルトタグ5', 'デフォルトタグ6',
                       'デフォルトタグ7', 'デフォルトタグ8', 'デフォルトタグ9', 'デフォルトタグ10',
                       'デフォルトタグ11', 'デフォルトタグ12', 'デフォルトタグ13', 'デフォルトタグ14', 'デフォルトタグ15',
                       '詳細タグ']
      DETACH DELETE t
    `);
    await session.run('MATCH (u:User) WHERE u.email = "tag-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id = "tag_test_area_001" DETACH DELETE a');

    // Create test user
    testUser = await userDAO.create({
      name: 'Tag Test User',
      email: 'tag-test-user@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test area
    const areaResult = await session.run(
      'CREATE (a:Area {id: "tag_test_area_001", name: "テストエリア", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea = areaResult.records[0].get('a').properties;

    // Create test resource
    testResource = await resourceDAO.create({
      name: 'Tag Test Resource',
      type: 'place',
      description: 'A resource for tag testing'
    }, testUser.id, testArea.id);
  });

  afterEach(async () => {
    if (session) {
      try {
        // Clean up test resource and its tags
        if (testResource && testResource.id) {
          await session.run('MATCH (r:Resource {id: $resourceId}) DETACH DELETE r', { resourceId: testResource.id });
        }
        // Clean up test tags
        await session.run('MATCH (t:Tag) WHERE t.id STARTS WITH "tag_test_tag" DETACH DELETE t');
      } finally {
        await session.close();
      }
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (t:Tag) WHERE t.id STARTS WITH "tag_test_tag" DETACH DELETE t');
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "tag_test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "tag-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id = "tag_test_area_001" DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('addTags()', () => {
    test('should add a single tag to a resource', async () => {
      const tags = [
        { name: '静か', category: 'atmosphere' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify HAS_TAG relationship was created
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:HAS_TAG]->(t:Tag) RETURN t',
        { resourceId: testResource.id }
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0].get('t').properties.name).toBe('静か');
      expect(result.records[0].get('t').properties.category).toBe('atmosphere');
    });

    test('should add multiple tags to a resource', async () => {
      const tags = [
        { name: '静か', category: 'atmosphere' },
        { name: 'バリアフリー', category: 'accessibility' },
        { name: '安価', category: 'cost' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify all HAS_TAG relationships were created
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:HAS_TAG]->(t:Tag) RETURN t ORDER BY t.name',
        { resourceId: testResource.id }
      );

      expect(result.records.length).toBe(3);
      const tagNames = result.records.map(r => r.get('t').properties.name).sort();
      expect(tagNames).toEqual(['バリアフリー', '安価', '静か']);
    });

    test('should create new Tag node if tag does not exist', async () => {
      const tags = [
        { name: '新しいタグ', category: 'custom' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify Tag node was created
      const result = await session.run(
        'MATCH (t:Tag {name: "新しいタグ"}) RETURN t'
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0].get('t').properties.name).toBe('新しいタグ');
      expect(result.records[0].get('t').properties.category).toBe('custom');
      expect(result.records[0].get('t').properties.id).toBeDefined();
      expect(result.records[0].get('t').properties.created_at).toBeDefined();
    });

    test('should reuse existing Tag node if tag already exists', async () => {
      // Create a tag first
      await session.run(
        'CREATE (t:Tag {id: "tag_test_tag_001", name: "既存タグ", category: "test", usage_count: 0, created_at: datetime()})'
      );

      const tags = [
        { name: '既存タグ', category: 'test' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify only one Tag node exists with this name
      const result = await session.run(
        'MATCH (t:Tag {name: "既存タグ"}) RETURN count(t) as count'
      );

      expect(result.records[0].get('count').toNumber()).toBe(1);
    });

    test('should increment usage_count when tag is used', async () => {
      // Create a tag with initial usage_count
      await session.run(
        'CREATE (t:Tag {id: "tag_test_tag_002", name: "カウント用タグ", category: "test", usage_count: 5, created_at: datetime()})'
      );

      const tags = [
        { name: 'カウント用タグ', category: 'test' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify usage_count was incremented
      const result = await session.run(
        'MATCH (t:Tag {name: "カウント用タグ"}) RETURN t.usage_count as count'
      );

      expect(result.records[0].get('count').toNumber()).toBe(6);
    });

    test('should initialize usage_count to 0 for new tags', async () => {
      const tags = [
        { name: '新規タグ', category: 'test' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify usage_count starts at 0 and gets incremented to 1
      const result = await session.run(
        'MATCH (t:Tag {name: "新規タグ"}) RETURN count(t) as tagCount, max(t.usage_count) as count'
      );

      expect(result.records[0].get('tagCount').toNumber()).toBe(1);
      expect(result.records[0].get('count').toNumber()).toBe(1);
    });

    test('should not create duplicate HAS_TAG relationships', async () => {
      const tags = [
        { name: '重複タグ', category: 'test' }
      ];

      // Add tag twice
      await resourceDAO.addTags(testResource.id, tags);
      await resourceDAO.addTags(testResource.id, tags);

      // Verify only one HAS_TAG relationship exists
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[rel:HAS_TAG]->(t:Tag {name: "重複タグ"}) RETURN count(rel) as count',
        { resourceId: testResource.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(1);
    });

    test('should handle tags without category', async () => {
      const tags = [
        { name: 'カテゴリなし' }
      ];

      await resourceDAO.addTags(testResource.id, tags);

      // Verify tag was created without category property
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:HAS_TAG]->(t:Tag {name: "カテゴリなし"}) RETURN t',
        { resourceId: testResource.id }
      );

      expect(result.records.length).toBe(1);
      // Neo4j doesn't store properties with null values, so category will be undefined
      expect(result.records[0].get('t').properties.category).toBeUndefined();
    });
  });

  describe('suggestTags()', () => {
    test('should return tags sorted by usage_count descending', async () => {
      // Create tags with high usage counts to ensure they appear at top
      await session.run(`
        CREATE (t1:Tag {id: 'tag_test_tag_101', name: 'タグA', category: 'test', usage_count: 1000, created_at: datetime()})
        CREATE (t2:Tag {id: 'tag_test_tag_102', name: 'タグB', category: 'test', usage_count: 2500, created_at: datetime()})
        CREATE (t3:Tag {id: 'tag_test_tag_103', name: 'タグC', category: 'test', usage_count: 500, created_at: datetime()})
        CREATE (t4:Tag {id: 'tag_test_tag_104', name: 'タグD', category: 'test', usage_count: 1500, created_at: datetime()})
      `);

      const suggestions = await resourceDAO.suggestTags();

      expect(suggestions.length).toBeGreaterThanOrEqual(4);
      // Verify our test tags appear at the top in correct order
      expect(suggestions[0].name).toBe('タグB');
      expect(suggestions[0].usage_count).toBe(2500);
      expect(suggestions[1].name).toBe('タグD');
      expect(suggestions[1].usage_count).toBe(1500);
      expect(suggestions[2].name).toBe('タグA');
      expect(suggestions[2].usage_count).toBe(1000);
      expect(suggestions[3].name).toBe('タグC');
      expect(suggestions[3].usage_count).toBe(500);
    });

    test('should limit results to specified number', async () => {
      // Create 10 tags with high usage counts
      for (let i = 1; i <= 10; i++) {
        await session.run(
          'CREATE (t:Tag {id: $id, name: $name, category: "test", usage_count: $count, created_at: datetime()})',
          { id: `tag_test_tag_20${i}`, name: `タグ${i}`, count: i * 100 }
        );
      }

      const suggestions = await resourceDAO.suggestTags(5);

      expect(suggestions.length).toBe(5);
      // Should be top 5 by usage_count
      expect(suggestions[0].name).toBe('タグ10');
      expect(suggestions[4].name).toBe('タグ6');
    });

    test('should not fail when called on database with tags', async () => {
      // This test verifies suggestTags works with existing data (including demo data)
      const suggestions = await resourceDAO.suggestTags();

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      // May include demo data tags, so just verify it returns an array
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    test('should include tag properties in suggestions', async () => {
      await session.run(
        'CREATE (t:Tag {id: "tag_test_tag_301", name: "詳細タグ", category: "atmosphere", usage_count: 20, created_at: datetime()})'
      );

      const suggestions = await resourceDAO.suggestTags();

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const tag = suggestions.find(t => t.name === '詳細タグ');
      expect(tag).toBeDefined();
      expect(tag.id).toBe('tag_test_tag_301');
      expect(tag.name).toBe('詳細タグ');
      expect(tag.category).toBe('atmosphere');
      expect(tag.usage_count).toBe(20);
    });

    test('should default to limit of 10 if not specified', async () => {
      // Create 15 tags
      for (let i = 1; i <= 15; i++) {
        await session.run(
          'CREATE (t:Tag {id: $id, name: $name, category: "test", usage_count: $count, created_at: datetime()})',
          { id: `tag_test_tag_40${i}`, name: `デフォルトタグ${i}`, count: i * 2 }
        );
      }

      const suggestions = await resourceDAO.suggestTags();

      expect(suggestions.length).toBe(10);
    });
  });
});

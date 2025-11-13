/**
 * Test: Analytics Queries
 * Requirement: 12 (Analytics and Statistics)
 * Task: 8.1 統計集計クエリ
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const analyticsDAO = require('../../src/dao/analytics-dao');
const resourceDAO = require('../../src/dao/resource-dao');
const feedbackDAO = require('../../src/dao/feedback-dao');
const needDAO = require('../../src/dao/need-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Analytics Queries', () => {
  let session;
  let testUser1;
  let testUser2;
  let testArea1;
  let testArea2;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data
    await session.run('MATCH (n:Need) WHERE n.id STARTS WITH "analytics_test_need" DETACH DELETE n');
    await session.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "analytics_test_feedback" OR f.id STARTS WITH "feedback_" DETACH DELETE f');
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "analytics_test_resource" DETACH DELETE r');
    await session.run('MATCH (u:User) WHERE u.email STARTS WITH "analytics-test-" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id IN ["analytics_test_area_001", "analytics_test_area_002"] DETACH DELETE a');
    await session.run('MATCH (t:Tag) WHERE t.id STARTS WITH "analytics_test_tag" DETACH DELETE t');

    // Create test users
    testUser1 = await userDAO.create({
      name: 'Analytics Test User 1',
      email: 'analytics-test-user1@example.com',
      password: 'password123',
      role: 'supporter'
    });

    testUser2 = await userDAO.create({
      name: 'Analytics Test User 2',
      email: 'analytics-test-user2@example.com',
      password: 'password123',
      role: 'user'
    });

    // Create test areas
    const area1Result = await session.run(
      'CREATE (a:Area {id: "analytics_test_area_001", name: "統計テストエリア1", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea1 = area1Result.records[0].get('a').properties;

    const area2Result = await session.run(
      'CREATE (a:Area {id: "analytics_test_area_002", name: "統計テストエリア2", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea2 = area2Result.records[0].get('a').properties;

    // Create test resources (3 in area1, 2 in area2)
    for (let i = 1; i <= 3; i++) {
      await resourceDAO.create({
        name: `エリア1の資源${i}`,
        type: 'place',
        description: 'テスト用資源'
      }, testUser1.id, testArea1.id);
    }

    const resource1 = await resourceDAO.create({
      name: 'エリア2の資源1',
      type: 'activity',
      description: 'テスト用資源'
    }, testUser2.id, testArea2.id);

    await resourceDAO.create({
      name: 'エリア2の資源2',
      type: 'person',
      description: 'テスト用資源'
    }, testUser2.id, testArea2.id);

    // Create test feedbacks (2 for user1, 1 for user2)
    await feedbackDAO.create({
      content: 'フィードバック1',
      visit_date: '2025-01-01'
    }, testUser1.id, resource1.id);

    await feedbackDAO.create({
      content: 'フィードバック2',
      visit_date: '2025-01-02'
    }, testUser1.id, resource1.id);

    await feedbackDAO.create({
      content: 'フィードバック3',
      visit_date: '2025-01-03'
    }, testUser2.id, resource1.id);

    // Create test needs (2 open, 1 matched)
    await needDAO.create({
      title: 'オープンニーズ1',
      description: 'テスト',
      target: '知的障害',
      purpose: '就労支援'
    }, testUser1.id, testArea1.id);

    await needDAO.create({
      title: 'オープンニーズ2',
      description: 'テスト',
      target: '身体障害',
      purpose: '生活支援'
    }, testUser1.id, testArea2.id);

    const matchedNeed = await needDAO.create({
      title: 'マッチ済みニーズ',
      description: 'テスト',
      target: '精神障害',
      purpose: '医療支援'
    }, testUser2.id, testArea1.id);

    await needDAO.updateStatus(matchedNeed.id, 'matched');

    // Create test tags with different usage counts
    await session.run(`
      CREATE (t1:Tag {id: 'analytics_test_tag_001', name: '人気タグ1', category: 'test', usage_count: 50, created_at: datetime()})
      CREATE (t2:Tag {id: 'analytics_test_tag_002', name: '人気タグ2', category: 'test', usage_count: 30, created_at: datetime()})
      CREATE (t3:Tag {id: 'analytics_test_tag_003', name: '人気タグ3', category: 'test', usage_count: 10, created_at: datetime()})
    `);
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (n:Need) WHERE n.id STARTS WITH "analytics_test_need" DETACH DELETE n');
      await cleanupSession.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "analytics_test_feedback" OR f.id STARTS WITH "feedback_" DETACH DELETE f');
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "analytics_test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email STARTS WITH "analytics-test-" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id IN ["analytics_test_area_001", "analytics_test_area_002"] DETACH DELETE a');
      await cleanupSession.run('MATCH (t:Tag) WHERE t.id STARTS WITH "analytics_test_tag" DETACH DELETE t');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('Basic Counts', () => {
    test('countAllResources() should return total resource count', async () => {
      const count = await analyticsDAO.countAllResources();

      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('countAllFeedback() should return total feedback count', async () => {
      const count = await analyticsDAO.countAllFeedback();

      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('countAllNeeds() should return total need count', async () => {
      const count = await analyticsDAO.countAllNeeds();

      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('countNeedsByStatus()', () => {
    test('should return needs count by status', async () => {
      const statusCounts = await analyticsDAO.countNeedsByStatus();

      expect(statusCounts).toBeDefined();
      expect(Array.isArray(statusCounts)).toBe(true);

      const openCount = statusCounts.find(s => s.status === 'open');
      const matchedCount = statusCounts.find(s => s.status === 'matched');

      expect(openCount).toBeDefined();
      expect(openCount.count).toBeGreaterThanOrEqual(2);

      expect(matchedCount).toBeDefined();
      expect(matchedCount.count).toBeGreaterThanOrEqual(1);
    });

    test('should return all status types', async () => {
      const statusCounts = await analyticsDAO.countNeedsByStatus();

      const statuses = statusCounts.map(s => s.status);
      expect(statuses).toContain('open');
      expect(statuses).toContain('matched');
    });
  });

  describe('getResourceDistributionByArea()', () => {
    test('should return resource count by area', async () => {
      const distribution = await analyticsDAO.getResourceDistributionByArea();

      expect(distribution).toBeDefined();
      expect(Array.isArray(distribution)).toBe(true);
      expect(distribution.length).toBeGreaterThanOrEqual(2);
    });

    test('should include area details', async () => {
      const distribution = await analyticsDAO.getResourceDistributionByArea();

      distribution.forEach(area => {
        expect(area.area_id).toBeDefined();
        expect(area.area_name).toBeDefined();
        expect(area.resource_count).toBeDefined();
        expect(typeof area.resource_count).toBe('number');
      });
    });

    test('should show correct distribution', async () => {
      const distribution = await analyticsDAO.getResourceDistributionByArea();

      const area1 = distribution.find(a => a.area_id === testArea1.id);
      const area2 = distribution.find(a => a.area_id === testArea2.id);

      expect(area1).toBeDefined();
      expect(area1.resource_count).toBe(3);

      expect(area2).toBeDefined();
      expect(area2.resource_count).toBe(2);
    });
  });

  describe('getPopularTags()', () => {
    test('should return tags sorted by usage_count descending', async () => {
      const tags = await analyticsDAO.getPopularTags(10);

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThanOrEqual(3);

      // Check if sorted by usage_count descending
      for (let i = 0; i < tags.length - 1; i++) {
        expect(tags[i].usage_count >= tags[i + 1].usage_count).toBe(true);
      }
    });

    test('should include tag details', async () => {
      const tags = await analyticsDAO.getPopularTags(10);

      tags.forEach(tag => {
        expect(tag.id).toBeDefined();
        expect(tag.name).toBeDefined();
        expect(tag.usage_count).toBeDefined();
        expect(typeof tag.usage_count).toBe('number');
      });
    });

    test('should respect limit parameter', async () => {
      const tags = await analyticsDAO.getPopularTags(2);

      expect(tags.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getUserRanking()', () => {
    test('should return users ranked by contribution', async () => {
      const ranking = await analyticsDAO.getUserRanking(10);

      expect(ranking).toBeDefined();
      expect(Array.isArray(ranking)).toBe(true);
      expect(ranking.length).toBeGreaterThanOrEqual(2);
    });

    test('should include user details and contribution counts', async () => {
      const ranking = await analyticsDAO.getUserRanking(10);

      ranking.forEach(user => {
        expect(user.user_id).toBeDefined();
        expect(user.user_name).toBeDefined();
        expect(user.resource_count).toBeDefined();
        expect(user.feedback_count).toBeDefined();
        expect(user.total_contribution).toBeDefined();
        expect(typeof user.total_contribution).toBe('number');
      });
    });

    test('should calculate total_contribution correctly', async () => {
      const ranking = await analyticsDAO.getUserRanking(10);

      const user1 = ranking.find(u => u.user_id === testUser1.id);
      const user2 = ranking.find(u => u.user_id === testUser2.id);

      expect(user1).toBeDefined();
      expect(user1.resource_count).toBe(3);
      expect(user1.feedback_count).toBe(2);
      expect(user1.total_contribution).toBe(5);

      expect(user2).toBeDefined();
      expect(user2.resource_count).toBe(2);
      expect(user2.feedback_count).toBe(1);
      expect(user2.total_contribution).toBe(3);
    });

    test('should sort by total_contribution descending', async () => {
      const ranking = await analyticsDAO.getUserRanking(10);

      // Check if sorted by total_contribution descending
      for (let i = 0; i < ranking.length - 1; i++) {
        expect(ranking[i].total_contribution >= ranking[i + 1].total_contribution).toBe(true);
      }
    });
  });

  describe('analyzeUnmatchedNeeds()', () => {
    test('should return analysis of unmatched needs', async () => {
      const analysis = await analyticsDAO.analyzeUnmatchedNeeds();

      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis)).toBe(true);
      expect(analysis.length).toBeGreaterThanOrEqual(2);
    });

    test('should group by target', async () => {
      const analysis = await analyticsDAO.analyzeUnmatchedNeeds();

      analysis.forEach(item => {
        expect(item.target).toBeDefined();
        expect(item.count).toBeDefined();
        expect(typeof item.count).toBe('number');
      });
    });

    test('should only count open needs', async () => {
      const analysis = await analyticsDAO.analyzeUnmatchedNeeds();

      const totalUnmatched = analysis.reduce((sum, item) => sum + item.count, 0);
      expect(totalUnmatched).toBeGreaterThanOrEqual(2);
    });

    test('should include purpose information', async () => {
      const analysis = await analyticsDAO.analyzeUnmatchedNeeds();

      analysis.forEach(item => {
        expect(item.purpose).toBeDefined();
      });
    });
  });
});

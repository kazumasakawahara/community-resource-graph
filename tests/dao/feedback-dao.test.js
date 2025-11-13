/**
 * Test: Feedback CRUD Operations
 * Requirement: 5 (Feedback System)
 * Task: 6.1 フィードバックCRUD操作
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const feedbackDAO = require('../../src/dao/feedback-dao');
const resourceDAO = require('../../src/dao/resource-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Feedback CRUD Operations', () => {
  let session;
  let testUser;
  let testArea;
  let testResource;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data
    await session.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "feedback_test_feedback" DETACH DELETE f');
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "feedback_test_resource" DETACH DELETE r');
    await session.run('MATCH (u:User) WHERE u.email = "feedback-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id = "feedback_test_area_001" DETACH DELETE a');

    // Create test user
    testUser = await userDAO.create({
      name: 'Feedback Test User',
      email: 'feedback-test-user@example.com',
      password: 'password123',
      role: 'user'
    });

    // Create test area
    const areaResult = await session.run(
      'CREATE (a:Area {id: "feedback_test_area_001", name: "フィードバックテストエリア", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea = areaResult.records[0].get('a').properties;

    // Create test resource with feedback_count
    testResource = await resourceDAO.create({
      name: 'Feedback Test Resource',
      type: 'place',
      description: 'A resource for feedback testing'
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
      await cleanupSession.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "feedback_test_feedback" DETACH DELETE f');
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "feedback_test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "feedback-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id = "feedback_test_area_001" DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('create()', () => {
    test('should create a feedback with required fields', async () => {
      const feedbackData = {
        content: 'とても良い場所でした。',
        visit_date: '2025-10-01'
      };

      const feedback = await feedbackDAO.create(feedbackData, testUser.id, testResource.id);

      expect(feedback).toBeDefined();
      expect(feedback.id).toMatch(/^feedback_/);
      expect(feedback.content).toBe('とても良い場所でした。');
      expect(feedback.visit_date).toBe('2025-10-01');
      expect(feedback.helpful_count).toBe(0);
      expect(feedback.created_at).toBeDefined();
    });

    test('should create HAS_FEEDBACK relationship to Resource', async () => {
      const feedbackData = {
        content: 'スタッフの方が親切でした。',
        visit_date: '2025-09-15'
      };

      const feedback = await feedbackDAO.create(feedbackData, testUser.id, testResource.id);

      // Verify HAS_FEEDBACK relationship
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:HAS_FEEDBACK]->(f:Feedback {id: $feedbackId}) RETURN f',
        { resourceId: testResource.id, feedbackId: feedback.id }
      );

      expect(result.records.length).toBe(1);
    });

    test('should create GIVEN_BY relationship to User', async () => {
      const feedbackData = {
        content: 'アクセスが便利です。',
        visit_date: '2025-08-20'
      };

      const feedback = await feedbackDAO.create(feedbackData, testUser.id, testResource.id);

      // Verify GIVEN_BY relationship
      const result = await session.run(
        'MATCH (f:Feedback {id: $feedbackId})-[:GIVEN_BY]->(u:User {id: $userId}) RETURN u',
        { feedbackId: feedback.id, userId: testUser.id }
      );

      expect(result.records.length).toBe(1);
    });

    test('should auto-increment Resource.feedback_count', async () => {
      // Get initial feedback_count
      const initialResult = await session.run(
        'MATCH (r:Resource {id: $resourceId}) RETURN r.feedback_count as count',
        { resourceId: testResource.id }
      );
      const initialCount = initialResult.records[0].get('count').toNumber();

      // Create feedback
      await feedbackDAO.create({
        content: '初めてのフィードバック',
        visit_date: '2025-07-01'
      }, testUser.id, testResource.id);

      // Verify feedback_count was incremented
      const updatedResult = await session.run(
        'MATCH (r:Resource {id: $resourceId}) RETURN r.feedback_count as count',
        { resourceId: testResource.id }
      );
      const updatedCount = updatedResult.records[0].get('count').toNumber();

      expect(updatedCount).toBe(initialCount + 1);
    });

    test('should support multiple feedbacks per resource', async () => {
      // Create first feedback
      await feedbackDAO.create({
        content: '1つ目のフィードバック',
        visit_date: '2025-06-01'
      }, testUser.id, testResource.id);

      // Create second feedback
      await feedbackDAO.create({
        content: '2つ目のフィードバック',
        visit_date: '2025-06-15'
      }, testUser.id, testResource.id);

      // Verify both feedbacks exist
      const result = await session.run(
        'MATCH (r:Resource {id: $resourceId})-[:HAS_FEEDBACK]->(f:Feedback) RETURN count(f) as count',
        { resourceId: testResource.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(2);
    });

    test('should initialize helpful_count to 0', async () => {
      const feedback = await feedbackDAO.create({
        content: 'helpful_countテスト',
        visit_date: '2025-05-01'
      }, testUser.id, testResource.id);

      expect(feedback.helpful_count).toBe(0);
    });
  });

  describe('findByResourceId()', () => {
    beforeEach(async () => {
      // Create test feedbacks
      await feedbackDAO.create({
        content: '最初のフィードバック',
        visit_date: '2025-03-01'
      }, testUser.id, testResource.id);

      await feedbackDAO.create({
        content: '2番目のフィードバック',
        visit_date: '2025-04-01'
      }, testUser.id, testResource.id);
    });

    test('should return all feedbacks for a resource', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      expect(feedbacks.length).toBe(2);
    });

    test('should include author name in feedback', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      expect(feedbacks[0].author_name).toBe('Feedback Test User');
    });

    test('should include visit_date in feedback', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      const dates = feedbacks.map(f => f.visit_date).sort();
      expect(dates).toContain('2025-03-01');
      expect(dates).toContain('2025-04-01');
    });

    test('should include created_at in feedback', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      feedbacks.forEach(feedback => {
        expect(feedback.created_at).toBeDefined();
      });
    });

    test('should include helpful_count in feedback', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      feedbacks.forEach(feedback => {
        expect(feedback.helpful_count).toBeDefined();
        expect(typeof feedback.helpful_count).toBe('number');
      });
    });

    test('should return empty array if no feedbacks exist', async () => {
      // Create a new resource without feedbacks
      const newResource = await resourceDAO.create({
        name: 'No Feedback Resource',
        type: 'place',
        description: 'No feedbacks yet'
      }, testUser.id, testArea.id);

      const feedbacks = await feedbackDAO.findByResourceId(newResource.id);

      expect(feedbacks).toBeDefined();
      expect(Array.isArray(feedbacks)).toBe(true);
      expect(feedbacks.length).toBe(0);
    });

    test('should order feedbacks by created_at descending (newest first)', async () => {
      const feedbacks = await feedbackDAO.findByResourceId(testResource.id);

      // Check if feedbacks are ordered by created_at descending
      for (let i = 0; i < feedbacks.length - 1; i++) {
        const current = new Date(feedbacks[i].created_at);
        const next = new Date(feedbacks[i + 1].created_at);
        expect(current >= next).toBe(true);
      }
    });
  });

  describe('incrementHelpfulCount()', () => {
    let testFeedback;

    beforeEach(async () => {
      // Create a test feedback
      testFeedback = await feedbackDAO.create({
        content: 'helpful_count更新テスト',
        visit_date: '2025-02-01'
      }, testUser.id, testResource.id);
    });

    test('should increment helpful_count by 1', async () => {
      const initialCount = testFeedback.helpful_count;

      await feedbackDAO.incrementHelpfulCount(testFeedback.id);

      // Verify helpful_count was incremented
      const result = await session.run(
        'MATCH (f:Feedback {id: $feedbackId}) RETURN f.helpful_count as count',
        { feedbackId: testFeedback.id }
      );

      const updatedCount = result.records[0].get('count').toNumber();
      expect(updatedCount).toBe(initialCount + 1);
    });

    test('should increment helpful_count multiple times', async () => {
      // Increment 3 times
      await feedbackDAO.incrementHelpfulCount(testFeedback.id);
      await feedbackDAO.incrementHelpfulCount(testFeedback.id);
      await feedbackDAO.incrementHelpfulCount(testFeedback.id);

      // Verify helpful_count is 3
      const result = await session.run(
        'MATCH (f:Feedback {id: $feedbackId}) RETURN f.helpful_count as count',
        { feedbackId: testFeedback.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(3);
    });
  });
});

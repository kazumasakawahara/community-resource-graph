/**
 * Test: Need CRUD Operations
 * Requirement: 8 (Need Recording)
 * Task: 7.1 ニーズCRUD操作
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const needDAO = require('../../src/dao/need-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Need CRUD Operations', () => {
  let session;
  let testUser;
  let testArea1;
  let testArea2;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data
    await session.run('MATCH (n:Need) WHERE n.id STARTS WITH "need_test_need" DETACH DELETE n');
    await session.run('MATCH (u:User) WHERE u.email = "need-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id IN ["need_test_area_001", "need_test_area_002"] DETACH DELETE a');

    // Create test user
    testUser = await userDAO.create({
      name: 'Need Test User',
      email: 'need-test-user@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test areas
    const area1Result = await session.run(
      'CREATE (a:Area {id: "need_test_area_001", name: "ニーズテストエリア1", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea1 = area1Result.records[0].get('a').properties;

    const area2Result = await session.run(
      'CREATE (a:Area {id: "need_test_area_002", name: "ニーズテストエリア2", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea2 = area2Result.records[0].get('a').properties;
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (n:Need) WHERE n.id STARTS WITH "need_test_need" DETACH DELETE n');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "need-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id IN ["need_test_area_001", "need_test_area_002"] DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('create()', () => {
    test('should create a need with required fields', async () => {
      const needData = {
        title: '車椅子対応の作業場を探しています',
        description: '本人は軽作業が可能で、週3日程度の就労を希望しています。',
        target: '知的障害',
        purpose: '就労支援'
      };

      const need = await needDAO.create(needData, testUser.id, testArea1.id);

      expect(need).toBeDefined();
      expect(need.id).toMatch(/^need_/);
      expect(need.title).toBe('車椅子対応の作業場を探しています');
      expect(need.description).toBe('本人は軽作業が可能で、週3日程度の就労を希望しています。');
      expect(need.target).toBe('知的障害');
      expect(need.purpose).toBe('就労支援');
      expect(need.status).toBe('open');
      expect(need.view_count).toBe(0);
      expect(need.created_at).toBeDefined();
    });

    test('should initialize status to "open"', async () => {
      const needData = {
        title: '新しいニーズ',
        description: 'テスト用',
        target: 'テスト',
        purpose: 'テスト'
      };

      const need = await needDAO.create(needData, testUser.id, testArea1.id);

      expect(need.status).toBe('open');
    });

    test('should initialize view_count to 0', async () => {
      const needData = {
        title: 'view_countテスト',
        description: 'テスト用',
        target: 'テスト',
        purpose: 'テスト'
      };

      const need = await needDAO.create(needData, testUser.id, testArea1.id);

      expect(need.view_count).toBe(0);
    });

    test('should create IN_AREA relationship', async () => {
      const needData = {
        title: 'エリア関連テスト',
        description: 'テスト用',
        target: 'テスト',
        purpose: 'テスト'
      };

      const need = await needDAO.create(needData, testUser.id, testArea1.id);

      // Verify IN_AREA relationship
      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[:IN_AREA]->(a:Area {id: $areaId}) RETURN a',
        { needId: need.id, areaId: testArea1.id }
      );

      expect(result.records.length).toBe(1);
    });

    test('should create RECORDED_BY relationship', async () => {
      const needData = {
        title: 'ユーザー関連テスト',
        description: 'テスト用',
        target: 'テスト',
        purpose: 'テスト'
      };

      const need = await needDAO.create(needData, testUser.id, testArea1.id);

      // Verify RECORDED_BY relationship
      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[:RECORDED_BY]->(u:User {id: $userId}) RETURN u',
        { needId: need.id, userId: testUser.id }
      );

      expect(result.records.length).toBe(1);
    });
  });

  describe('findAll()', () => {
    beforeEach(async () => {
      // Create test needs with different statuses and areas
      await needDAO.create({
        title: 'オープンニーズ1',
        description: 'エリア1のオープンニーズ',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea1.id);

      await needDAO.create({
        title: 'オープンニーズ2',
        description: 'エリア1のオープンニーズ',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea1.id);

      const matchedNeed = await needDAO.create({
        title: 'マッチ済みニーズ',
        description: 'エリア1のマッチ済みニーズ',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea1.id);

      await needDAO.updateStatus(matchedNeed.id, 'matched');

      await needDAO.create({
        title: 'エリア2のニーズ',
        description: 'エリア2のオープンニーズ',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea2.id);
    });

    test('should return all needs without filters', async () => {
      const needs = await needDAO.findAll();

      expect(needs.length).toBeGreaterThanOrEqual(4);
    });

    test('should filter by status', async () => {
      const openNeeds = await needDAO.findAll({ status: 'open' });

      openNeeds.forEach(need => {
        expect(need.status).toBe('open');
      });
      expect(openNeeds.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter by area', async () => {
      const area1Needs = await needDAO.findAll({ areaId: testArea1.id });

      expect(area1Needs.length).toBe(3);
      area1Needs.forEach(need => {
        expect(need.area_id).toBe(testArea1.id);
      });
    });

    test('should filter by both status and area', async () => {
      const filteredNeeds = await needDAO.findAll({
        status: 'open',
        areaId: testArea1.id
      });

      expect(filteredNeeds.length).toBe(2);
      filteredNeeds.forEach(need => {
        expect(need.status).toBe('open');
        expect(need.area_id).toBe(testArea1.id);
      });
    });

    test('should include area information', async () => {
      const needs = await needDAO.findAll({ areaId: testArea1.id });

      needs.forEach(need => {
        expect(need.area_id).toBeDefined();
        expect(need.area_name).toBeDefined();
      });
    });

    test('should support pagination with skip', async () => {
      const firstPage = await needDAO.findAll({ skip: 0, limit: 2 });
      const secondPage = await needDAO.findAll({ skip: 2, limit: 2 });

      expect(firstPage.length).toBeLessThanOrEqual(2);
      expect(secondPage.length).toBeLessThanOrEqual(2);

      // Verify no duplicate IDs
      const firstIds = firstPage.map(n => n.id);
      const secondIds = secondPage.map(n => n.id);
      const intersection = firstIds.filter(id => secondIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('should support pagination with limit', async () => {
      const needs = await needDAO.findAll({ limit: 2 });

      expect(needs.length).toBeLessThanOrEqual(2);
    });

    test('should prioritize status="open" needs', async () => {
      const needs = await needDAO.findAll({ limit: 10 });

      // Count open needs at the beginning
      let openAtStart = 0;
      for (let i = 0; i < Math.min(3, needs.length); i++) {
        if (needs[i].status === 'open') openAtStart++;
      }

      // Open needs should be more common at the start
      expect(openAtStart).toBeGreaterThan(0);
    });
  });

  describe('findById()', () => {
    let testNeed;

    beforeEach(async () => {
      testNeed = await needDAO.create({
        title: '詳細取得テスト',
        description: 'テスト用ニーズ',
        target: '知的障害',
        purpose: '就労支援'
      }, testUser.id, testArea1.id);
    });

    test('should return need details by id', async () => {
      const need = await needDAO.findById(testNeed.id);

      expect(need).toBeDefined();
      expect(need.id).toBe(testNeed.id);
      expect(need.title).toBe('詳細取得テスト');
      expect(need.description).toBe('テスト用ニーズ');
    });

    test('should include area information', async () => {
      const need = await needDAO.findById(testNeed.id);

      expect(need.area_id).toBe(testArea1.id);
      expect(need.area_name).toBe('ニーズテストエリア1');
    });

    test('should include user information', async () => {
      const need = await needDAO.findById(testNeed.id);

      expect(need.recorded_by_id).toBe(testUser.id);
      expect(need.recorded_by_name).toBe('Need Test User');
    });

    test('should return null if need does not exist', async () => {
      const need = await needDAO.findById('need_nonexistent');

      expect(need).toBeNull();
    });
  });

  describe('updateStatus()', () => {
    let testNeed;

    beforeEach(async () => {
      testNeed = await needDAO.create({
        title: 'ステータス更新テスト',
        description: 'テスト用',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea1.id);
    });

    test('should update status from "open" to "matched"', async () => {
      await needDAO.updateStatus(testNeed.id, 'matched');

      const result = await session.run(
        'MATCH (n:Need {id: $needId}) RETURN n.status as status',
        { needId: testNeed.id }
      );

      expect(result.records[0].get('status')).toBe('matched');
    });

    test('should update status from "matched" to "closed"', async () => {
      await needDAO.updateStatus(testNeed.id, 'matched');
      await needDAO.updateStatus(testNeed.id, 'closed');

      const result = await session.run(
        'MATCH (n:Need {id: $needId}) RETURN n.status as status',
        { needId: testNeed.id }
      );

      expect(result.records[0].get('status')).toBe('closed');
    });

    test('should support valid status transitions', async () => {
      // open -> matched
      await needDAO.updateStatus(testNeed.id, 'matched');
      let result = await session.run(
        'MATCH (n:Need {id: $needId}) RETURN n.status as status',
        { needId: testNeed.id }
      );
      expect(result.records[0].get('status')).toBe('matched');

      // matched -> closed
      await needDAO.updateStatus(testNeed.id, 'closed');
      result = await session.run(
        'MATCH (n:Need {id: $needId}) RETURN n.status as status',
        { needId: testNeed.id }
      );
      expect(result.records[0].get('status')).toBe('closed');
    });
  });
});

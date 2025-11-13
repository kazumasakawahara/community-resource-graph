/**
 * Test: Need Matching Functionality
 * Requirement: 9 (Need Matching Recommendation)
 * Task: 7.2 ニーズマッチング機能
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');
const needDAO = require('../../src/dao/need-dao');
const resourceDAO = require('../../src/dao/resource-dao');
const userDAO = require('../../src/dao/user-dao');

describe('Need Matching Functionality', () => {
  let session;
  let testUser;
  let testArea1;
  let testArea2;
  let testNeed;
  let testResource1;
  let testResource2;
  let testResource3;

  beforeAll(async () => {
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data
    await session.run('MATCH (n:Need) WHERE n.id STARTS WITH "match_test_need" DETACH DELETE n');
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "match_test_resource" DETACH DELETE r');
    await session.run('MATCH (u:User) WHERE u.email = "match-test-user@example.com" DETACH DELETE u');
    await session.run('MATCH (a:Area) WHERE a.id IN ["match_test_area_001", "match_test_area_002"] DETACH DELETE a');

    // Create test user
    testUser = await userDAO.create({
      name: 'Match Test User',
      email: 'match-test-user@example.com',
      password: 'password123',
      role: 'supporter'
    });

    // Create test areas
    const area1Result = await session.run(
      'CREATE (a:Area {id: "match_test_area_001", name: "マッチングテストエリア1", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea1 = area1Result.records[0].get('a').properties;

    const area2Result = await session.run(
      'CREATE (a:Area {id: "match_test_area_002", name: "マッチングテストエリア2", city: "テスト市", created_at: datetime()}) RETURN a'
    );
    testArea2 = area2Result.records[0].get('a').properties;

    // Create test need in area1
    testNeed = await needDAO.create({
      title: '作業場を探しています',
      description: '軽作業が可能な場所',
      target: '知的障害',
      purpose: '就労支援'
    }, testUser.id, testArea1.id);

    // Create test resources
    testResource1 = await resourceDAO.create({
      name: 'エリア1の作業場A',
      type: 'place',
      description: '軽作業可能'
    }, testUser.id, testArea1.id);

    testResource2 = await resourceDAO.create({
      name: 'エリア1の作業場B',
      type: 'place',
      description: '就労支援施設'
    }, testUser.id, testArea1.id);

    testResource3 = await resourceDAO.create({
      name: 'エリア2の作業場C',
      type: 'place',
      description: '別エリアの施設'
    }, testUser.id, testArea2.id);
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    const cleanupSession = neo4jDriver.getSession();
    try {
      await cleanupSession.run('MATCH (n:Need) WHERE n.id STARTS WITH "match_test_need" DETACH DELETE n');
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "match_test_resource" DETACH DELETE r');
      await cleanupSession.run('MATCH (u:User) WHERE u.email = "match-test-user@example.com" DETACH DELETE u');
      await cleanupSession.run('MATCH (a:Area) WHERE a.id IN ["match_test_area_001", "match_test_area_002"] DETACH DELETE a');
    } finally {
      await cleanupSession.close();
      await neo4jDriver.close();
    }
  });

  describe('findResourcesByArea()', () => {
    test('should find resources in the same area as the need', async () => {
      const resources = await needDAO.findResourcesByArea(testNeed.id);

      expect(resources.length).toBe(2);
      const resourceIds = resources.map(r => r.id).sort();
      expect(resourceIds).toEqual([testResource1.id, testResource2.id].sort());
    });

    test('should not include resources from different areas', async () => {
      const resources = await needDAO.findResourcesByArea(testNeed.id);

      const hasResource3 = resources.some(r => r.id === testResource3.id);
      expect(hasResource3).toBe(false);
    });

    test('should include resource details', async () => {
      const resources = await needDAO.findResourcesByArea(testNeed.id);

      resources.forEach(resource => {
        expect(resource.id).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.type).toBeDefined();
        expect(resource.description).toBeDefined();
      });
    });

    test('should return empty array if no resources in area', async () => {
      // Create a need in area2 where we only have one resource
      const needInArea2 = await needDAO.create({
        title: 'エリア2のニーズ',
        description: 'テスト',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea2.id);

      const resources = await needDAO.findResourcesByArea(needInArea2.id);

      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBe(1); // Only testResource3
    });
  });

  describe('createMatch()', () => {
    test('should create MATCHED_BY relationship with required fields', async () => {
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      // Verify MATCHED_BY relationship
      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->(r:Resource {id: $resourceId}) RETURN m',
        { needId: testNeed.id, resourceId: testResource1.id }
      );

      expect(result.records.length).toBe(1);
      const match = result.records[0].get('m').properties;
      expect(match.match_quality).toBe('high');
      expect(match.matched_by).toBe(testUser.id);
      expect(match.matched_at).toBeDefined();
    });

    test('should support match_quality levels (high, medium, low)', async () => {
      // High quality match
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      // Medium quality match
      await needDAO.createMatch(testNeed.id, testResource2.id, {
        match_quality: 'medium',
        matched_by: testUser.id
      });

      // Verify both matches
      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->() RETURN m.match_quality as quality ORDER BY quality',
        { needId: testNeed.id }
      );

      const qualities = result.records.map(r => r.get('quality')).sort();
      expect(qualities).toEqual(['high', 'medium']);
    });

    test('should store optional note field', async () => {
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id,
        note: 'バリアフリー設備が充実しています'
      });

      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->(r:Resource {id: $resourceId}) RETURN m.note as note',
        { needId: testNeed.id, resourceId: testResource1.id }
      );

      expect(result.records[0].get('note')).toBe('バリアフリー設備が充実しています');
    });

    test('should update need status to "matched"', async () => {
      // Verify initial status is 'open'
      let need = await needDAO.findById(testNeed.id);
      expect(need.status).toBe('open');

      // Create match
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      // Verify status updated to 'matched'
      need = await needDAO.findById(testNeed.id);
      expect(need.status).toBe('matched');
    });

    test('should allow multiple resources to match one need', async () => {
      // Create first match
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      // Create second match
      await needDAO.createMatch(testNeed.id, testResource2.id, {
        match_quality: 'medium',
        matched_by: testUser.id
      });

      // Verify both matches exist
      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[:MATCHED_BY]->() RETURN count(*) as count',
        { needId: testNeed.id }
      );

      expect(result.records[0].get('count').toNumber()).toBe(2);
    });

    test('should record matched_at timestamp', async () => {
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->() RETURN m.matched_at as matched_at',
        { needId: testNeed.id }
      );

      const matchedAt = result.records[0].get('matched_at');
      expect(matchedAt).toBeDefined();

      // Verify it's a valid datetime object
      expect(matchedAt.toString()).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should record matched_by user', async () => {
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id
      });

      const result = await session.run(
        'MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->() RETURN m.matched_by as matched_by',
        { needId: testNeed.id }
      );

      expect(result.records[0].get('matched_by')).toBe(testUser.id);
    });
  });

  describe('getMatchedResources()', () => {
    beforeEach(async () => {
      // Create matches
      await needDAO.createMatch(testNeed.id, testResource1.id, {
        match_quality: 'high',
        matched_by: testUser.id,
        note: 'おすすめの施設です'
      });

      await needDAO.createMatch(testNeed.id, testResource2.id, {
        match_quality: 'medium',
        matched_by: testUser.id
      });
    });

    test('should return all matched resources for a need', async () => {
      const matches = await needDAO.getMatchedResources(testNeed.id);

      expect(matches.length).toBe(2);
    });

    test('should include resource details', async () => {
      const matches = await needDAO.getMatchedResources(testNeed.id);

      matches.forEach(match => {
        expect(match.resource).toBeDefined();
        expect(match.resource.id).toBeDefined();
        expect(match.resource.name).toBeDefined();
        expect(match.resource.type).toBeDefined();
      });
    });

    test('should include match information', async () => {
      const matches = await needDAO.getMatchedResources(testNeed.id);

      matches.forEach(match => {
        expect(match.match_quality).toBeDefined();
        expect(match.matched_by).toBe(testUser.id);
        expect(match.matched_at).toBeDefined();
      });
    });

    test('should include note if provided', async () => {
      const matches = await needDAO.getMatchedResources(testNeed.id);

      const matchWithNote = matches.find(m => m.resource.id === testResource1.id);
      expect(matchWithNote.note).toBe('おすすめの施設です');

      const matchWithoutNote = matches.find(m => m.resource.id === testResource2.id);
      expect(matchWithoutNote.note).toBeUndefined();
    });

    test('should return empty array if no matches exist', async () => {
      // Create a new need without matches
      const newNeed = await needDAO.create({
        title: 'マッチなしニーズ',
        description: 'テスト',
        target: 'テスト',
        purpose: 'テスト'
      }, testUser.id, testArea1.id);

      const matches = await needDAO.getMatchedResources(newNeed.id);

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
    });
  });
});

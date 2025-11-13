/**
 * Test: Demo Data Generation
 * Requirements: 1 (Resource Registration), 2 (Tag-based Classification),
 *               3 (Area-based Management), 5 (Feedback), 6 (Connections), 8 (Needs)
 * Task: 2.2 デモデータ生成スクリプト
 */

const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

describe('Demo Data Generation', () => {
  let driver;
  let session;

  beforeAll(async () => {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
    );
    await driver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = driver.session();
  });

  afterEach(async () => {
    if (session) {
      await session.close();
    }
  });

  afterAll(async () => {
    if (driver) {
      await driver.close();
    }
  });

  test('should have Area nodes', async () => {
    const result = await session.run('MATCH (a:Area) RETURN count(a) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThan(0);
  });

  test('should have Tag nodes', async () => {
    const result = await session.run('MATCH (t:Tag) RETURN count(t) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThan(0);
  });

  test('should have User nodes (at least 5)', async () => {
    const result = await session.run('MATCH (u:User) RETURN count(u) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should have Resource nodes (at least 50)', async () => {
    const result = await session.run('MATCH (r:Resource) RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThanOrEqual(50);
  });

  test('should have Feedback nodes (at least 10)', async () => {
    const result = await session.run('MATCH (f:Feedback) RETURN count(f) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('should have Need nodes (at least 5)', async () => {
    const result = await session.run('MATCH (n:Need) RETURN count(n) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should have RELATED_TO relationships (at least 20)', async () => {
    const result = await session.run('MATCH ()-[r:RELATED_TO]->() RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThanOrEqual(20);
  });

  test('should have LOCATED_IN relationships', async () => {
    const result = await session.run('MATCH ()-[r:LOCATED_IN]->() RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThan(0);
  });

  test('should have HAS_TAG relationships', async () => {
    const result = await session.run('MATCH ()-[r:HAS_TAG]->() RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThan(0);
  });

  test('should have REGISTERED_BY relationships', async () => {
    const result = await session.run('MATCH ()-[r:REGISTERED_BY]->() RETURN count(r) as count');
    const count = result.records[0].get('count').toNumber();

    expect(count).toBeGreaterThan(0);
  });

  test('Resources should have valid types', async () => {
    const result = await session.run(
      'MATCH (r:Resource) RETURN DISTINCT r.type as type'
    );

    const types = result.records.map(record => record.get('type'));
    const validTypes = ['place', 'person', 'activity', 'information'];

    types.forEach(type => {
      expect(validTypes).toContain(type);
    });
  });

  test('Areas should have name and city properties', async () => {
    const result = await session.run(
      'MATCH (a:Area) RETURN a.name as name, a.city as city LIMIT 1'
    );

    expect(result.records.length).toBeGreaterThan(0);
    const record = result.records[0];
    expect(record.get('name')).toBeDefined();
    expect(record.get('city')).toBeDefined();
  });

  test('Needs should have valid status', async () => {
    const result = await session.run(
      'MATCH (n:Need) RETURN DISTINCT n.status as status'
    );

    const statuses = result.records.map(record => record.get('status'));
    const validStatuses = ['open', 'matched', 'closed'];

    statuses.forEach(status => {
      expect(validStatuses).toContain(status);
    });
  });
});

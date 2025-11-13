/**
 * Test: Neo4j Schema Initialization
 * Requirement: 11 (Database Index Optimization)
 * Task: 2.1 制約とインデックスの作成
 */

const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

describe('Neo4j Schema Initialization', () => {
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

  describe('Uniqueness Constraints', () => {
    test('User.email should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "User" IN labelsOrTypes RETURN name, properties'
      );

      const userConstraints = result.records.map(record => ({
        name: record.get('name'),
        properties: record.get('properties')
      }));

      const emailConstraint = userConstraints.find(c =>
        c.properties.includes('email')
      );

      expect(emailConstraint).toBeDefined();
    });

    test('Resource.id should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "Resource" IN labelsOrTypes RETURN name, properties'
      );

      const constraints = result.records.map(record => record.get('properties'));
      const hasIdConstraint = constraints.some(props => props.includes('id'));

      expect(hasIdConstraint).toBe(true);
    });

    test('User.id should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "User" IN labelsOrTypes RETURN name, properties'
      );

      const constraints = result.records.map(record => record.get('properties'));
      const hasIdConstraint = constraints.some(props => props.includes('id'));

      expect(hasIdConstraint).toBe(true);
    });

    test('Feedback.id should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "Feedback" IN labelsOrTypes RETURN name, properties'
      );

      const constraints = result.records.map(record => record.get('properties'));
      const hasIdConstraint = constraints.some(props => props.includes('id'));

      expect(hasIdConstraint).toBe(true);
    });

    test('Need.id should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "Need" IN labelsOrTypes RETURN name, properties'
      );

      const constraints = result.records.map(record => record.get('properties'));
      const hasIdConstraint = constraints.some(props => props.includes('id'));

      expect(hasIdConstraint).toBe(true);
    });

    test('Area.id should have uniqueness constraint', async () => {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties WHERE "Area" IN labelsOrTypes RETURN name, properties'
      );

      const constraints = result.records.map(record => record.get('properties'));
      const hasIdConstraint = constraints.some(props => props.includes('id'));

      expect(hasIdConstraint).toBe(true);
    });
  });

  describe('Indexes', () => {
    test('Resource.name should have index', async () => {
      const result = await session.run(
        'SHOW INDEXES YIELD labelsOrTypes, properties WHERE "Resource" IN labelsOrTypes RETURN properties'
      );

      const indexes = result.records.map(record => record.get('properties'));
      const hasNameIndex = indexes.some(props => props.includes('name'));

      expect(hasNameIndex).toBe(true);
    });

    test('Resource.type should have index', async () => {
      const result = await session.run(
        'SHOW INDEXES YIELD labelsOrTypes, properties WHERE "Resource" IN labelsOrTypes RETURN properties'
      );

      const indexes = result.records.map(record => record.get('properties'));
      const hasTypeIndex = indexes.some(props => props.includes('type'));

      expect(hasTypeIndex).toBe(true);
    });

    test('Tag.name should have index', async () => {
      const result = await session.run(
        'SHOW INDEXES YIELD labelsOrTypes, properties WHERE "Tag" IN labelsOrTypes RETURN properties'
      );

      const indexes = result.records.map(record => record.get('properties'));
      const hasNameIndex = indexes.some(props => props.includes('name'));

      expect(hasNameIndex).toBe(true);
    });

    test('Need.status should have index', async () => {
      const result = await session.run(
        'SHOW INDEXES YIELD labelsOrTypes, properties WHERE "Need" IN labelsOrTypes RETURN properties'
      );

      const indexes = result.records.map(record => record.get('properties'));
      const hasStatusIndex = indexes.some(props => props.includes('status'));

      expect(hasStatusIndex).toBe(true);
    });

    test('Area.name should have index', async () => {
      const result = await session.run(
        'SHOW INDEXES YIELD labelsOrTypes, properties WHERE "Area" IN labelsOrTypes RETURN properties'
      );

      const indexes = result.records.map(record => record.get('properties'));
      const hasNameIndex = indexes.some(props => props.includes('name'));

      expect(hasNameIndex).toBe(true);
    });
  });
});

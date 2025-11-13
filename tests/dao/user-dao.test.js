/**
 * Test: User DAO
 * Requirement: 10 (User Authentication and Management)
 * Task: 4.1 ユーザーCRUD操作
 */

const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const neo4jDriver = require('../../src/db/neo4j-driver');

// Import will be created in GREEN phase
let userDAO;

describe('User DAO', () => {
  let session;

  beforeAll(async () => {
    // Dynamic import for the module we'll create
    userDAO = require('../../src/dao/user-dao');

    // Verify Neo4j connection
    await neo4jDriver.verifyConnectivity();
  });

  beforeEach(async () => {
    session = neo4jDriver.getSession();

    // Clean up test data before each test (users, resources, feedbacks)
    await session.run('MATCH (u:User) WHERE u.email STARTS WITH "test" DETACH DELETE u');
    await session.run('MATCH (r:Resource) WHERE r.id STARTS WITH "test_res" DETACH DELETE r');
    await session.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "test_fb" DETACH DELETE f');
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
      await cleanupSession.run('MATCH (u:User) WHERE u.email STARTS WITH "test" DETACH DELETE u');
      await cleanupSession.run('MATCH (r:Resource) WHERE r.id STARTS WITH "test_res" DETACH DELETE r');
      await cleanupSession.run('MATCH (f:Feedback) WHERE f.id STARTS WITH "test_fb" DETACH DELETE f');
    } finally {
      await cleanupSession.close();
      // Don't close driver here - other tests may still need it
    }
  });

  describe('create()', () => {
    test('should create a new user with hashed password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'supporter',
        organization: 'Test Organization'
      };

      const user = await userDAO.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.organization).toBe(userData.organization);
      expect(user.created_at).toBeDefined();

      // Password should be hashed, not plain text
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toBeDefined();

      // Verify password is bcrypt hashed
      const isValid = await bcrypt.compare(userData.password, user.password);
      expect(isValid).toBe(true);
    });

    test('should create user without organization (optional field)', async () => {
      const userData = {
        name: 'Test Individual',
        email: 'test-individual@example.com',
        password: 'password456',
        role: 'individual'
      };

      const user = await userDAO.create(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(userData.role);
      expect(user.organization).toBeUndefined();
    });

    test('should accept valid role values', async () => {
      const roles = ['supporter', 'individual', 'family', 'resident'];

      for (const role of roles) {
        const userData = {
          name: `Test ${role}`,
          email: `test-${role}@example.com`,
          password: 'password789',
          role: role
        };

        const user = await userDAO.create(userData);
        expect(user.role).toBe(role);
      }
    });

    test('should generate unique user IDs', async () => {
      const userData1 = {
        name: 'User 1',
        email: 'test-user1@example.com',
        password: 'password1',
        role: 'supporter'
      };

      const userData2 = {
        name: 'User 2',
        email: 'test-user2@example.com',
        password: 'password2',
        role: 'individual'
      };

      const user1 = await userDAO.create(userData1);
      const user2 = await userDAO.create(userData2);

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('findByEmail()', () => {
    test('should find user by email', async () => {
      const userData = {
        name: 'Test Finder',
        email: 'test-finder@example.com',
        password: 'password123',
        role: 'supporter'
      };

      const createdUser = await userDAO.create(userData);
      const foundUser = await userDAO.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.name).toBe(userData.name);
      expect(foundUser.password).toBeDefined(); // Password should be included for authentication
    });

    test('should return null for non-existent email', async () => {
      const foundUser = await userDAO.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    test('should be case-sensitive for email', async () => {
      const userData = {
        name: 'Case Test',
        email: 'test-case@example.com',
        password: 'password123',
        role: 'supporter'
      };

      await userDAO.create(userData);

      const lowerCase = await userDAO.findByEmail('test-case@example.com');
      const upperCase = await userDAO.findByEmail('TEST-CASE@EXAMPLE.COM');

      expect(lowerCase).toBeDefined();
      expect(upperCase).toBeNull(); // Should not find with different case
    });
  });

  describe('findById()', () => {
    test('should find user by ID', async () => {
      const userData = {
        name: 'Test ID Finder',
        email: 'test-id-finder@example.com',
        password: 'password123',
        role: 'family'
      };

      const createdUser = await userDAO.create(userData);
      const foundUser = await userDAO.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.name).toBe(userData.name);
      expect(foundUser.role).toBe(userData.role);
    });

    test('should return null for non-existent ID', async () => {
      const foundUser = await userDAO.findById('nonexistent_id_12345');

      expect(foundUser).toBeNull();
    });

    test('should not include password in findById result', async () => {
      const userData = {
        name: 'Test Password Exclusion',
        email: 'test-password-exclusion@example.com',
        password: 'password123',
        role: 'resident'
      };

      const createdUser = await userDAO.create(userData);
      const foundUser = await userDAO.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.password).toBeUndefined(); // Password should NOT be included in profile queries
    });
  });

  describe('getUserContributions()', () => {
    test('should return user contributions with counts', async () => {
      const userData = {
        name: 'Test Contributor',
        email: 'test-contributor@example.com',
        password: 'password123',
        role: 'supporter'
      };

      const user = await userDAO.create(userData);
      const contributions = await userDAO.getUserContributions(user.id);

      expect(contributions).toBeDefined();
      expect(contributions.registered_resources_count).toBeDefined();
      expect(contributions.given_feedbacks_count).toBeDefined();
      expect(typeof contributions.registered_resources_count).toBe('number');
      expect(typeof contributions.given_feedbacks_count).toBe('number');

      // New user should have zero contributions
      expect(contributions.registered_resources_count).toBe(0);
      expect(contributions.given_feedbacks_count).toBe(0);
    });

    test('should count registered resources correctly', async () => {
      const userData = {
        name: 'Test Resource Creator',
        email: 'test-resource-creator@example.com',
        password: 'password123',
        role: 'supporter'
      };

      const user = await userDAO.create(userData);

      // Create test resources registered by this user
      await session.run(`
        MATCH (u:User {id: $userId})
        CREATE (r1:Resource {id: 'test_res_1', name: 'Test Resource 1', type: 'place'})-[:REGISTERED_BY]->(u)
        CREATE (r2:Resource {id: 'test_res_2', name: 'Test Resource 2', type: 'person'})-[:REGISTERED_BY]->(u)
      `, { userId: user.id });

      const contributions = await userDAO.getUserContributions(user.id);

      expect(contributions.registered_resources_count).toBe(2);
      expect(contributions.given_feedbacks_count).toBe(0);
    });

    test('should count given feedbacks correctly', async () => {
      const userData = {
        name: 'Test Feedback Giver',
        email: 'test-feedback-giver@example.com',
        password: 'password123',
        role: 'individual'
      };

      const user = await userDAO.create(userData);

      // Create test feedbacks given by this user
      await session.run(`
        MATCH (u:User {id: $userId})
        CREATE (f1:Feedback {id: 'test_fb_1', content: 'Great!'})-[:GIVEN_BY]->(u)
        CREATE (f2:Feedback {id: 'test_fb_2', content: 'Very helpful'})-[:GIVEN_BY]->(u)
        CREATE (f3:Feedback {id: 'test_fb_3', content: 'Nice place'})-[:GIVEN_BY]->(u)
      `, { userId: user.id });

      const contributions = await userDAO.getUserContributions(user.id);

      expect(contributions.registered_resources_count).toBe(0);
      expect(contributions.given_feedbacks_count).toBe(3);
    });

    test('should count both resources and feedbacks', async () => {
      const userData = {
        name: 'Test Active Contributor',
        email: 'test-active-contributor@example.com',
        password: 'password123',
        role: 'supporter'
      };

      const user = await userDAO.create(userData);

      // Create both resources and feedbacks
      await session.run(`
        MATCH (u:User {id: $userId})
        CREATE (r1:Resource {id: 'test_res_3', name: 'Resource 3', type: 'activity'})-[:REGISTERED_BY]->(u)
        CREATE (f1:Feedback {id: 'test_fb_4', content: 'Feedback 1'})-[:GIVEN_BY]->(u)
        CREATE (f2:Feedback {id: 'test_fb_5', content: 'Feedback 2'})-[:GIVEN_BY]->(u)
      `, { userId: user.id });

      const contributions = await userDAO.getUserContributions(user.id);

      expect(contributions.registered_resources_count).toBe(1);
      expect(contributions.given_feedbacks_count).toBe(2);
    });

    test('should return zero counts for non-existent user', async () => {
      const contributions = await userDAO.getUserContributions('nonexistent_user_12345');

      expect(contributions.registered_resources_count).toBe(0);
      expect(contributions.given_feedbacks_count).toBe(0);
    });
  });
});

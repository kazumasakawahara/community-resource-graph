/**
 * Test: Neo4j Database Setup
 * Requirement: 11 (Database Index Optimization)
 * Task: 1.3 Neo4jデータベースセットアップ
 */

const fs = require('fs');
const path = require('path');

describe('Neo4j Database Setup', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  test('docker-compose.yml should exist', () => {
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    expect(fs.existsSync(dockerComposePath)).toBe(true);
  });

  test('docker-compose.yml should define Neo4j 5.x service', () => {
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');

    // Check for Neo4j service
    expect(dockerComposeContent).toMatch(/services:/);
    expect(dockerComposeContent).toMatch(/neo4j:/);

    // Check for Neo4j 5.x image
    expect(dockerComposeContent).toMatch(/neo4j:5/);

    // Check for required environment variables
    expect(dockerComposeContent).toMatch(/NEO4J_AUTH/);

    // Check for port mappings
    expect(dockerComposeContent).toMatch(/7474/); // HTTP
    expect(dockerComposeContent).toMatch(/7687/); // Bolt
  });

  test('.env.example should have Neo4j configuration', () => {
    const envExamplePath = path.join(projectRoot, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const envContent = fs.readFileSync(envExamplePath, 'utf8');

    // Check for Neo4j configuration
    expect(envContent).toMatch(/NEO4J_URI/);
    expect(envContent).toMatch(/NEO4J_USERNAME/);
    expect(envContent).toMatch(/NEO4J_PASSWORD/);
  });

  test('Neo4j connection script should exist', () => {
    const connectionScriptPath = path.join(projectRoot, 'scripts', 'test-neo4j-connection.js');
    expect(fs.existsSync(connectionScriptPath)).toBe(true);
  });

  test('.gitignore should exclude .env files', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toMatch(/\.env/);
  });
});

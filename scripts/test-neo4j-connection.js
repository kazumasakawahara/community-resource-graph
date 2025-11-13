/**
 * Neo4j Connection Test Script
 *
 * Usage:
 *   node scripts/test-neo4j-connection.js
 *
 * Requirements:
 *   - Neo4j must be running (docker compose up neo4j)
 *   - .env file must contain NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function testConnection() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
  );

  try {
    console.log('🔄 Connecting to Neo4j...');
    console.log(`   URI: ${NEO4J_URI}`);
    console.log(`   Username: ${NEO4J_USERNAME}`);

    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('✅ Successfully connected to Neo4j');

    // Test query
    const session = driver.session();
    try {
      const result = await session.run('RETURN 1 AS num');
      const record = result.records[0];
      const num = record.get('num').toNumber();

      console.log(`✅ Test query successful (returned: ${num})`);

      // Get Neo4j version
      const versionResult = await session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version');
      const versionRecord = versionResult.records[0];
      const dbName = versionRecord.get('name');
      const dbVersion = versionRecord.get('version');

      console.log(`📊 Database: ${dbName} ${dbVersion}`);

      // Check database statistics
      const statsResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
      const nodeCount = statsResult.records[0].get('nodeCount').toNumber();

      console.log(`📈 Current node count: ${nodeCount}`);

    } finally {
      await session.close();
    }

    console.log('\n✅ All tests passed! Neo4j is ready.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure Neo4j is running: docker compose up neo4j');
      console.error('   2. Check if ports 7474 and 7687 are accessible');
      console.error('   3. Verify .env file contains correct credentials');
    }

    process.exit(1);

  } finally {
    await driver.close();
  }
}

testConnection();

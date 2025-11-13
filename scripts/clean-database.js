/**
 * Clean Database Script
 *
 * Completely removes all nodes and relationships from Neo4j
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function cleanDatabase() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
  );

  try {
    console.log('🔄 Connecting to Neo4j...');
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    const session = driver.session();

    try {
      console.log('🗑️  Deleting all nodes and relationships...');
      const deleteResult = await session.run('MATCH (n) DETACH DELETE n');
      console.log(`✅ Deleted nodes and relationships\n`);

      // Verify cleanup
      const countResult = await session.run('MATCH (n) RETURN count(n) as count');
      const remainingCount = countResult.records[0].get('count').toNumber();

      if (remainingCount === 0) {
        console.log('✅ Database is completely clean (0 nodes remaining)');
      } else {
        console.warn(`⚠️  Warning: ${remainingCount} nodes still remaining`);
      }

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    throw error;

  } finally {
    await driver.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDatabase()
    .then(() => {
      console.log('\n✅ Database cleanup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanDatabase };

/**
 * Neo4j Schema Initialization Script
 *
 * Creates constraints and indexes for optimal query performance
 *
 * Usage:
 *   node scripts/init-schema.js
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

dotenv.config({ path: resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function initSchema() {
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
      console.log('📋 Creating Uniqueness Constraints...\n');

      // User.email uniqueness
      console.log('  Creating User.email uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE'
      );
      console.log('  ✅ User.email constraint created');

      // Resource.id uniqueness
      console.log('  Creating Resource.id uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT resource_id_unique IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE'
      );
      console.log('  ✅ Resource.id constraint created');

      // User.id uniqueness
      console.log('  Creating User.id uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE'
      );
      console.log('  ✅ User.id constraint created');

      // Feedback.id uniqueness
      console.log('  Creating Feedback.id uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT feedback_id_unique IF NOT EXISTS FOR (f:Feedback) REQUIRE f.id IS UNIQUE'
      );
      console.log('  ✅ Feedback.id constraint created');

      // Need.id uniqueness
      console.log('  Creating Need.id uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT need_id_unique IF NOT EXISTS FOR (n:Need) REQUIRE n.id IS UNIQUE'
      );
      console.log('  ✅ Need.id constraint created');

      // Area.id uniqueness
      console.log('  Creating Area.id uniqueness constraint...');
      await session.run(
        'CREATE CONSTRAINT area_id_unique IF NOT EXISTS FOR (a:Area) REQUIRE a.id IS UNIQUE'
      );
      console.log('  ✅ Area.id constraint created');

      console.log('\n📊 Creating Indexes...\n');

      // Resource.name index
      console.log('  Creating Resource.name index...');
      await session.run(
        'CREATE INDEX resource_name_idx IF NOT EXISTS FOR (r:Resource) ON (r.name)'
      );
      console.log('  ✅ Resource.name index created');

      // Resource.type index
      console.log('  Creating Resource.type index...');
      await session.run(
        'CREATE INDEX resource_type_idx IF NOT EXISTS FOR (r:Resource) ON (r.type)'
      );
      console.log('  ✅ Resource.type index created');

      // Tag.name index
      console.log('  Creating Tag.name index...');
      await session.run(
        'CREATE INDEX tag_name_idx IF NOT EXISTS FOR (t:Tag) ON (t.name)'
      );
      console.log('  ✅ Tag.name index created');

      // Need.status index
      console.log('  Creating Need.status index...');
      await session.run(
        'CREATE INDEX need_status_idx IF NOT EXISTS FOR (n:Need) ON (n.status)'
      );
      console.log('  ✅ Need.status index created');

      // Area.name index
      console.log('  Creating Area.name index...');
      await session.run(
        'CREATE INDEX area_name_idx IF NOT EXISTS FOR (a:Area) ON (a.name)'
      );
      console.log('  ✅ Area.name index created');

      console.log('\n📈 Verifying Schema...\n');

      // Count constraints
      const constraintsResult = await session.run('SHOW CONSTRAINTS');
      const constraintsCount = constraintsResult.records.length;
      console.log(`  ✅ Constraints: ${constraintsCount}`);

      // Count indexes
      const indexesResult = await session.run('SHOW INDEXES');
      const indexesCount = indexesResult.records.length;
      console.log(`  ✅ Indexes: ${indexesCount}`);

      console.log('\n✅ Schema initialization completed successfully!');
      process.exit(0);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('\n❌ Schema initialization failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure Neo4j is running: docker compose up neo4j');
    }

    process.exit(1);

  } finally {
    await driver.close();
  }
}

initSchema();

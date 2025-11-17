/**
 * Create Vector Index in Neo4j
 *
 * Creates a vector index for semantic search on Resource nodes
 */

const neo4jDriver = require('../src/db/neo4j-driver');

async function createVectorIndex() {
  const session = neo4jDriver.getSession();

  try {
    console.log('Creating vector index for Resource nodes...');

    // Drop existing index if it exists
    try {
      await session.run('DROP INDEX resource_embedding_index IF EXISTS');
      console.log('Dropped existing vector index');
    } catch (err) {
      // Index might not exist, continue
    }

    // Create vector index
    // nomic-embed-text produces 768-dimensional vectors
    await session.run(`
      CREATE VECTOR INDEX resource_embedding_index IF NOT EXISTS
      FOR (r:Resource)
      ON r.embedding
      OPTIONS {
        indexConfig: {
          \`vector.dimensions\`: 768,
          \`vector.similarity_function\`: 'cosine'
        }
      }
    `);

    console.log('✅ Vector index created successfully');
    console.log('   - Index name: resource_embedding_index');
    console.log('   - Dimensions: 768');
    console.log('   - Similarity function: cosine');

  } catch (error) {
    console.error('❌ Error creating vector index:', error.message);
    throw error;
  } finally {
    await session.close();
  }
}

// Run if called directly
if (require.main === module) {
  createVectorIndex()
    .then(() => {
      console.log('\n✅ Vector index setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Vector index setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createVectorIndex };

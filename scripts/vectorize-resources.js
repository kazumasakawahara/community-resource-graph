/**
 * Vectorize Existing Resources
 *
 * Generate embeddings for all existing resources and store them in Neo4j
 */

const neo4jDriver = require('../src/db/neo4j-driver');
const { generateDocumentEmbedding, initializeEmbedder } = require('../src/services/embedding-service');

/**
 * Create searchable text from resource
 * Combines name, description, and tags
 * Tags are repeated 3 times to increase their importance in vector representation
 */
function createSearchableText(resource) {
  const parts = [];

  if (resource.name) parts.push(resource.name);
  if (resource.description) parts.push(resource.description);

  // Add tags if available - repeat 3 times for higher weight
  if (resource.tags && Array.isArray(resource.tags)) {
    const tagNames = resource.tags.map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
    if (tagNames.length > 0) {
      const tagText = tagNames.join(' ');
      // Repeat tags 3 times to give them higher importance in embeddings
      parts.push(tagText);
      parts.push(tagText);
      parts.push(tagText);
    }
  }

  return parts.join(' ');
}

async function vectorizeResources() {
  console.log('🚀 Starting resource vectorization...\n');

  // Initialize the embedding model first
  console.log('📦 Initializing embedding model...');
  await initializeEmbedder();
  console.log('✅ Model initialized\n');

  const session = neo4jDriver.getSession();

  try {
    // Get all resources
    console.log('📊 Fetching resources from database...');
    const result = await session.run(`
      MATCH (r:Resource)
      OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)
      RETURN r.id as id, r.name as name, r.description as description,
             collect(t.name) as tags
    `);

    const resources = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      tags: record.get('tags')
    }));

    console.log(`✅ Found ${resources.length} resources\n`);

    // Vectorize each resource
    let processed = 0;
    let failed = 0;

    for (const resource of resources) {
      try {
        // Create searchable text
        const text = createSearchableText(resource);

        if (!text || text.trim().length === 0) {
          console.log(`⚠️  Skipping ${resource.id} (no searchable text)`);
          continue;
        }

        // Generate embedding
        console.log(`🔄 Processing: ${resource.name || resource.id}`);
        const embedding = await generateDocumentEmbedding(text);

        // Store embedding in Neo4j
        await session.run(`
          MATCH (r:Resource {id: $id})
          SET r.embedding = $embedding,
              r.searchable_text = $searchableText
        `, {
          id: resource.id,
          embedding: embedding,
          searchableText: text
        });

        processed++;
        console.log(`✅ Processed ${processed}/${resources.length}: ${resource.name || resource.id}`);

      } catch (error) {
        failed++;
        console.error(`❌ Failed to process ${resource.id}:`, error.message);
      }
    }

    console.log(`\n📈 Vectorization complete:`);
    console.log(`   - Total resources: ${resources.length}`);
    console.log(`   - Successfully processed: ${processed}`);
    console.log(`   - Failed: ${failed}`);

  } catch (error) {
    console.error('❌ Error during vectorization:', error);
    throw error;
  } finally {
    await session.close();
  }
}

// Run if called directly
if (require.main === module) {
  vectorizeResources()
    .then(() => {
      console.log('\n✅ Resource vectorization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Resource vectorization failed:', error);
      process.exit(1);
    });
}

module.exports = { vectorizeResources, createSearchableText };

/**
 * Vectorize Existing Resources with Ollama
 *
 * Re-generate embeddings for all existing resources using Ollama (mxbai-embed-large)
 * and store them in Neo4j with 1024-dimensional vectors
 *
 * Usage:
 *   node scripts/vectorize-with-ollama.js [--dry-run] [--batch-size=N]
 *
 * Options:
 *   --dry-run        Simulate processing without updating database
 *   --batch-size=N   Number of resources to process in each batch (default: 10)
 */

const neo4jDriver = require('../src/db/neo4j-driver');
const { generateDocumentEmbedding, testConnection } = require('../src/services/ollama-embedding-service');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dryRun: false,
    batchSize: 10
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      const size = parseInt(arg.split('=')[1]);
      if (!isNaN(size) && size > 0) {
        config.batchSize = size;
      }
    }
  }

  return config;
}

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

async function vectorizeWithOllama() {
  const config = parseArgs();
  const startTime = Date.now();

  console.log('🚀 Starting resource vectorization with Ollama...\n');
  console.log(`📋 Configuration:`);
  console.log(`   - Dry run: ${config.dryRun ? 'Yes' : 'No'}`);
  console.log(`   - Batch size: ${config.batchSize}`);
  console.log('');

  // Test Ollama connection first
  console.log('🔍 Testing Ollama API connection...');
  const connected = await testConnection();

  if (!connected) {
    console.error('❌ Failed to connect to Ollama API');
    console.error('   Please ensure Ollama is running: ollama serve');
    console.error('   And the model is available: ollama pull nomic-embed-text');
    process.exit(1);
  }
  console.log('✅ Ollama API connection successful\n');

  const session = neo4jDriver.getSession();

  try {
    // Get all resources
    console.log('📊 Fetching resources from database...');
    const result = await session.run(`
      MATCH (r:Resource)
      OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)
      RETURN r.id as id, r.name as name, r.description as description,
             collect(t.name) as tags
      ORDER BY r.id
    `);

    const resources = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      tags: record.get('tags')
    }));

    console.log(`✅ Found ${resources.length} resources\n`);

    if (resources.length === 0) {
      console.log('ℹ️  No resources to process');
      return;
    }

    // Vectorize resources in batches
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < resources.length; i += config.batchSize) {
      const batch = resources.slice(i, Math.min(i + config.batchSize, resources.length));
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(resources.length / config.batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} resources)`);
      console.log('─'.repeat(60));

      for (const resource of batch) {
        try {
          // Create searchable text
          const text = createSearchableText(resource);

          if (!text || text.trim().length === 0) {
            console.log(`⚠️  [${processed + failed + skipped + 1}/${resources.length}] Skipping ${resource.id} (no searchable text)`);
            skipped++;
            continue;
          }

          // Generate embedding
          console.log(`🔄 [${processed + failed + skipped + 1}/${resources.length}] Processing: ${resource.name || resource.id}`);
          const embedding = await generateDocumentEmbedding(text);

          // Verify embedding dimensions
          if (!Array.isArray(embedding) || embedding.length !== 1024) {
            throw new Error(`Invalid embedding dimensions: expected 1024, got ${embedding?.length || 0}`);
          }

          // Store embedding in Neo4j (skip if dry-run)
          if (!config.dryRun) {
            await session.run(`
              MATCH (r:Resource {id: $id})
              SET r.embedding = $embedding,
                  r.searchable_text = $searchableText
            `, {
              id: resource.id,
              embedding: embedding,
              searchableText: text
            });
          }

          processed++;
          const percentage = ((processed + failed + skipped) / resources.length * 100).toFixed(1);
          console.log(`✅ [${processed + failed + skipped}/${resources.length} (${percentage}%)] ${config.dryRun ? 'Simulated' : 'Processed'}: ${resource.name || resource.id}`);

        } catch (error) {
          failed++;
          console.error(`❌ [${processed + failed + skipped}/${resources.length}] Failed to process ${resource.id}:`, error.message);
        }
      }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log(`📈 Vectorization ${config.dryRun ? 'Simulation' : 'Complete'}:`);
    console.log('─'.repeat(60));
    console.log(`   Total resources:      ${resources.length}`);
    console.log(`   Successfully processed: ${processed}`);
    console.log(`   Failed:                 ${failed}`);
    console.log(`   Skipped:                ${skipped}`);
    console.log(`   Processing time:        ${elapsedTime}s`);
    console.log(`   Average time/resource:  ${(elapsedTime / (processed + failed)).toFixed(2)}s`);
    console.log('═'.repeat(60));

    if (config.dryRun) {
      console.log('\n⚠️  This was a dry run. No data was actually updated.');
      console.log('   Run without --dry-run to perform actual vectorization.');
    }

  } catch (error) {
    console.error('\n❌ Error during vectorization:', error);
    throw error;
  } finally {
    await session.close();
  }
}

// Run if called directly
if (require.main === module) {
  vectorizeWithOllama()
    .then(() => {
      console.log('\n✅ Resource vectorization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Resource vectorization failed:', error);
      process.exit(1);
    });
}

module.exports = { vectorizeWithOllama, createSearchableText };

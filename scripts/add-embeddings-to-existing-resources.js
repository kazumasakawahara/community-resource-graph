/**
 * Add Embeddings to Existing Resources
 * 
 * このスクリプトは、既存の全資源にembeddingを生成して追加します。
 * セマンティック検索を有効にするために、一度だけ実行してください。
 */

require('dotenv').config();
const neo4jDriver = require('../src/db/neo4j-driver');
const { generateEmbedding } = require('../src/services/embedding-service');

async function addEmbeddingsToResources() {
  console.log('🚀 Starting embedding generation for existing resources...\n');

  const session = neo4jDriver.getSession();
  
  try {
    // Step 1: Get all resources without embeddings
    console.log('📊 Fetching resources without embeddings...');
    const result = await session.run(`
      MATCH (r:Resource)
      WHERE r.embedding IS NULL
      RETURN r.id as id, r.name as name, r.description as description
    `);

    const resources = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description')
    }));

    console.log(`✅ Found ${resources.length} resources without embeddings\n`);

    if (resources.length === 0) {
      console.log('🎉 All resources already have embeddings!');
      return;
    }

    // Step 2: Generate and save embeddings for each resource
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const progress = `[${i + 1}/${resources.length}]`;

      try {
        // Create text for embedding
        const textForEmbedding = `${resource.name}. ${resource.description || ''}`;
        
        console.log(`${progress} 🧠 Generating embedding for: "${resource.name}"`);
        
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding);
        console.log(`${progress} ✅ Embedding generated (${embedding.length} dimensions)`);
        
        // Save to database
        await session.run(
          `MATCH (r:Resource {id: $resourceId})
           SET r.embedding = $embedding`,
          { resourceId: resource.id, embedding: embedding }
        );
        
        console.log(`${progress} ✅ Saved to database\n`);
        successCount++;
        
      } catch (error) {
        console.error(`${progress} ❌ Error processing "${resource.name}":`, error.message);
        errorCount++;
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${successCount} resources`);
    console.log(`❌ Errors: ${errorCount} resources`);
    console.log(`📈 Total: ${resources.length} resources`);
    console.log('='.repeat(50) + '\n');

    if (successCount > 0) {
      console.log('🎉 Embeddings successfully added!');
      console.log('💡 You can now use semantic search with these resources.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await session.close();
    await neo4jDriver.close();
  }
}

// Run the script
addEmbeddingsToResources()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

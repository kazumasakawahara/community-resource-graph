import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:17687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'community-resource-dev-2024'
  )
);

async function checkEmbeddings() {
  const session = driver.session();

  try {
    // Check embeddings
    const result = await session.run(`
      MATCH (r:Resource)
      WHERE r.embedding IS NOT NULL
      WITH r, size(r.embedding) AS dim
      RETURN count(r) AS count, dim
      LIMIT 1
    `);

    if (result.records.length === 0) {
      console.log('❌ ベクトル埋め込みが存在しません');

      // Check if resources have description
      const descResult = await session.run(`
        MATCH (r:Resource)
        WHERE r.description IS NOT NULL
        RETURN count(r) AS count
      `);
      console.log(`📝 説明文を持つリソース: ${descResult.records[0].get('count')}件`);

    } else {
      const count = result.records[0].get('count').toNumber();
      const dim = result.records[0].get('dim').toNumber();
      console.log(`✅ ベクトル埋め込み: ${count}件`);
      console.log(`📊 次元数: ${dim}`);

      // Sample embedding
      const sampleResult = await session.run(`
        MATCH (r:Resource)
        WHERE r.embedding IS NOT NULL
        RETURN r.id, r.name, size(r.embedding) AS dim
        LIMIT 3
      `);

      console.log('\n📋 サンプル:');
      sampleResult.records.forEach(r => {
        console.log(`  - ${r.get('r.id')}: ${r.get('r.name')} (${r.get('dim')}次元)`);
      });
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

checkEmbeddings();

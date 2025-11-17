import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:17687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'community-resource-dev-2024'
  )
);

async function verifyNeo4jIntegrity() {
  const session = driver.session();

  try {
    console.log('=== Task 5.1: Neo4jプロパティとリレーションシップの確認 ===\n');

    // 1. 全50リソースが正しく作成されているか確認
    const resourceCountResult = await session.run('MATCH (r:Resource) RETURN count(r) AS count');
    const resourceCount = resourceCountResult.records[0].get('count').toNumber();
    console.log(`✅ 総リソース数: ${resourceCount} ${resourceCount === 50 ? '(期待値: 50)' : '❌ (期待値: 50)'}`);

    // 2. リソースIDが res_001 から res_050 まで連番であることを確認
    const idRangeResult = await session.run(`
      MATCH (r:Resource)
      WHERE r.id >= 'res_001' AND r.id <= 'res_050'
      RETURN count(r) AS count
    `);
    const idRangeCount = idRangeResult.records[0].get('count').toNumber();
    console.log(`✅ ID範囲(res_001-res_050): ${idRangeCount}件 ${idRangeCount === 50 ? '(正常)' : '❌ (異常)'}`);

    // 3. 既存プロパティが維持されているか確認
    const propertiesResult = await session.run(`
      MATCH (r:Resource)
      WHERE r.id IS NOT NULL
        AND r.name IS NOT NULL
        AND r.type IS NOT NULL
        AND r.description IS NOT NULL
        AND r.view_count IS NOT NULL
        AND r.feedback_count IS NOT NULL
        AND r.created_at IS NOT NULL
        AND r.updated_at IS NOT NULL
      RETURN count(r) AS count
    `);
    const propertiesCount = propertiesResult.records[0].get('count').toNumber();
    console.log(`✅ 必須プロパティ完備: ${propertiesCount}/50 ${propertiesCount === 50 ? '(全件OK)' : '❌ (一部欠損)'}`);

    // 4. リレーションシップ（LOCATED_IN, REGISTERED_BY, HAS_TAG）が正しく作成されているか確認
    const locatedInResult = await session.run('MATCH (r:Resource)-[:LOCATED_IN]->(a:Area) RETURN count(r) AS count');
    const locatedInCount = locatedInResult.records[0].get('count').toNumber();
    console.log(`\n📍 LOCATED_INリレーションシップ: ${locatedInCount}件 ${locatedInCount === 50 ? '✅' : '❌'}`);

    const registeredByResult = await session.run('MATCH (r:Resource)-[:REGISTERED_BY]->(u:User) RETURN count(r) AS count');
    const registeredByCount = registeredByResult.records[0].get('count').toNumber();
    console.log(`👤 REGISTERED_BYリレーションシップ: ${registeredByCount}件 ${registeredByCount === 50 ? '✅' : '❌'}`);

    const hasTagResult = await session.run('MATCH (r:Resource)-[:HAS_TAG]->(t:Tag) RETURN count(DISTINCT r) AS count');
    const hasTagCount = hasTagResult.records[0].get('count').toNumber();
    console.log(`🏷️  HAS_TAGリレーションシップ: ${hasTagCount}件のリソースにタグ付与 ${hasTagCount > 0 ? '✅' : '❌'}`);

    // 5. 説明文の確認
    const descLengthResult = await session.run(`
      MATCH (r:Resource)
      WHERE size(r.description) >= 100 AND size(r.description) <= 200
      RETURN count(r) AS count
    `);
    const descLengthCount = descLengthResult.records[0].get('count').toNumber();
    console.log(`\n📝 説明文長(100-200文字): ${descLengthCount}/50 ${descLengthCount === 50 ? '✅ (全件達成)' : '⚠️  (一部未達成)'}`);

    // 6. ベクトル埋め込みの確認
    const embeddingResult = await session.run(`
      MATCH (r:Resource)
      WHERE r.embedding IS NOT NULL
      RETURN count(r) AS count, size(r.embedding) AS dim
      LIMIT 1
    `);
    if (embeddingResult.records.length > 0) {
      const embeddingCount = embeddingResult.records[0].get('count').toNumber();
      const dimensions = embeddingResult.records[0].get('dim').toNumber();
      console.log(`🧠 ベクトル埋め込み: ${embeddingCount}/50件 (次元: ${dimensions}) ${embeddingCount === 50 && dimensions === 768 ? '✅' : '❌'}`);
    } else {
      console.log(`🧠 ベクトル埋め込み: 0/50件 ❌`);
    }

    // 最終判定
    const allChecksPass =
      resourceCount === 50 &&
      idRangeCount === 50 &&
      propertiesCount === 50 &&
      locatedInCount === 50 &&
      registeredByCount === 50 &&
      hasTagCount > 0 &&
      descLengthCount === 50;

    console.log('\n' + '='.repeat(60));
    if (allChecksPass) {
      console.log('🎉 全ての検証項目がパスしました！');
      process.exit(0);
    } else {
      console.log('⚠️  一部の検証項目が失敗しました');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

verifyNeo4jIntegrity();

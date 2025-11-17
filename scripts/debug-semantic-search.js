const BASE_URL = 'http://localhost:3000';

async function debugSemanticSearch() {
  const query = '静かな場所';

  console.log(`🔍 検索クエリ: "${query}"\n`);

  const response = await fetch(
    `${BASE_URL}/api/resources/search/semantic?query=${encodeURIComponent(query)}&limit=10`
  );

  const data = await response.json();
  const resources = data.data.resources;

  console.log(`📊 検索結果: ${resources.length}件\n`);

  // キーワード「静か」「落ち着」を含むリソースを特定
  const relevantIds = ['res_004', 'res_012', 'res_024', 'res_040'];

  console.log('=== 検索結果の分析 ===\n');

  resources.forEach((r, i) => {
    const rank = i + 1;
    const isRelevant = relevantIds.includes(r.id);
    const marker = isRelevant ? '✅ [RELEVANT]' : '⚠️';

    console.log(`${rank}位 ${marker}: ${r.id} - ${r.name} (${r.type})`);
    console.log(`   類似度: ${(r.similarity * 100).toFixed(1)}%`);
    console.log(`   説明: ${r.description.substring(0, 80)}...`);
    console.log();
  });

  // 期待されるリソースが何位にいるか確認
  console.log('\n=== 期待される「静かな場所」の順位 ===\n');
  relevantIds.forEach(id => {
    const index = resources.findIndex(r => r.id === id);
    if (index !== -1) {
      console.log(`✅ ${id}: ${index + 1}位 (類似度: ${(resources[index].similarity * 100).toFixed(1)}%)`);
    } else {
      console.log(`❌ ${id}: 見つかりませんでした (類似度が閾値0.5未満の可能性)`);
    }
  });
}

debugSemanticSearch().catch(console.error);

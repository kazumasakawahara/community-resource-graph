const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const resources = data.data.resources;
const relevantIds = ['res_004', 'res_012', 'res_024', 'res_040'];

console.log('検索クエリ:', data.data.query);
console.log('検索結果:', resources.length, '件\n');
console.log('=== 検索結果の分析 ===\n');

resources.forEach((r, i) => {
  const rank = i + 1;
  const isRelevant = relevantIds.includes(r.id);
  const marker = isRelevant ? 'RELEVANT' : 'OTHER';

  console.log(rank + '位 [' + marker + ']: ' + r.id + ' - ' + r.name + ' (' + r.type + ')');
  console.log('   類似度: ' + (r.similarity * 100).toFixed(1) + '%');
  console.log('   説明: ' + r.description.substring(0, 70) + '...');
  console.log();
});

console.log('=== 期待される「静かな場所」の順位 ===\n');
relevantIds.forEach(id => {
  const index = resources.findIndex(r => r.id === id);
  if (index !== -1) {
    console.log('✓ ' + id + ': ' + (index + 1) + '位 (類似度: ' + (resources[index].similarity * 100).toFixed(1) + '%)');
  } else {
    console.log('✗ ' + id + ': 見つかりませんでした (類似度が閾値0.5未満)');
  }
});

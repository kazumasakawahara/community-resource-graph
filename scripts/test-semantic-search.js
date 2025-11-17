const BASE_URL = 'http://localhost:3000';

const tests = [
  {
    id: '4.2',
    query: '静かな場所',
    expectedTypes: ['place'],
    expectedKeywords: ['静か', '落ち着', '集中'],
    minScores: [0.65, 0.60, 0.55]
  },
  {
    id: '4.3',
    query: '就労支援',
    expectedTypes: ['person', 'activity', 'information'],
    expectedKeywords: ['就労', '支援', 'ジョブ'],
    minScores: [0.70, 0.65, 0.60]
  },
  {
    id: '4.4',
    query: '初心者向け',
    expectedTypes: ['activity'],
    expectedKeywords: ['初心者', '歓迎', 'ゆっくり'],
    minScores: [0.60, 0.55, 0.50]
  },
  {
    id: '4.5',
    query: '車椅子',
    expectedTypes: ['place'],
    expectedKeywords: ['車椅子', 'バリアフリー', 'アクセス'],
    minScores: [0.65, 0.60, 0.55]
  }
];

async function testSemanticSearch(test) {
  console.log(`\n=== Task ${test.id}: ${test.query} ===\n`);

  try {
    const response = await fetch(
      `${BASE_URL}/api/resources/search/semantic?query=${encodeURIComponent(test.query)}&limit=3`
    );

    if (!response.ok) {
      console.error(`❌ HTTPエラー: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const resources = data.data.resources;

    if (!resources || resources.length === 0) {
      console.error('❌ 結果が空です');
      return false;
    }

    console.log(`📊 検索結果: ${resources.length}件\n`);

    let passed = true;

    // 各結果の検証
    resources.forEach((resource, index) => {
      const rank = index + 1;
      const score = resource.similarity;
      const minScore = test.minScores[index];
      const scorePass = score >= minScore;

      console.log(`${rank}位: ${resource.name} (${resource.type})`);
      console.log(`   類似度: ${(score * 100).toFixed(1)}% ${scorePass ? '✅' : '❌'} (最低基準: ${(minScore * 100).toFixed(0)}%)`);
      console.log(`   説明: ${resource.description.substring(0, 80)}...`);
      console.log('');

      if (!scorePass) {
        passed = false;
      }
    });

    // タイプチェック
    const topType = resources[0].type;
    const typePass = test.expectedTypes.includes(topType);
    console.log(`📋 タイプチェック: 1位のタイプ=${topType} ${typePass ? '✅' : '❌'}`);
    console.log(`   期待タイプ: ${test.expectedTypes.join(', ')}`);

    if (!typePass) {
      passed = false;
    }

    // キーワードチェック
    const topDescription = resources[0].description;
    const matchedKeywords = test.expectedKeywords.filter(kw => topDescription.includes(kw));
    const keywordPass = matchedKeywords.length > 0;
    console.log(`🔑 キーワードチェック: ${keywordPass ? '✅' : '❌'}`);
    console.log(`   マッチしたキーワード: ${matchedKeywords.join(', ') || 'なし'}`);

    if (!keywordPass) {
      passed = false;
    }

    return passed;

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 セマンティック検索テスト開始\n');
  console.log('=========================================');

  const results = [];

  for (const test of tests) {
    const passed = await testSemanticSearch(test);
    results.push({ id: test.id, query: test.query, passed });
  }

  console.log('\n=========================================');
  console.log('\n📊 テスト結果サマリー:\n');

  let passCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  Task ${result.id} (${result.query}): ${status}`);
    if (result.passed) passCount++;
  });

  console.log(`\n合計: ${passCount}/${results.length} テストパス (${((passCount/results.length)*100).toFixed(1)}%)`);

  if (passCount === results.length) {
    console.log('\n🎉 全テストパス！');
    process.exit(0);
  } else {
    console.log('\n⚠️  一部テストが失敗しました');
    process.exit(1);
  }
}

// サーバー起動確認
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ サーバー接続確認OK\n');
      return true;
    }
  } catch (error) {
    console.error('❌ サーバーに接続できません。先にサーバーを起動してください。');
    console.error('   OLLAMA_BASE_URL=http://localhost:11434 npm start');
    process.exit(1);
  }
}

checkServer().then(() => runAllTests());

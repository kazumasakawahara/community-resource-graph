import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function verifyDescriptions() {
  const session = driver.session();

  try {
    // 全リソースの説明文を取得
    const result = await session.run(`
      MATCH (r:Resource)
      RETURN r.id AS id, r.name AS name, r.type AS type, r.description AS description
      ORDER BY r.id
    `);

    console.log('📊 説明文検証結果\n');

    const resources = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      type: record.get('type'),
      description: record.get('description')
    }));

    // Task 3.1: 文字数と多様性の検証
    console.log('=== Task 3.1: 文字数と多様性の検証 ===\n');

    let totalCount = 0;
    let validCount = 0;
    const lengthIssues = [];
    const typeGroups = {};

    resources.forEach(r => {
      totalCount++;
      const length = r.description.length;

      if (length >= 100 && length <= 200) {
        validCount++;
      } else {
        lengthIssues.push({ id: r.id, length, description: r.description.substring(0, 50) });
      }

      if (!typeGroups[r.type]) {
        typeGroups[r.type] = [];
      }
      typeGroups[r.type].push(r.description);
    });

    console.log(`✅ 文字数検証: ${validCount}/${totalCount} リソースが100-200文字範囲内`);

    if (lengthIssues.length > 0) {
      console.log(`⚠️  文字数範囲外のリソース (${lengthIssues.length}件):`);
      lengthIssues.forEach(issue => {
        console.log(`   - ${issue.id}: ${issue.length}文字 "${issue.description}..."`);
      });
    }

    // 多様性チェック
    console.log('\n📋 タイプ別多様性チェック:');
    Object.entries(typeGroups).forEach(([type, descriptions]) => {
      const uniqueCount = new Set(descriptions).size;
      console.log(`   - ${type}: ${uniqueCount}/${descriptions.length} 種類（重複: ${descriptions.length - uniqueCount}件）`);

      if (uniqueCount < descriptions.length) {
        // 重複を検出
        const duplicates = descriptions.filter((desc, index) => descriptions.indexOf(desc) !== index);
        console.log(`     ⚠️  重複あり: ${new Set(duplicates).size}種類の説明文が重複`);
      }
    });

    // Task 3.2: タイプ別必須情報の検証
    console.log('\n=== Task 3.2: タイプ別必須情報の検証 ===\n');

    const keywords = {
      place: ['雰囲気', 'バリアフリー', '車椅子', '駐車場', '開館', '営業', 'アクセス', '施設'],
      person: ['専門', '支援', '相談', '対応', '障害', 'サポート'],
      activity: ['初心者', '経験者', '開催', '参加費', '教室', 'プログラム'],
      information: ['ガイド', 'リスト', 'マップ', '更新', '情報', 'PDF', 'Web', 'アプリ']
    };

    Object.entries(typeGroups).forEach(([type, descriptions]) => {
      const typeKeywords = keywords[type] || [];
      let matchCount = 0;

      descriptions.forEach(desc => {
        const matches = typeKeywords.filter(kw => desc.includes(kw));
        if (matches.length > 0) {
          matchCount++;
        }
      });

      const percentage = ((matchCount / descriptions.length) * 100).toFixed(1);
      console.log(`   - ${type}: ${matchCount}/${descriptions.length} (${percentage}%) がキーワードを含む`);
    });

    // サンプル表示
    console.log('\n📝 タイプ別説明文サンプル (各タイプ最初の2件):\n');
    Object.entries(typeGroups).forEach(([type, descriptions]) => {
      console.log(`--- ${type} タイプ ---`);
      descriptions.slice(0, 2).forEach((desc, index) => {
        console.log(`${index + 1}. (${desc.length}文字) ${desc.substring(0, 80)}...`);
      });
      console.log('');
    });

    // 最終サマリー
    console.log('=== 検証サマリー ===');
    console.log(`✅ 総リソース数: ${totalCount}`);
    console.log(`✅ 文字数要件達成: ${validCount}/${totalCount} (${((validCount/totalCount)*100).toFixed(1)}%)`);
    console.log(`✅ 重複なし: ${Object.values(typeGroups).every(descs => new Set(descs).size === descs.length) ? 'はい' : 'いいえ'}`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

verifyDescriptions();

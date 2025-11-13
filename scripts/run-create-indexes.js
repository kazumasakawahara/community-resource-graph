// インデックス作成を実行するNode.jsスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'community-resource-dev-2024';

async function createIndexes() {
  console.log('🚀 Neo4jインデックス作成スクリプトを開始します...');
  console.log(`📡 接続先: ${NEO4J_URI}`);

  // Neo4jドライバ作成
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
  );

  const session = driver.session();

  try {
    // Cypherファイルの読み込み
    const cypherFile = path.join(__dirname, 'create-indexes.cypher');
    const cypherContent = fs.readFileSync(cypherFile, 'utf-8');

    // コメント行と空行を除去してクエリを分割
    const queries = cypherContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('//');
      })
      .join('\n')
      .split(';')
      .filter(query => query.trim());

    console.log(`📋 ${queries.length}個のインデックスを作成します...\n`);

    // 各クエリを実行
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (!query) continue;

      console.log(`[${i + 1}/${queries.length}] 実行中...`);
      console.log(`  ${query.substring(0, 80)}...`);

      try {
        const result = await session.run(query);
        console.log(`  ✅ 成功`);
        
        // 結果の詳細を表示
        if (result.summary && result.summary.notifications) {
          result.summary.notifications.forEach(notification => {
            console.log(`     ℹ️  ${notification.description}`);
          });
        }
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
    }

    console.log('\n✨ すべてのインデックス作成処理が完了しました！');

    // 作成されたインデックスの確認
    console.log('\n📊 作成されたインデックスの確認:');
    const indexResult = await session.run('SHOW INDEXES');
    indexResult.records.forEach(record => {
      const name = record.get('name');
      const type = record.get('type');
      const state = record.get('state');
      console.log(`  - ${name} (${type}): ${state}`);
    });

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
    console.log('\n🔌 Neo4j接続をクローズしました');
  }
}

// メイン実行
createIndexes()
  .then(() => {
    console.log('\n🎉 スクリプトが正常に完了しました！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
  });

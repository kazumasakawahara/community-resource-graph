// データベース完全リセットスクリプト
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'community-resource-dev-2024';

async function resetDatabase() {
  console.log('🗑️  Neo4jデータベースリセットスクリプトを開始します...');
  console.log(`📡 接続先: ${NEO4J_URI}`);
  console.log('⚠️  警告: すべてのデータが削除されます！\n');

  // Neo4jドライバ作成
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
  );

  const session = driver.session();

  try {
    // ノード数を確認
    console.log('📊 データベースの現状:');
    const countResult = await session.run('MATCH (n) RETURN count(n) as count');
    const nodeCount = countResult.records[0].get('count').toNumber();
    console.log(`  - ノード数: ${nodeCount}`);

    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const relCount = relResult.records[0].get('count').toNumber();
    console.log(`  - リレーションシップ数: ${relCount}\n`);

    if (nodeCount === 0) {
      console.log('✨ データベースは既に空です！');
      return;
    }

    // すべてのデータを削除
    console.log('🧹 すべてのノードとリレーションシップを削除中...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ 削除完了\n');

    // 削除確認
    const verifyResult = await session.run('MATCH (n) RETURN count(n) as count');
    const remainingNodes = verifyResult.records[0].get('count').toNumber();
    
    if (remainingNodes === 0) {
      console.log('✨ データベースが正常にリセットされました！');
    } else {
      console.warn(`⚠️  警告: ${remainingNodes}個のノードが残っています`);
    }

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
resetDatabase()
  .then(() => {
    console.log('\n🎉 スクリプトが正常に完了しました！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
  });

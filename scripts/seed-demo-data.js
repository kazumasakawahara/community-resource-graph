/**
 * Demo Data Seeding Script
 *
 * Generates initial demo data for development and testing
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *
 * Data generated:
 *   - Areas (北九州市エリア)
 *   - Tags (atmosphere, accessibility, cost categories)
 *   - Users (5 users with different roles)
 *   - Resources (50 resources)
 *   - Feedback (10 feedback entries)
 *   - Needs (5 needs)
 *   - Connections (20 RELATED_TO relationships)
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:17687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function seedDemoData() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
  );

  try {
    console.log('🔄 Connecting to Neo4j...');
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    const session = driver.session();

    try {
      // Clear existing data
      console.log('🗑️  Clearing existing data...');
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('✅ Existing data cleared\n');

      // Create Areas
      console.log('📍 Creating Areas...');
      await session.run(`
        CREATE
          (a1:Area {id: 'area_001', name: '小倉北区', city: '北九州市', prefecture: '福岡県', created_at: datetime()}),
          (a2:Area {id: 'area_002', name: '小倉南区', city: '北九州市', prefecture: '福岡県', created_at: datetime()}),
          (a3:Area {id: 'area_003', name: '八幡東区', city: '北九州市', prefecture: '福岡県', created_at: datetime()}),
          (a4:Area {id: 'area_004', name: '八幡西区', city: '北九州市', prefecture: '福岡県', created_at: datetime()}),
          (a5:Area {id: 'area_005', name: '戸畑区', city: '北九州市', prefecture: '福岡県', created_at: datetime()})
      `);
      console.log('✅ 5 Areas created\n');

      // Create Tags
      console.log('🏷️  Creating Tags...');
      await session.run(`
        CREATE
          (t1:Tag {id: 'tag_001', name: '静か', category: 'atmosphere', usage_count: 0}),
          (t2:Tag {id: 'tag_002', name: 'にぎやか', category: 'atmosphere', usage_count: 0}),
          (t3:Tag {id: 'tag_003', name: 'バリアフリー', category: 'accessibility', usage_count: 0}),
          (t4:Tag {id: 'tag_004', name: '車椅子対応', category: 'accessibility', usage_count: 0}),
          (t5:Tag {id: 'tag_005', name: '無料', category: 'cost', usage_count: 0}),
          (t6:Tag {id: 'tag_006', name: '低料金', category: 'cost', usage_count: 0}),
          (t7:Tag {id: 'tag_007', name: '理解がある', category: 'atmosphere', usage_count: 0}),
          (t8:Tag {id: 'tag_008', name: '駐車場あり', category: 'accessibility', usage_count: 0}),
          (t9:Tag {id: 'tag_009', name: '平日利用可', category: 'availability', usage_count: 0}),
          (t10:Tag {id: 'tag_010', name: '土日利用可', category: 'availability', usage_count: 0})
      `);
      console.log('✅ 10 Tags created\n');

      // Create Users
      console.log('👥 Creating Users...');
      await session.run(`
        CREATE
          (u1:User {id: 'user_001', name: '田中太郎', email: 'tanaka@example.com', role: 'supporter', organization: 'NPO法人あすなろ', created_at: datetime()}),
          (u2:User {id: 'user_002', name: '佐藤花子', email: 'sato@example.com', role: 'supporter', organization: '相談支援事業所みらい', created_at: datetime()}),
          (u3:User {id: 'user_003', name: '鈴木一郎', email: 'suzuki@example.com', role: 'individual', organization: null, created_at: datetime()}),
          (u4:User {id: 'user_004', name: '山田美咲', email: 'yamada@example.com', role: 'family', organization: null, created_at: datetime()}),
          (u5:User {id: 'user_005', name: '伊藤健太', email: 'ito@example.com', role: 'resident', organization: null, created_at: datetime()})
      `);
      console.log('✅ 5 Users created\n');

      // Create Resources (50 resources)
      console.log('🏢 Creating Resources...');
      const resourceTypes = ['place', 'person', 'activity', 'information'];
      const resourceData = [];

      for (let i = 1; i <= 50; i++) {
        const type = resourceTypes[i % resourceTypes.length];
        const areaId = `area_00${(i % 5) + 1}`;
        const userId = `user_00${(i % 5) + 1}`;

        resourceData.push({
          id: `res_${String(i).padStart(3, '0')}`,
          name: getResourceName(type, i),
          type: type,
          description: `${type}タイプの資源です。`,
          view_count: Math.floor(Math.random() * 50),
          feedback_count: 0,
          area_id: areaId,
          user_id: userId
        });
      }

      for (const resource of resourceData) {
        await session.run(`
          MATCH (a:Area {id: $area_id}), (u:User {id: $user_id})
          CREATE (r:Resource {
            id: $id,
            name: $name,
            type: $type,
            description: $description,
            view_count: $view_count,
            feedback_count: $feedback_count,
            created_at: datetime(),
            updated_at: datetime()
          })
          CREATE (r)-[:LOCATED_IN]->(a)
          CREATE (r)-[:REGISTERED_BY]->(u)
        `, resource);
      }
      console.log('✅ 50 Resources created\n');

      // Add tags to resources
      console.log('🔗 Adding tags to resources...');
      for (let i = 1; i <= 50; i++) {
        const resourceId = `res_${String(i).padStart(3, '0')}`;
        const tagIds = [
          `tag_00${(i % 10) + 1}`,
          `tag_00${((i + 1) % 10) + 1}`
        ];

        for (const tagId of tagIds) {
          await session.run(`
            MATCH (r:Resource {id: $resourceId}), (t:Tag {id: $tagId})
            CREATE (r)-[:HAS_TAG]->(t)
            SET t.usage_count = t.usage_count + 1
          `, { resourceId, tagId });
        }
      }
      console.log('✅ Tags linked to resources\n');

      // Create Feedback (10 feedback entries)
      console.log('💬 Creating Feedback...');
      for (let i = 1; i <= 10; i++) {
        const resourceId = `res_${String(i * 5).padStart(3, '0')}`;
        const userId = `user_00${(i % 5) + 1}`;

        await session.run(`
          MATCH (r:Resource {id: $resourceId}), (u:User {id: $userId})
          CREATE (f:Feedback {
            id: $feedbackId,
            content: '実際に訪問しました。とても良い場所でした。',
            visit_date: date(),
            helpful_count: $helpfulCount,
            created_at: datetime()
          })
          CREATE (r)-[:HAS_FEEDBACK]->(f)
          CREATE (f)-[:GIVEN_BY]->(u)
          SET r.feedback_count = r.feedback_count + 1
        `, {
          resourceId,
          userId,
          feedbackId: `feedback_${String(i).padStart(3, '0')}`,
          helpfulCount: Math.floor(Math.random() * 10)
        });
      }
      console.log('✅ 10 Feedback entries created\n');

      // Create Needs (5 needs)
      console.log('🔍 Creating Needs...');
      const needsData = [
        { title: '静かなカフェを探しています', target: '精神障害', purpose: 'リラックスできる場所', status: 'open', areaId: 'area_001' },
        { title: 'バリアフリーの図書館', target: '身体障害', purpose: '読書活動', status: 'open', areaId: 'area_002' },
        { title: '就労支援事業所の情報', target: '知的障害', purpose: '就労訓練', status: 'matched', areaId: 'area_003' },
        { title: 'スポーツができる施設', target: '発達障害', purpose: '運動活動', status: 'open', areaId: 'area_004' },
        { title: 'ピアサポートグループ', target: '精神障害', purpose: '仲間作り', status: 'open', areaId: 'area_005' }
      ];

      for (let i = 0; i < needsData.length; i++) {
        const need = needsData[i];
        const userId = `user_00${(i % 5) + 1}`;

        await session.run(`
          MATCH (a:Area {id: $areaId}), (u:User {id: $userId})
          CREATE (n:Need {
            id: $needId,
            title: $title,
            description: $title,
            target: $target,
            purpose: $purpose,
            status: $status,
            view_count: $viewCount,
            created_at: datetime()
          })
          CREATE (n)-[:IN_AREA]->(a)
          CREATE (n)-[:RECORDED_BY]->(u)
        `, {
          needId: `need_${String(i + 1).padStart(3, '0')}`,
          title: need.title,
          target: need.target,
          purpose: need.purpose,
          status: need.status,
          areaId: need.areaId,
          userId,
          viewCount: Math.floor(Math.random() * 20)
        });
      }
      console.log('✅ 5 Needs created\n');

      // Create RELATED_TO relationships (20 connections)
      console.log('🔗 Creating resource connections...');
      for (let i = 1; i <= 20; i++) {
        const fromId = `res_${String(i).padStart(3, '0')}`;
        const toId = `res_${String(i + 10).padStart(3, '0')}`;
        const relationTypes = ['nearby', 'similar', 'sequential'];
        const relationType = relationTypes[i % relationTypes.length];

        await session.run(`
          MATCH (r1:Resource {id: $fromId}), (r2:Resource {id: $toId})
          CREATE (r1)-[:RELATED_TO {
            relation_type: $relationType,
            description: '関連する資源です',
            created_at: datetime()
          }]->(r2)
        `, { fromId, toId, relationType });
      }
      console.log('✅ 20 RELATED_TO relationships created\n');

      // Display statistics
      console.log('📊 Data Statistics:\n');

      const areaCount = await session.run('MATCH (a:Area) RETURN count(a) as count');
      const tagCount = await session.run('MATCH (t:Tag) RETURN count(t) as count');
      const userCount = await session.run('MATCH (u:User) RETURN count(u) as count');
      const resourceCount = await session.run('MATCH (r:Resource) RETURN count(r) as count');
      const feedbackCount = await session.run('MATCH (f:Feedback) RETURN count(f) as count');
      const needCount = await session.run('MATCH (n:Need) RETURN count(n) as count');
      const relatedToCount = await session.run('MATCH ()-[r:RELATED_TO]->() RETURN count(r) as count');
      const totalRelCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');

      console.log(`  Areas: ${areaCount.records[0].get('count').toNumber()}`);
      console.log(`  Tags: ${tagCount.records[0].get('count').toNumber()}`);
      console.log(`  Users: ${userCount.records[0].get('count').toNumber()}`);
      console.log(`  Resources: ${resourceCount.records[0].get('count').toNumber()}`);
      console.log(`  Feedback: ${feedbackCount.records[0].get('count').toNumber()}`);
      console.log(`  Needs: ${needCount.records[0].get('count').toNumber()}`);
      console.log(`  RELATED_TO: ${relatedToCount.records[0].get('count').toNumber()}`);
      console.log(`  Total Relationships: ${totalRelCount.records[0].get('count').toNumber()}`);

      console.log('\n✅ Demo data seeding completed successfully!');
      process.exit(0);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('\n❌ Demo data seeding failed:', error.message);
    process.exit(1);

  } finally {
    await driver.close();
  }
}

function getResourceName(type, index) {
  const names = {
    place: [
      'コミュニティカフェ', '図書館', '公園', '体育館', '文化センター',
      '地域活動支援センター', 'デイケア施設', '就労支援事業所', '作業所', '相談支援事業所'
    ],
    person: [
      '相談支援専門員', 'ピアサポーター', 'ジョブコーチ', '臨床心理士', '社会福祉士',
      '精神保健福祉士', '作業療法士', '理学療法士', 'ケアマネージャー', '生活支援員'
    ],
    activity: [
      '料理教室', '運動プログラム', 'アート活動', '音楽療法', '園芸療法',
      'ヨガ教室', 'ウォーキング会', '読書会', '手芸サークル', 'パソコン教室'
    ],
    information: [
      '障害者手帳申請ガイド', '就労移行支援ガイド', '福祉サービス一覧', '相談窓口リスト', '地域イベント情報',
      '医療機関リスト', '交通機関情報', 'バリアフリーマップ', '支援制度ガイド', '当事者会情報'
    ]
  };

  const nameList = names[type] || names.place;
  return `${nameList[index % nameList.length]}${Math.floor(index / nameList.length) + 1}`;
}

seedDemoData();

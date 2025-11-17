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
      const typeCounters = { place: 0, person: 0, activity: 0, information: 0 };

      for (let i = 1; i <= 50; i++) {
        const type = resourceTypes[i % resourceTypes.length];
        const typeIndex = typeCounters[type];
        typeCounters[type]++;
        const areaId = `area_00${(i % 5) + 1}`;
        const userId = `user_00${(i % 5) + 1}`;

        resourceData.push({
          id: `res_${String(i).padStart(3, '0')}`,
          name: getResourceName(type, typeIndex),
          type: type,
          description: getResourceDescription(type, getResourceName(type, typeIndex), typeIndex),
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

function getResourceDescription(type, name, index) {
  const descriptions = {
    place: [
      '静かで落ち着いた雰囲気のコミュニティスペース。車椅子でのアクセスも可能で、バリアフリー対応済み。平日10-17時営業、無料でご利用いただけます。相談支援専門員が常駐しており、安心してご利用いただけます。読書や軽作業、仲間との交流など自由に過ごせる場所です。',
      '明るくにぎやかな交流施設。駐車場完備で車でのアクセスが便利です。土日も利用可能で、低料金でご利用いただけます。初めての方でも気軽に立ち寄れる雰囲気で、障害理解のあるスタッフが常駐しています。様々なイベントや交流会も定期的に開催しています。',
      '駅から徒歩3分の好立地にある支援センター。バリアフリー設計で車椅子の方も安心してご利用できます。月曜から金曜まで毎日開館、無料Wi-Fiも完備。静かな環境で読書や作業ができます。コーヒーや軽食も無料で提供しており、リラックスして過ごせます。',
      '広々とした空間が特徴的な活動拠点。グループ活動に最適な大部屋と、個別相談用の小部屋を完備。駐車スペースあり、平日夜20時まで利用可能。就労支援や生活相談にも対応しています。地域の様々な団体が活動する交流の場として機能しています。',
      '自然光が入る明るい雰囲気の憩いの場。段差のないフラットな構造で移動がスムーズです。平日9-18時開館、利用料300円。ピアサポーターが常駐し、同じ悩みを持つ仲間と出会えます。心地よい空間で気軽に立ち寄れる居場所として親しまれています。',
      '落ち着いた色調の内装が特徴の静養スペース。防音設計で外の音が気にならず、集中して過ごせます。月-土曜10-19時営業、無料。感覚過敏の方にも配慮した環境です。個別のスペースもあり、一人でゆっくり過ごしたい方にも最適です。',
      '多目的に利用できる地域交流施設。イベントスペースと休憩エリアを併設。バリアフリートイレ完備、駐車場20台分あり。土日祝も開館、利用料500円。様々な活動や相談会が定期開催されています。地域の拠点として多くの方に利用されています。',
      '緑に囲まれた開放的な環境の支援施設。テラス席もあり、天気の良い日は外でリラックスできます。平日10-16時開館、無料。作業療法士による相談も月2回実施しています。自然を感じながらゆったりと過ごせる癒しの空間です。',
      'アクセス便利な駅前施設。エレベーター完備で上階もスムーズに移動可能。毎日8-20時営業、低料金制。就労相談、生活相談、家族支援など幅広いニーズに対応できる総合支援拠点です。早朝から夜間まで利用できる便利な施設として好評です。',
      '静かで集中できる学習・作業スペース。個別ブースとグループエリアを使い分け可能。無料Wi-Fi、電源完備。平日9-17時開館、無料。精神保健福祉士による定期面談も実施しています。就労準備や資格取得の学習など目標を持って取り組める環境を提供します。',
      '和やかな雰囲気の交流サロン。お茶やコーヒーを飲みながらゆっくり過ごせます。車椅子対応トイレあり、駐車場完備。火-土曜10-18時営業、利用料200円。ピアサポート活動の拠点にもなっています。誰でも気軽に立ち寄れる地域の居場所です。',
      '新しくオープンした多機能支援センター。最新のバリアフリー設備で誰でも安心して利用できます。月-金曜9-19時、土曜9-17時営業、無料。各種相談窓口、就労訓練、交流イベントを一体的に提供しています。総合的な支援を受けられるワンストップ拠点として期待されています。'
    ],
    person: [
      '就労支援を専門とする相談支援専門員。精神障害・発達障害の方への支援経験が豊富です。平日9-18時に相談可能で、丁寧なヒアリングと具体的なアドバイスを提供します。ハローワークとの連携もスムーズで、企業とのマッチングも得意としています。',
      '家族支援に強い臨床心理士。当事者だけでなく、ご家族の悩みにも寄り添います。週2回の定期相談と緊急時の電話対応が可能。家族関係の調整や、介護負担の軽減についてもサポートします。心理療法の専門知識を活かした支援を提供しています。',
      '障害者の就労を専門的に支援するジョブコーチ。企業と本人の橋渡し役として、職場定着までフォローします。実務経験20年以上のベテランで、様々な業種での就労支援実績があります。職場での困りごとにも迅速に対応します。',
      '生活リハビリを専門とする作業療法士。日常生活動作の向上や、自立した生活のための訓練を提供します。平日10-17時対応可能。個別プログラムを作成し、一人ひとりのペースに合わせて支援します。福祉用具の選定相談も承っています。',
      '精神保健福祉士として10年以上の経験を持つ相談員。医療機関との連携が強く、服薬管理や通院支援も丁寧に対応します。月-金曜9-17時相談可能。リカバリーを大切にした支援を心がけています。当事者の声を尊重した寄り添い型の支援を実践しています。',
      'ピアサポート活動を長年実践してきた当事者スタッフ。自身の経験を活かし、同じ立場だからこそできる寄り添った支援を提供します。週3回活動中で、グループミーティングのファシリテーターも担当しています。仲間づくりの支援も得意としています。',
      '社会福祉士として障害者福祉全般に精通した相談員。制度活用のアドバイスや各種申請手続きのサポートが得意です。平日9-18時対応可能。複雑なケースにも丁寧に向き合い、関係機関との調整も行います。権利擁護の視点を大切にしています。',
      '理学療法士として身体機能の回復・維持をサポート。障害のある方の運動プログラム作成と実施を担当します。火・木・土曜に対応可能。個別訓練だけでなく、グループでの運動指導も実施しています。在宅での訓練プログラムの提案も行います。',
      'キャリアカウンセリングの資格を持つ就労支援員。個々の強みを活かした就職先のマッチングが得意です。履歴書添削、面接練習も丁寧に指導。平日10-19時対応で、夜間相談も受け付けています。職場定着支援も充実しており、長期的にサポートします。',
      '知的障害者の支援を専門とする生活支援員。分かりやすい説明と丁寧なサポートで日常生活をバックアップします。月-金曜8-17時対応。買い物同行、金銭管理、公共交通機関の利用練習なども実施しています。本人の意思を尊重した支援を心がけています。',
      '保健師として地域の健康支援を担当。障害のある方の健康管理や生活習慣のアドバイスを提供します。月2回の定期相談会を開催。医療機関との連携も強く、適切な受診につなげることができます。予防医学の観点から健康づくりをサポートします。',
      'ケアマネージャーとして福祉サービスのコーディネートを担当。一人ひとりのニーズに合わせた支援計画を作成します。平日9-17時対応。介護保険サービスや障害福祉サービスの組み合わせも柔軟に提案します。定期的なモニタリングで質の高い支援を提供します。'
    ],
    activity: [
      '初心者向けのゆっくりペース料理教室。毎週火曜10-12時開催で、参加費500円です。包丁の使い方から丁寧に教えます。障害理解のあるスタッフがサポートし、楽しく調理技術を身につけられます。栄養バランスの取れたメニューで健康的な食生活を応援します。',
      '経験者向けのアクティブな運動プログラム。週2回開催で、体力づくりとストレス発散に最適です。理学療法士が指導するので安全に運動できます。仲間と一緒に楽しく体を動かせる人気プログラムです。個人の体力レベルに合わせた指導を行います。',
      '初めての方でも気軽に参加できるアート活動。毎週木曜14-16時開催、参加費300円。絵画、工作、陶芸など様々な創作活動を体験できます。自己表現の場として、また仲間づくりの機会としても好評です。作品は展示会で発表する機会もあります。',
      '穏やかな音楽療法セッション。月2回開催で、楽器演奏や歌唱を通じてリラクゼーションと自己表現を促進します。音楽経験不要、参加費無料。音楽療法士が丁寧にファシリテートし、安心して参加できます。心身のリフレッシュと仲間との交流を楽しめます。',
      '季節の野菜を育てる園芸療法プログラム。毎週水曜10-12時開催、参加費200円。土に触れ、植物の成長を楽しみながら、心身のリフレッシュを図ります。作業療法士が無理のないペースで指導します。収穫した野菜はお持ち帰りいただけます。',
      '初心者歓迎のヨガ教室。毎週月曜9-10時開催で、参加費400円です。ゆったりとした動きで体をほぐし、呼吸法でリラックス。ヨガインストラクターが一人ひとりの体調に合わせて丁寧に指導します。心と体のバランスを整えることを大切にしています。',
      '月1回のウォーキング会。毎月第2土曜10-12時開催、参加費無料。公園や川沿いを歩きながら、自然を楽しみ仲間と交流します。ゆっくりペースで、休憩も多めに取るので誰でも参加しやすいです。季節の変化を感じながら健康づくりを楽しめます。',
      '本好きが集まる読書会。月2回開催で参加費無料。お気に入りの本を紹介し合い、感想を共有します。静かな雰囲気で、読書を通じた交流が楽しめます。初めての方でも気軽に参加できる和やかな会です。新しい本との出会いや読書の幅を広げる機会になります。',
      '手芸サークルで小物作り。毎週金曜13-15時開催、参加費300円（材料費込み）。編み物、刺繍、ビーズアクセサリーなど、様々な手芸を楽しめます。初心者にも丁寧に教えるので、新しい趣味として始められます。作品を通じた達成感と仲間との交流を楽しめます。',
      '基礎から学べるパソコン教室。毎週水曜13-15時開催、参加費500円。文字入力、インターネット検索、メール送信など、生活に役立つスキルを習得できます。少人数制で質問しやすく、じっくり学べます。デジタル社会で自信を持って生活できるよう支援します。',
      'リラックスできる茶話会。毎週土曜14-16時開催、参加費200円（お茶・お菓子付き）。お茶を飲みながら自由におしゃべりできる気軽な交流の場です。同じ悩みを持つ仲間と出会い、情報交換もできます。ピアサポートの場としても機能しています。',
      '体験型の社会見学プログラム。月1回開催で参加費1000円（交通費・入場料込み）。美術館、工場、福祉施設などを訪問し、新しい発見と学びの機会を提供します。社会参加のきっかけとしても好評です。見学後は感想を共有する時間も設けています。'
    ],
    information: [
      '障害者手帳申請の手順を詳しく解説したガイド。PDFで入手可能で、申請書類のサンプルも掲載しています。月1回更新され、最新の制度変更にも対応。相談窓口の連絡先リストも充実しています。初めての方でも分かりやすく、ステップバイステップで手続きを進められます。',
      '北九州市内の福祉サービス事業所を網羅したリスト。エクセル形式で提供され、エリア・サービス種別で検索可能です。年2回更新され、相談支援専門員が作成。事業所の特徴や連絡先を一覧で確認できます。サービス選びの際の比較検討に役立ちます。',
      '精神障害者向けの就労移行支援サービスの選び方ガイド。利用の流れ、事業所の見学ポイント、よくある質問をまとめています。PDF形式で無料配布。実際の利用者の声も掲載し、選択の参考になります。自分に合った事業所を見つけるための実践的な情報を提供します。',
      '市内のバリアフリー対応施設を地図上に表示したマップ。スマホアプリとしても利用可能で、現在地から近い施設を検索できます。車椅子トイレ、エレベーター、駐車場の有無も確認できる便利なツールです。外出計画を立てる際に安心して利用できます。',
      '障害福祉サービスの種類と利用方法を解説した総合ガイド。居宅介護、生活介護、就労支援など各サービスの概要を図表で分かりやすく説明。制度改正に合わせて年1回更新され、常に最新情報を提供しています。サービス計画作成時の参考資料として活用できます。',
      '地域の当事者会・ピアサポートグループの活動情報をまとめた冊子。開催日時、場所、参加方法を詳しく記載。四半期ごとに更新され、新規グループの情報も随時追加。仲間づくりのきっかけとして活用できます。同じ経験を持つ仲間と出会う機会を提供します。',
      '医療機関・クリニックのリストで障害者診療に対応している施設を掲載。診療科目、バリアフリー対応、予約方法を一覧化。年2回更新され、医療機関の協力のもと正確な情報を提供。緊急時の連絡先も記載しています。受診先を探す際の信頼できるガイドです。',
      '公共交通機関のバリアフリー情報ガイド。バス、電車、タクシーの利用方法と割引制度を解説。路線図にエレベーター設置駅を表示し、移動計画に役立ちます。アプリ版もあり、外出時にスマホで確認できます。安心して公共交通機関を利用できるよう支援します。',
      '障害年金・各種手当の申請ガイド。受給資格、申請書類、手続きの流れを分かりやすく説明。社会保険労務士が監修し、年1回更新。実際の申請事例も紹介し、初めての方でも安心して手続きできるようサポートします。経済的な支援制度を理解し活用するための必携ガイドです。',
      '発達障害児・者向けの支援機関・サービスマップ。療育施設、相談窓口、就労支援事業所などを年齢別・地域別に整理。半年ごとに更新され、新規開設施設の情報も迅速に反映。保護者や支援者に好評のリソースです。ライフステージに応じた支援を見つけるのに役立ちます。',
      '緊急時の対応マニュアルと連絡先リスト。夜間・休日に相談できる窓口、救急医療機関、警察・消防の障害者対応について詳しく記載。PDF形式で無料配布、印刷して手元に置いておくと安心です。いざという時に慌てず対応できるよう備えられます。',
      '福祉制度・サービスに関するよくある質問集。手続き方法、利用条件、費用負担など100以上のQ&Aを掲載。Web版は検索機能付きで必要な情報にすぐアクセス可能。月1回更新され、新しい質問も随時追加しています。疑問をすぐに解決できる便利なリソースです。'
    ]
  };

  const descriptionList = descriptions[type] || descriptions.place;
  return descriptionList[index % descriptionList.length];
}

seedDemoData();

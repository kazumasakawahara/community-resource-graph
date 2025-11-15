# Depth 2 Ego Networkテスト失敗の調査と修正

## 📊 現状の問題

**成功率**: 10/12テスト (83.3%)
**失敗するテスト**:
- Ego Network取得 (depth 2)
- デフォルトdepthのEgo Network取得

**問題の特徴**:
- ✅ 単独実行では成功
- ❌ 全テスト実行時には失敗
- 期待: 6ノード(center + level1(3) + level2(2))
- 実際: 4ノード(center + level1(3)のみ)

**推測される原因**:
これは典型的な「テスト間の依存関係」または「データの状態管理」の問題です。

---

## 🔍 タスク1: テストファイルの調査

### ステップ1: テストファイルの確認
ファイルパス: `tests/integration/network.test.js`

以下の点を確認してください:

#### 1-1. beforeEachとafterEachの確認
```javascript
beforeEach(async () => {
  // データベースのクリーンアップ処理は正しく行われているか?
});

afterEach(async () => {
  // テスト後のクリーンアップは適切か?
});
```

**確認ポイント**:
- 各テスト前にNeo4jデータベースが完全にクリーンアップされているか
- リレーションシップとノードの両方が削除されているか
- 削除の順序は正しいか (リレーションシップ → ノード)

#### 1-2. テストデータの作成タイミング
depth 2のテストが実行される前に、以下のデータ構造が作成されているか確認:

```
center (中心ノード)
  ├─ level1_resource1 (depth 1)
  │   └─ level2_resource1 (depth 2)
  ├─ level1_resource2 (depth 1)
  │   └─ level2_resource2 (depth 2)
  └─ level1_resource3 (depth 1)
```

**問題の可能性**:
- 前のテストでlevel2のリソースまたはリレーションシップが削除されていない
- または逆に、意図せず削除されている

### ステップ2: 実際のテストコードを確認
depth 2のテストケース部分を確認し、以下を報告してください:
1. テストデータの作成方法
2. beforeEachでのクリーンアップ処理
3. テストの実行順序

---

## 🔍 タスク2: Neo4jクエリの調査と修正

### ステップ1: 現在のクエリを確認
ファイルパス: `src/services/network-service.js`

現在の`getEgoNetwork`関数のCypherクエリを確認してください。

### ステップ2: リレーションシップの方向性を確認

#### 問題の可能性
Neo4jのリレーションシップには方向性があります。現在のクエリで方向を適切に扱っているか確認してください。

**現在のクエリ(推測)**:
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH path = (center)-[:RELATED_TO*1..2]-(connected:Resource)
```

**問題点**:
- `-[:RELATED_TO*1..2]-` は無方向パターン(両方向)
- しかし、リレーションシップが一方向で作成されている場合、片方向しか辿れない

### ステップ3: 修正案の実装

#### 修正案A: 方向を明示的に両方向で探索
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH path = (center)-[:RELATED_TO*1..${depth}]-(connected:Resource)
WHERE connected.id <> $resourceId
WITH center, collect(DISTINCT connected) as connectedNodes, 
     [rel in relationships(path) | rel] as rels
UNWIND CASE WHEN size(rels) > 0 THEN rels ELSE [null] END as rel
WITH center, connectedNodes, collect(DISTINCT rel) as uniqueRels
RETURN center, connectedNodes, 
       [r in uniqueRels WHERE r IS NOT NULL | r] as relationships
```

#### 修正案B: 方向を考慮して両方向のパスを結合
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH outPath = (center)-[:RELATED_TO*1..${depth}]->(out:Resource)
OPTIONAL MATCH inPath = (center)<-[:RELATED_TO*1..${depth}]-(in:Resource)
WITH center,
     collect(DISTINCT out) + collect(DISTINCT in) as connectedNodes,
     relationships(outPath) + relationships(inPath) as allRels
UNWIND CASE WHEN size(allRels) > 0 THEN allRels ELSE [null] END as rel
WITH center, connectedNodes, collect(DISTINCT rel) as uniqueRels
WHERE size([n in connectedNodes WHERE n.id <> $resourceId]) > 0 OR size(uniqueRels) = 0
RETURN center, 
       [n in connectedNodes WHERE n IS NOT NULL AND n.id <> $resourceId] as connectedNodes,
       [r in uniqueRels WHERE r IS NOT NULL] as relationships
```

#### 修正案C: CONNECTS_TOリレーションシップを使用
テストコードを確認して、実際に使用されているリレーションシップタイプが`CONNECTS_TO`か`RELATED_TO`かを確認してください。

もし`CONNECTS_TO`を使用している場合:
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH path = (center)-[:CONNECTS_TO*1..${depth}]-(connected:Resource)
WHERE connected.id <> $resourceId
WITH center, collect(DISTINCT connected) as connectedNodes, 
     [rel in relationships(path) | rel] as rels
RETURN center, connectedNodes, 
       [r in rels | {
         id: toString(id(r)),
         source: startNode(r).id,
         target: endNode(r).id,
         type: r.relation_type,
         properties: properties(r)
       }] as relationships
```

---

## 🔍 タスク3: デバッグログの追加

### ステップ1: network-service.jsにログを追加
`getEgoNetwork`関数に以下のデバッグログを追加してください:

```javascript
async getEgoNetwork(resourceId, depth = 2) {
  console.log('=== getEgoNetwork Debug ===');
  console.log('resourceId:', resourceId);
  console.log('depth:', depth);
  
  const session = this.driver.getSession();
  
  try {
    // 中心ノードの取得
    const centerResult = await session.run(
      'MATCH (center:Resource {id: $resourceId}) RETURN center',
      { resourceId }
    );
    
    if (centerResult.records.length === 0) {
      console.log('❌ Center node not found');
      throw new Error('Resource not found');
    }
    
    const centerNode = centerResult.records[0].get('center').properties;
    console.log('✅ Center node found:', centerNode.id);
    
    // デバッグ: 全リレーションシップを確認
    const debugRelResult = await session.run(`
      MATCH (center:Resource {id: $resourceId})
      OPTIONAL MATCH (center)-[r]-(other:Resource)
      RETURN count(r) as relCount, collect(other.id) as connectedIds
    `, { resourceId });
    
    const debugInfo = debugRelResult.records[0];
    console.log('Direct connections:', debugInfo.get('relCount').toNumber());
    console.log('Connected IDs:', debugInfo.get('connectedIds'));
    
    // デバッグ: depth 2のパスを確認
    const debugDepth2Result = await session.run(`
      MATCH (center:Resource {id: $resourceId})
      OPTIONAL MATCH path = (center)-[*1..2]-(connected:Resource)
      WHERE connected.id <> $resourceId
      RETURN length(path) as pathLength, 
             [n in nodes(path) | n.id] as nodeIds,
             count(DISTINCT connected) as uniqueNodes
    `, { resourceId });
    
    console.log('Depth 2 paths found:', debugDepth2Result.records.length);
    debugDepth2Result.records.forEach((record, idx) => {
      console.log(`  Path ${idx + 1}:`, 
        'length =', record.get('pathLength').toNumber(),
        'nodes =', record.get('nodeIds')
      );
    });
    
    // 実際のEgo Networkクエリ
    const query = `
      MATCH (center:Resource {id: $resourceId})
      OPTIONAL MATCH path = (center)-[:CONNECTS_TO*1..${depth}]-(connected:Resource)
      WHERE connected.id <> $resourceId
      WITH center, collect(DISTINCT connected) as connectedNodes, 
           relationships(path) as rels
      RETURN center, connectedNodes, rels
    `;
    
    console.log('Executing query with depth:', depth);
    const result = await session.run(query, { resourceId });
    
    // 結果のログ
    const nodes = result.records[0].get('connectedNodes');
    const rels = result.records[0].get('rels');
    console.log('Result nodes count:', nodes.length + 1); // +1 for center
    console.log('Result relationships count:', rels.length);
    console.log('Node IDs:', [centerNode.id, ...nodes.map(n => n.properties.id)]);
    
    // ... 返り値の構築
    
  } finally {
    await session.close();
  }
}
```

### ステップ2: デバッグログ付きでテストを実行
```bash
npm test -- tests/integration/network.test.js 2>&1 | tee network_debug.log
```

ログファイル(`network_debug.log`)を確認して、以下を報告してください:
1. depth 1のテスト時のログ
2. depth 2のテスト時のログ
3. 各テストでのデータベースの状態

---

## 🔍 タスク4: リレーションシップタイプの確認

### ステップ1: テストでのリレーションシップ作成方法を確認
`tests/integration/network.test.js`で、リレーションシップがどのように作成されているか確認してください:

```javascript
// 例: 以下のようなコードがあるか?
await request(app)
  .post('/api/resources/connect')
  .set('Authorization', `Bearer ${accessToken}`)
  .send({
    source_id: resource1.id,
    target_id: resource2.id,
    relation_type: 'nearby'  // または 'similar', 'sequential'
  });
```

### ステップ2: resource-controller.jsでの実装確認
ファイルパス: `src/controllers/resource-controller.js`

リレーションシップ作成時のCypherクエリを確認:
```javascript
// リレーションシップのタイプは何か?
// CONNECTS_TO? RELATED_TO? 他?
CREATE (source)-[:CONNECTS_TO {relation_type: $relation_type, ...}]->(target)
// または
CREATE (source)-[:RELATED_TO {type: $relation_type, ...}]->(target)
```

**重要**: `network-service.js`のクエリで使用しているリレーションシップタイプと、実際に作成されているリレーションシップタイプが一致しているか確認してください。

---

## 🔍 タスク5: テストの実行順序の確認

### ステップ1: 特定のテストのみを実行
depth 2のテストだけを実行してみてください:

```bash
# depth 2のテストのみ
npm test -- tests/integration/network.test.js -t "depth 2"

# デフォルトdepthのテストのみ
npm test -- tests/integration/network.test.js -t "default depth"
```

### ステップ2: テストの実行順序を変更
`tests/integration/network.test.js`で、depth 2のテストを一番最初に移動させてテストしてください。

もし最初に実行すると成功する場合、前のテストがデータベースの状態を変更している可能性があります。

---

## 💡 最も可能性が高い問題と解決策

### 原因の予測
全テスト実行時のみ失敗するということは、以下の可能性が最も高いです:

1. **beforeEach/afterEachのクリーンアップが不完全**
   - リレーションシップが削除されずに残っている
   - または逆に、意図せず削除されている

2. **リレーションシップの方向性の問題**
   - 一方向で作成されているのに、無方向パターンで検索している
   - depth 1は直接接続なので動作するが、depth 2は方向が合わないと取得できない

### 推奨される修正順序

#### 優先度1: リレーションシップタイプの確認と修正
1. テストコードで実際に使用されているリレーションシップタイプを確認
2. `network-service.js`のクエリを実際のタイプに合わせる
3. 方向性を考慮したクエリに修正

#### 優先度2: デバッグログの追加
1. 上記のデバッグログを追加
2. テスト実行時のログを確認
3. どのテストでデータが正しく作成/削除されていないかを特定

#### 優先度3: クリーンアップ処理の改善
1. beforeEachで完全なクリーンアップを実行
2. テスト後の状態を確認するログを追加

---

## 📝 実装手順

### 手順1: 調査 (30分)
```bash
# 1. テストファイルを確認
cat tests/integration/network.test.js | grep -A 20 "beforeEach"
cat tests/integration/network.test.js | grep -A 20 "depth 2"

# 2. resource-controllerでのリレーションシップ作成を確認
cat src/controllers/resource-controller.js | grep -A 10 "CONNECTS_TO\|RELATED_TO"

# 3. デバッグログを追加してテスト実行
npm test -- tests/integration/network.test.js 2>&1 | tee debug.log
```

### 手順2: 修正 (30分)
調査結果に基づいて以下を修正:
1. リレーションシップタイプの統一
2. クエリの方向性の修正
3. クリーンアップ処理の改善

### 手順3: 検証 (15分)
```bash
# 個別実行
npm test -- tests/integration/network.test.js -t "depth 2"

# 全テスト実行
npm test -- tests/integration/network.test.js

# 問題なければ全体テスト
npm test
```

---

## 🎯 期待される結果

修正後、以下のテスト結果を期待します:

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
成功率: 100% (12/12)
```

この時点で、network.test.jsは完全に成功し、全体のテスト成功率は次のようになります:
- **修正前**: 56/68テスト (82.4%)
- **修正後**: 58/68テスト (85.3%)

---

## 📞 報告事項

調査完了時に以下を報告してください:
1. 実際のリレーションシップタイプ名 (CONNECTS_TO? RELATED_TO?)
2. リレーションシップの方向性 (一方向? 両方向?)
3. デバッグログの内容 (特にdepth 2テスト時)
4. beforeEach/afterEachの処理内容
5. 修正した内容

この手順に従って調査と修正を進めてください。

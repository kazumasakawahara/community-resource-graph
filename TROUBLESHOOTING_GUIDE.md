# Community Resource Graph - テストエラー対処手順

作成日: 2025-11-12

## 対処手順の概要

Error.mdに記載されている`resource-search.test.js`のタイムアウトエラーを解消するため、以下の手順で対処します。

---

## ステップ1: Neo4jインデックスの作成（最優先）

### 実行方法

プロジェクトのルートディレクトリで以下のコマンドを実行してください：

```bash
cd ~/AI-Workspace/community-resource-graph
npm run db:create-indexes
```

### 期待される結果

```
🚀 Neo4jインデックス作成スクリプトを開始します...
📡 接続先: bolt://localhost:17687
📋 12個のインデックスを作成します...

[1/12] 実行中...
  CREATE INDEX resource_id_index IF NOT EXISTS FOR (r:Resource) ON (r.id)
  ✅ 成功
...
✨ すべてのインデックス作成処理が完了しました！

📊 作成されたインデックスの確認:
  - resource_id_index (RANGE): ONLINE
  - resource_name_index (RANGE): ONLINE
  - resource_fulltext (FULLTEXT): ONLINE
  ...
```

### トラブルシューティング

**エラー: `Cannot find module 'neo4j-driver'`**
```bash
npm install
```

**エラー: `Connection refused`**
- Neo4jコンテナが起動しているか確認:
```bash
docker ps | grep neo4j
```
- 起動していない場合:
```bash
cd ~/AI-Workspace/community-resource-graph
docker-compose up -d
```

---

## ステップ2: データベースのクリーンアップ（オプション）

テストデータとデモデータが混在している場合、データベースを完全にリセットします。

### ⚠️ 警告
このコマンドはすべてのデータを削除します！本番環境では実行しないでください。

### 実行方法

```bash
npm run db:reset
```

### 期待される結果

```
🗑️  Neo4jデータベースリセットスクリプトを開始します...
⚠️  警告: すべてのデータが削除されます！

📊 データベースの現状:
  - ノード数: 156
  - リレーションシップ数: 243

🧹 すべてのノードとリレーションシップを削除中...
✅ 削除完了

✨ データベースが正常にリセットされました！
```

---

## ステップ3: テストの実行

### 3-1. 問題のあるテストのみを実行

```bash
npm run test:search
```

これは `resource-search.test.js` のみを実行します。

### 3-2. すべてのテストを実行

```bash
npm test
```

### 期待される結果（改善後）

```
PASS tests/dao/resource-search.test.js (15.234 s)
  Resource Search
    ✓ Basic Search: should find resources by name (234ms)
    ✓ Basic Search: should find resources by description (198ms)
    ✓ Area Filter: should filter by single area (145ms)
    ✓ Tag Filter: should filter by single tag (167ms)
    ...
```

---

## ステップ4: テストファイルへのタイムアウト設定追加（必要に応じて）

もしまだタイムアウトが発生する場合、以下の修正を手動で行ってください。

### ファイル: `tests/dao/resource-search.test.js`

14行目の `describe('Resource Search', () => {` の直後に以下を追加：

```javascript
describe('Resource Search', () => {
  // タイムアウトを60秒に延長（デフォルトは5秒）
  jest.setTimeout(60000);

  let session;
  // ... 以下既存のコード
```

---

## 追加の対策（必要に応じて）

### jest.config.jsでグローバルタイムアウトを延長

`jest.config.js` に以下を追加:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testTimeout: 30000, // 30秒（デフォルトは5秒）
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js'
  ]
};
```

---

## 検証方法

### 1. インデックスが正しく作成されているか確認

Neo4jブラウザ (http://localhost:17474) で以下のクエリを実行:

```cypher
SHOW INDEXES
```

以下のようなインデックスが表示されるはずです:
- resource_id_index
- resource_name_index
- resource_fulltext
- area_id_index
- tag_id_index
など

### 2. テスト実行時間の確認

修正前と修正後でテスト実行時間を比較:

```bash
time npm run test:search
```

期待される改善:
- **修正前**: タイムアウト（60秒以上）
- **修正後**: 10〜20秒程度で完了

---

## まとめ

### 実行すべきコマンド（順番に）

1. `npm run db:create-indexes` - インデックス作成（必須）
2. `npm run db:reset` - データベースリセット（オプション）
3. `npm run test:search` - 問題のテストを実行
4. `npm test` - すべてのテスト実行

### 問題が解決しない場合

以下の情報を確認してください:

1. Neo4jのログ確認:
```bash
docker logs community-resource-neo4j
```

2. Neo4jのリソース使用状況:
```bash
docker stats community-resource-neo4j
```

3. テスト実行時の詳細ログ:
```bash
npm run test:search -- --verbose
```

---

## 作成されたファイル

1. `scripts/create-indexes.cypher` - インデックス作成Cypherクエリ
2. `scripts/run-create-indexes.js` - インデックス作成実行スクリプト
3. `scripts/reset-database.js` - データベースリセットスクリプト
4. `package.json` - 新しいnpmスクリプトを追加

---

**次のステップ**: 上記の手順に従って、まず `npm run db:create-indexes` を実行してください。

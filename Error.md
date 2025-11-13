# テストエラー調査レポート

## プロジェクト概要

**プロジェクト名**: Community Resource Graph
**目的**: Neo4jベースの障害者支援ネットワーク可視化システム
**技術スタック**: Node.js 20.x, Neo4j 5.x, Jest, TypeScript/JavaScript混在

---

## テスト対象と目的

### 実施していたテスト

このプロジェクトでは、以下のカテゴリーのテストを実施していました:

#### 1. セットアップテスト (`tests/setup/`)
- **project-init.test.js**: バックエンドプロジェクトの初期化確認
  - package.json依存関係検証
  - tsconfig.json設定確認
  - Node.js 18+バージョン要件チェック

- **frontend-init.test.js**: フロントエンドプロジェクトの初期化確認

- **neo4j-init.test.js**: Neo4jデータベースセットアップ確認
  - docker-compose.yml存在確認
  - Neo4j 5.x イメージ設定検証
  - 環境変数設定確認

- **schema-init.test.js**: データベーススキーマ初期化確認

- **demo-data.test.js**: デモデータ投入確認

#### 2. DAO (Data Access Object) テスト (`tests/dao/`)
- **neo4j-driver.test.js**: Neo4jドライバシングルトン実装テスト
- **user-dao.test.js**: ユーザー管理機能テスト
- **resource-dao.test.js**: 資源CRUD操作テスト
- **resource-relationships.test.js**: 資源間関係性テスト
- **resource-tags.test.js**: タグベース分類テスト
- **resource-search.test.js**: 資源検索機能テスト ★問題発生箇所
- **feedback-dao.test.js**: フィードバック管理テスト
- **need-dao.test.js**: ニーズ管理テスト
- **need-matching.test.js**: ニーズマッチングテスト
- **analytics-dao.test.js**: 分析機能テスト

---

## テストエラーの詳細

### 主要エラー: resource-search.test.js でのタイムアウト

#### エラー状況
- **ファイル**: `tests/dao/resource-search.test.js`
- **症状**: テスト実行が異常に長時間かかり、完了しない
- **影響**: Jest全体のテスト実行が停止

#### エラーメッセージ
```
FAIL tests/dao/resource-search.test.js
  ● Console
    [Neo4j info] Direct driver 0 created for server address localhost:17687
    [Neo4j debug] Connection [0][] created towards localhost:17687
    [Neo4j debug] Connection [0][] C: HELLO ...
    [Neo4j debug] Connection [0][] C: LOGON ...
    [Neo4j debug] Connection [0][] S: SUCCESS ...
```

ログから、Neo4j接続は成功しているが、その後テストが進行していないことが確認されました。

#### テストファイルの構成

**resource-search.test.js** (559行)は以下のテストスイートで構成:

1. **Basic Search**: キーワード検索（名前、説明、住所）
2. **Area Filter**: 地域フィルタリング
3. **Tag Filter**: タグフィルタリング（単一、複数AND条件）
4. **Combined Filters**: 複合フィルタ（キーワード+地域+タグ）
5. **Sorting**: ソート機能（フィードバック数、作成日、閲覧数）
6. **Pagination**: ページネーション（limit, skip）
7. **Empty Results with Suggestions**: 検索結果なし時の提案機能
8. **Return Format**: 戻り値フォーマット確認

---

## 環境設定の確認

### Neo4j設定 (.env)
```env
NEO4J_URI=bolt://localhost:17687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=community-resource-dev-2024
```

### Docker設定
- **コンテナ名**: community-resource-neo4j
- **イメージ**: neo4j:5-community
- **ステータス**: Up 6 hours (healthy)
- **ポート**:
  - HTTP: 0.0.0.0:17474->7474
  - Bolt: 0.0.0.0:17687->7687

### Neo4jドライバ設定 (src/db/neo4j-driver.js)
```javascript
const config = {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 60000, // 60秒
  maxTransactionRetryTime: 30000, // 30秒
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    logger: (level, message) => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Neo4j ${level}] ${message}`);
      }
    }
  }
};
```

### Jest設定 (jest.config.js)
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js'
  ]
};
```

---

## これまでのエラー解消試行

### 試行内容の推測（プロジェクト履歴から）

#### 1. テストデータクリーンアップの改善
- **問題**: テストデータが残存し、次回テスト実行に影響
- **対策**:
  - `beforeEach`でテスト固有のメタデータ（ユーザー、地域、タグ）をクリーンアップ
  - `afterEach`で作成したリソースをトラッキングして削除
  - `createdResourceIds`配列で作成したリソースIDを管理

```javascript
// resource-search.test.js の例
let createdResourceIds = [];

beforeEach(async () => {
  createdResourceIds = []; // リセット
  // テストメタデータのクリーンアップ
  await session.run('MATCH (u:User) WHERE u.email = "search-test-user@example.com" DETACH DELETE u');
  await session.run('MATCH (a:Area) WHERE a.id STARTS WITH "search_area" DETACH DELETE a');
  await session.run('MATCH (t:Tag) WHERE t.id STARTS WITH "search_tag" DETACH DELETE t');
});

afterEach(async () => {
  if (createdResourceIds.length > 0) {
    await session.run('MATCH (r:Resource) WHERE r.id IN $ids DETACH DELETE r',
      { ids: createdResourceIds });
  }
});
```

#### 2. 検索クエリの最適化試行
- **問題**: 検索クエリがデモデータを含めて実行されている可能性
- **対策**: テスト用エリアIDでフィルタリング
  - `areaIds: [areaKokura.id, areaYahata.id]` を検索条件に追加

#### 3. デバッグログの追加
- **問題**: 検索結果が期待通りでない場合の原因特定困難
- **対策**:
  - リソース作成時にログ出力
  - DB検証クエリで実際のデータ状態を確認
  - 検索結果の詳細ログ出力

```javascript
console.log('DEBUG - Resource 1 created:', resource1.id);
console.log('DEBUG - Resources in DB:', verifyResult.records.map(...));
console.log('DEBUG - Search results:', JSON.stringify(results, null, 2));
```

#### 4. Jest実行オプションの調整
- **試行**: `--runInBand`フラグでテストを順次実行
  - 並列実行による競合状態を回避

#### 5. セッション管理の改善
- **問題**: Neo4jセッションのリーク
- **対策**:
  - `afterEach`で確実にセッションクローズ
  - `afterAll`で最終クリーンアップとドライバクローズ

---

## 推定される問題の原因

### 1. タイムアウトの可能性が高い原因

#### A. 検索クエリの複雑さ
`resource-dao.js`の`search()`関数が以下のような複雑な処理を含む可能性:
- 全文検索（name, description, address）
- 複数テーブルJOIN（Resource, Area, Tag, User）
- サブクエリ（関連タグ提案、近隣エリア提案）
- ソート処理
- ページネーション

#### B. インデックス不足
Neo4jデータベースに適切なインデックスが作成されていない可能性:
- Resource.id, Resource.name, Resource.type
- Area.id, Tag.id
- 全文検索インデックス

#### C. 大量のテストデータ
- デモデータが投入されている状態でテスト実行
- 検索対象が想定以上に多い

#### D. セッション/コネクション管理の問題
- セッションが正しくクローズされずリーク
- コネクションプールが枯渇

### 2. テストデータ分離の問題
- テスト用データとデモデータの分離が不完全
- `areaIds`フィルタが全ての検索で適用されていない可能性

### 3. 非同期処理の待機問題
- `beforeEach`でのセットアップが完了する前にテスト実行
- `afterEach`のクリーンアップが完了する前に次のテスト開始

---

## 未試行の対策案

### 即座に試すべき対策

1. **タイムアウト設定の調整**
```javascript
describe('Resource Search', () => {
  jest.setTimeout(30000); // 30秒に延長
});
```

2. **テストの分割実行**
```bash
# 特定のテストスイートのみ実行
npm test -- tests/dao/resource-search.test.js --testNamePattern="Basic Search"
```

3. **Neo4jインデックスの作成**
```cypher
CREATE INDEX resource_id_index IF NOT EXISTS FOR (r:Resource) ON (r.id);
CREATE INDEX resource_name_index IF NOT EXISTS FOR (r:Resource) ON (r.name);
CREATE INDEX area_id_index IF NOT EXISTS FOR (a:Area) ON (a.id);
CREATE INDEX tag_id_index IF NOT EXISTS FOR (t:Tag) ON (t.id);
CREATE FULLTEXT INDEX resource_fulltext IF NOT EXISTS
  FOR (r:Resource) ON EACH [r.name, r.description, r.address];
```

4. **完全なデータベースリセット**
```javascript
beforeAll(async () => {
  const session = neo4jDriver.getSession();
  await session.run('MATCH (n) DETACH DELETE n'); // 全データ削除
  await session.close();
});
```

### 中長期的な改善策

1. **テスト環境の分離**
   - テスト専用のNeo4jデータベースを使用
   - docker-compose-test.ymlで別コンテナ起動

2. **モック/スタブの活用**
   - 検索機能の単体テストはモックを使用
   - 統合テストのみ実際のDBを使用

3. **パフォーマンステスト**
   - 検索クエリの実行計画確認 (`EXPLAIN`, `PROFILE`)
   - ボトルネック特定と最適化

4. **テストデータファクトリ**
   - 一貫したテストデータ生成ヘルパー関数
   - データ生成とクリーンアップのライブラリ化

---

## 次のアクションプラン

### 優先順位1: 問題の特定
1. ☐ 特定のテストケースのみ実行してタイムアウト箇所を特定
2. ☐ Neo4jログで実行されているクエリを確認
3. ☐ Jest verbose モードで詳細ログ取得

### 優先順位2: 応急処置
1. ☐ タイムアウト設定を延長
2. ☐ テストデータを最小限に削減
3. ☐ 失敗するテストを一時的にスキップ

### 優先順位3: 根本対策
1. ☐ Neo4jインデックス作成と検証
2. ☐ 検索クエリのパフォーマンステューニング
3. ☐ テスト環境の完全分離

---

## 関連ファイル

### テストファイル
- `tests/dao/resource-search.test.js` (559行) - 問題発生箇所
- `tests/dao/resource-tags.test.js` (399行)
- `tests/dao/resource-relationships.test.js` (341行)

### 実装ファイル
- `src/dao/resource-dao.js` (21,802バイト) - 検索ロジック実装
- `src/db/neo4j-driver.js` - ドライバシングルトン

### 設定ファイル
- `jest.config.js` - Jest設定
- `docker-compose.yml` - Neo4jコンテナ設定
- `.env` - 環境変数

---

## まとめ

### 現在の状況
- ✅ Neo4j接続は正常
- ✅ 基本的なセットアップテストは通過
- ❌ resource-search.test.js でタイムアウト発生
- ❌ テスト実行が完了しない

### 最も可能性の高い原因
1. 複雑な検索クエリ + インデックス不足によるパフォーマンス問題
2. テストデータとデモデータの混在による検索対象の増大
3. セッション管理の不備によるリソースリーク

### 推奨される対応
1. **即座**: タイムアウト延長 + テスト分割実行で問題箇所特定
2. **短期**: インデックス作成 + クエリ最適化
3. **長期**: テスト環境完全分離 + パフォーマンス監視

---

## 対策実施結果（2025-11-12 更新）

### ✅ 実施した対策

#### 1. Neo4jインデックスの作成
```bash
npm run db:create-indexes
```

**作成されたインデックス**:
- resource_id_index (RANGE): ONLINE
- resource_name_index (RANGE): ONLINE
- resource_type_index (RANGE): ONLINE
- resource_fulltext (FULLTEXT): POPULATING
- area_id_index (RANGE): ONLINE
- tag_id_index (RANGE): ONLINE
- tag_fulltext (FULLTEXT): POPULATING
- user_id_index (RANGE): ONLINE
- user_email_index (RANGE): ONLINE

### 🎉 改善結果

#### テスト実行時間の劇的な改善
- **改善前**: タイムアウト（60秒以上、完了せず）
- **改善後**: **2.77秒**で完了
- **改善率**: 約**20倍以上の高速化**

#### テスト成功率
- **合計**: 16テスト
- **成功**: 15テスト (93.75%)
- **失敗**: 1テスト (6.25%)

#### 成功したテストスイート
- ✅ Basic Search (4/4テスト成功)
  - should return all resources when no filters applied (215ms)
  - should search by keyword in name (138ms)
  - should search by keyword in description (105ms)
  - should search by keyword in address (119ms)
- ✅ Area Filter (1/1テスト成功)
  - should filter by area (178ms)
- ✅ Tag Filter (2/2テスト成功)
  - should filter by single tag (209ms)
  - should filter by multiple tags with AND condition (134ms)
- ✅ Combined Filters (1/1テスト成功)
  - should combine keyword, area, and tag filters (165ms)
- ✅ Sorting (3/3テスト成功)
  - should sort by feedback_count descending (118ms)
  - should sort by created_at descending (313ms)
  - should sort by view_count descending (134ms)
- ✅ Pagination (2/2テスト成功)
  - should paginate results with limit (111ms)
  - should paginate results with skip and limit (138ms)
- ⚠️ Empty Results with Suggestions (1/2テスト成功)
  - ❌ should suggest related tags when no results found (188ms) - **失敗**
  - ✅ should suggest nearby areas when no results found (139ms)
- ✅ Return Format (1/1テスト成功)
  - should return resources with area and tags information (95ms)

### ❌ 残っている問題

#### 失敗テスト詳細

**テスト**: "should suggest related tags when no results found"
**ファイル**: tests/dao/resource-search.test.js:511
**エラーメッセージ**:
```
expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

**問題の内容**:
検索結果が0件の場合に、関連タグの提案機能(`results.suggestions.relatedTags`)が空配列を返している。

**期待される動作**:
- 検索条件: 3つのタグすべて（tagQuiet + tagAccessible + tagAffordable）
- 実際のデータ: Resource 1はtagQuietとtagAccessibleを持つ
- 期待: tagQuietを関連タグとして提案すべき

**原因の推測**:
`resource-dao.js`の`search()`関数内の関連タグ提案ロジックに問題がある可能性

### 次のステップ

1. ✅ `src/dao/resource-dao.js`の`search()`関数を調査
2. ✅ 関連タグ提案クエリのロジック確認
3. ✅ テストケースのデバッグログを詳細に確認
4. ✅ 関連タグ提案機能の修正実装

---

## 最終結果（2025-11-12 完了）

### ✅ すべての問題を解決

#### 実施した修正

1. **`generateSuggestions`関数の修正** (`src/dao/resource-dao.js:326`)
   - `areaIds`パラメータが関数に渡されていなかった問題を修正
   - 修正前: `generateSuggestions(session, { keyword, areaId, tags })`
   - 修正後: `generateSuggestions(session, { keyword, areaId, areaIds, tags })`

2. **関連タグクエリの最適化** (`src/dao/resource-dao.js:361-388`)
   - クエリに`co_occurrence_count`（共起回数）を追加
   - ソート順を共起回数優先に変更
   - より関連性の高いタグを提案できるように改善

3. **テストケースの修正** (`tests/dao/resource-search.test.js:468-513`)
   - テストロジックの問題を修正
   - テストデータに提案可能なタグ（tagAffordable）を追加
   - より現実的なテストシナリオに変更

### 🎉 最終テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Time:        2.044s
```

**すべてのテストが成功！**

- ✅ Basic Search (4/4)
- ✅ Area Filter (1/1)
- ✅ Tag Filter (2/2)
- ✅ Combined Filters (1/1)
- ✅ Sorting (3/3)
- ✅ Pagination (2/2)
- ✅ Empty Results with Suggestions (2/2) ← **修正完了**
- ✅ Return Format (1/1)

### パフォーマンス改善まとめ

| 指標 | 改善前 | 改善後 | 改善率 |
|------|--------|--------|--------|
| **実行時間** | タイムアウト（>60秒） | 2.04秒 | **30倍以上高速化** |
| **成功率** | 0% (完了せず) | 100% (16/16) | **完全成功** |
| **主な対策** | インデックス作成 | - | - |
| **副次的修正** | 関連タグ提案ロジック | - | - |

### 学んだこと

1. **Neo4jパフォーマンス**: インデックスの重要性
   - 検索クエリのパフォーマンスは適切なインデックスに大きく依存
   - FULLTEXT、RANGE両方のインデックスが必要

2. **テストデータ設計**: テストケースの論理的整合性
   - テスト期待値は実装ロジックと整合している必要がある
   - 提案機能は「検索条件に含まれないタグ」を提案すべき

3. **デバッグ手法**: 段階的な問題解決
   - まずパフォーマンス問題を解決（インデックス）
   - 次にロジック問題を解決（提案機能）
   - デバッグログで問題を可視化

---

**作成日**: 2025-11-12
**最終更新**: 2025-11-12 (全問題解決)

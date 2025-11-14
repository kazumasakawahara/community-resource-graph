# Claude Code改善タスク指示書

## 📋 概要
現在のテスト成功率は82.4% (56/68テスト)です。以下の3つの機能に問題があります:
1. **Ego Network機能** - 部分的に失敗(5/12テストが失敗)
2. **Needs機能** - 完全に未実装
3. **Feedback機能** - 全テスト失敗

このドキュメントでは、優先度順に修正タスクを提示します。

---

## 🎯 タスク1: Ego Network機能の修正 【最優先・所要時間: 30-60分】

### 問題の詳細
`src/services/network-service.js`の`getEgoNetwork()`関数が不完全です。
以下のテストが失敗しています:
- Ego Network取得 (depth 1)
- Ego Network取得 (depth 2)
- Ego Networkのデフォルトdepth
- 関係性タイプの包含
- コネクションなしのリソース処理

**エラー内容**: `network.nodes` が `undefined`

### 修正指示

#### ステップ1: network-service.jsの確認
ファイルパス: `src/services/network-service.js`

現在の`getEgoNetwork(resourceId, depth = 1)`関数を確認してください。

#### ステップ2: 返り値の構造を修正
関数は以下の構造を返す必要があります:

```javascript
{
  nodes: [
    {
      id: "resource_xxx",
      name: "リソース名",
      type: "リソースタイプ",
      // その他のリソースプロパティ
    },
    // ... 他のノード
  ],
  relationships: [
    {
      id: "rel_xxx",
      source: "resource_xxx",
      target: "resource_yyy",
      type: "nearby" | "similar" | "sequential",
      // その他のリレーションシッププロパティ
    },
    // ... 他のリレーションシップ
  ]
}
```

#### ステップ3: Neo4jクエリの実装
以下のロジックで実装してください:

1. **中心ノードの取得**:
```cypher
MATCH (center:Resource {id: $resourceId})
RETURN center
```

2. **depth 1の場合** (直接つながっているノードのみ):
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH (center)-[r:CONNECTS_TO]-(connected:Resource)
RETURN center, collect(DISTINCT connected) as connectedNodes, collect(DISTINCT r) as relationships
```

3. **depth 2の場合** (2ホップ先まで):
```cypher
MATCH (center:Resource {id: $resourceId})
OPTIONAL MATCH path = (center)-[r:CONNECTS_TO*1..2]-(connected:Resource)
WITH center, 
     collect(DISTINCT connected) as connectedNodes,
     [rel in relationships(path) | rel] as rels
RETURN center, connectedNodes, rels
```

4. **コネクションがない場合の処理**:
中心ノードのみを返す:
```javascript
{
  nodes: [centerNode],
  relationships: []
}
```

#### ステップ4: デフォルトdepthの設定
関数シグネチャを以下のように設定:
```javascript
async getEgoNetwork(resourceId, depth = 1) {
  // depth が指定されていない場合、デフォルトで1を使用
  const actualDepth = depth || 1;
  
  // 実装...
}
```

#### ステップ5: テストの実行
```bash
npm test -- tests/integration/network.test.js
```

**期待される結果**: network.test.jsのテストが12/12成功

---

## 🎯 タスク2: Needs機能の実装 【優先度: 中・所要時間: 2-3時間】

### 問題の詳細
Needs機能が完全に未実装です。`src/dao/needs-dao.js`ファイルが存在しません。

**エラー内容**: `Expected parameter(s): created_by`

### 実装指示

#### ステップ1: needs-dao.jsの新規作成
ファイルパス: `src/dao/needs-dao.js`

**参考ファイル**: `src/dao/resource-dao.js` (同様の構造で作成)

以下の関数を実装してください:

```javascript
const { v4: uuidv4 } = require('uuid');

class NeedsDAO {
  constructor(neo4jDriver) {
    this.driver = neo4jDriver;
  }

  /**
   * 新しいニーズを作成
   * @param {Object} needData - ニーズのデータ
   * @param {string} created_by - 作成者のユーザーID
   */
  async createNeed(needData, created_by) {
    const session = this.driver.getSession();
    try {
      const needId = `need_${uuidv4()}`;
      const now = new Date().toISOString();
      
      const query = `
        CREATE (n:Need {
          id: $needId,
          title: $title,
          description: $description,
          category: $category,
          priority: $priority,
          status: $status,
          created_by: $created_by,
          created_at: $created_at,
          updated_at: $updated_at
        })
        RETURN n
      `;
      
      const result = await session.run(query, {
        needId,
        title: needData.title,
        description: needData.description || '',
        category: needData.category || 'general',
        priority: needData.priority || 'medium',
        status: needData.status || 'open',
        created_by,
        created_at: now,
        updated_at: now
      });
      
      return result.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  }

  /**
   * IDでニーズを取得
   */
  async getNeedById(needId) {
    const session = this.driver.getSession();
    try {
      const query = `
        MATCH (n:Need {id: $needId})
        RETURN n
      `;
      
      const result = await session.run(query, { needId });
      
      if (result.records.length === 0) {
        return null;
      }
      
      return result.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  }

  /**
   * 全てのニーズを取得
   */
  async getAllNeeds(filters = {}) {
    const session = this.driver.getSession();
    try {
      let query = 'MATCH (n:Need)';
      const params = {};
      
      // フィルター条件の追加
      if (filters.status) {
        query += ' WHERE n.status = $status';
        params.status = filters.status;
      }
      
      query += ' RETURN n ORDER BY n.created_at DESC';
      
      const result = await session.run(query, params);
      return result.records.map(record => record.get('n').properties);
    } finally {
      await session.close();
    }
  }

  /**
   * ニーズを更新
   */
  async updateNeed(needId, updateData) {
    const session = this.driver.getSession();
    try {
      const now = new Date().toISOString();
      
      // 更新フィールドを動的に構築
      const setFields = [];
      const params = { needId, updated_at: now };
      
      if (updateData.title) {
        setFields.push('n.title = $title');
        params.title = updateData.title;
      }
      if (updateData.description !== undefined) {
        setFields.push('n.description = $description');
        params.description = updateData.description;
      }
      if (updateData.category) {
        setFields.push('n.category = $category');
        params.category = updateData.category;
      }
      if (updateData.priority) {
        setFields.push('n.priority = $priority');
        params.priority = updateData.priority;
      }
      if (updateData.status) {
        setFields.push('n.status = $status');
        params.status = updateData.status;
      }
      
      setFields.push('n.updated_at = $updated_at');
      
      const query = `
        MATCH (n:Need {id: $needId})
        SET ${setFields.join(', ')}
        RETURN n
      `;
      
      const result = await session.run(query, params);
      
      if (result.records.length === 0) {
        return null;
      }
      
      return result.records[0].get('n').properties;
    } finally {
      await session.close();
    }
  }

  /**
   * ニーズを削除
   */
  async deleteNeed(needId) {
    const session = this.driver.getSession();
    try {
      const query = `
        MATCH (n:Need {id: $needId})
        DELETE n
        RETURN count(n) as deletedCount
      `;
      
      const result = await session.run(query, { needId });
      return result.records[0].get('deletedCount').toNumber() > 0;
    } finally {
      await session.close();
    }
  }
}

module.exports = NeedsDAO;
```

#### ステップ2: needs-service.jsの確認と修正
ファイルパス: `src/services/needs-service.js`

このファイルが存在するか確認し、存在しない場合は作成してください。
needs-daoを利用してビジネスロジックを実装します。

#### ステップ3: needs-controller.jsの確認
ファイルパス: `src/controllers/needs-controller.js`

created_byパラメータが正しく渡されているか確認してください:
```javascript
const userId = req.user.userId; // 認証ミドルウェアから取得
const need = await needsService.createNeed(req.body, userId);
```

#### ステップ4: テストの実行
```bash
npm test -- tests/integration/needs.test.js
```

**期待される結果**: needs.test.jsの全テストが成功

---

## 🎯 タスク3: Feedback機能の問題調査と修正 【優先度: 中・所要時間: 1-2時間】

### 問題の詳細
Feedback機能のテストが全て失敗していますが、具体的なエラー内容が不明です。

### 調査・修正指示

#### ステップ1: 詳細なエラーログの取得
以下のコマンドでテストを実行し、詳細なエラー情報を取得してください:

```bash
npm test -- tests/integration/feedback.test.js --verbose
```

#### ステップ2: エラー内容の分析
以下の観点で問題を特定してください:
1. `feedback-dao.js`ファイルは存在するか?
2. Neo4jドライバーの使用方法は正しいか? (`getSession()`を使用)
3. `created_by`パラメータは正しく渡されているか?
4. テストで期待されるAPIエンドポイントは実装されているか?

#### ステップ3: 問題に応じた修正
**パターン1**: needs機能と同様の問題の場合
- feedback-dao.jsにcreated_byパラメータを追加
- feedback-controller.jsでreq.user.userIdを渡す

**パターン2**: Neo4jドライバーの問題の場合
- `neo4jDriver.session()`を`neo4jDriver.getSession()`に修正

**パターン3**: 実装が不完全な場合
- needs-dao.jsを参考に、同様の構造で実装

#### ステップ4: テストの実行
```bash
npm test -- tests/integration/feedback.test.js
```

**期待される結果**: feedback.test.jsの全テストが成功

---

## 📊 最終確認

### 全テストの実行
すべての修正が完了したら、全テストを実行してください:

```bash
npm test
```

### 目標
- **現在**: 56/68テスト成功 (82.4%)
- **タスク1完了後**: 61/68テスト成功 (89.7%)
- **全タスク完了後**: 68/68テスト成功 (100%)

---

## 💡 実装時の注意事項

### Neo4jドライバーの使用方法
すべてのDAOファイルで以下のパターンを使用してください:

```javascript
const session = this.driver.getSession(); // ✅ 正しい
// const session = this.driver.session(); // ❌ 間違い

try {
  // クエリ実行
} finally {
  await session.close(); // 必ずセッションをクローズ
}
```

### created_byパラメータの取り扱い
すべての作成・更新操作で、ユーザー認証情報を記録してください:

```javascript
// Controller層
const userId = req.user.userId;
await service.createSomething(data, userId);

// Service層
async createSomething(data, created_by) {
  return await dao.create(data, created_by);
}

// DAO層
async create(data, created_by) {
  const query = `
    CREATE (n:Node {
      id: $id,
      created_by: $created_by,
      ...
    })
  `;
  await session.run(query, { ...data, created_by });
}
```

### エラーハンドリング
適切なエラーハンドリングを実装してください:

```javascript
try {
  // 処理
} catch (error) {
  console.error('Error in functionName:', error);
  throw error; // または適切なエラーレスポンスを返す
} finally {
  await session.close();
}
```

---

## 🚀 推奨される作業順序

1. **最初にタスク1を完了** (Ego Network) - 30-60分
   - 既存コードの修正のみで、比較的簡単
   - テスト成功率が89.7%に向上
   
2. **タスク2または3に進む** - 状況に応じて選択
   - Needs機能を完成させる場合: タスク2
   - Feedbackの問題が単純な場合: タスク3
   
3. **最後に残ったタスクを完了**

4. **全テスト実行で100%を確認**

---

## 📝 完了報告

各タスク完了時に、以下の情報を報告してください:
1. 修正したファイルのリスト
2. テスト実行結果
3. 残っている問題(あれば)

この指示書に従って実装を進めてください。不明点がある場合は質問してください。

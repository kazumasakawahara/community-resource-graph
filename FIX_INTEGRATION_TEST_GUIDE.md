# 統合テストエラー修正 - 実行ガイド

## エラーの概要

画像で確認されたエラー:
```
FAIL tests/integration/resources.test.js
  Resource Endpoints › GET /api/resources/search › should search resources with pagination
    expect(received).toBe(expected)
    Expected: 1
    Received: undefined
    at line 182: expect(response.body.data.page).toBe(1);

Jest did not exit one second after the test run has completed.
```

## 🎯 修正内容

1. **resource-dao.js**: ページネーション情報（page, limit）を返り値に追加
2. **resources.test.js**: Neo4jドライバーを適切にクローズ

---

## 🚀 自動修正の実行方法

### ステップ1: resource-dao.jsを修正

```bash
cd ~/AI-Workspace/community-resource-graph
node scripts/fix-resource-dao.js
```

### ステップ2: integration testを修正

```bash
node scripts/fix-integration-test.js
```

### ステップ3: テストを実行

```bash
npm test -- tests/integration/resources.test.js
```

---

## ✏️ 手動修正の方法（自動修正がうまくいかない場合）

### 修正1: src/dao/resource-dao.js

約324行目あたり、search関数の返り値部分を修正:

**修正前:**
```javascript
    // Generate suggestions if no results found
    let suggestions = null;
    if (resources.length === 0) {
      suggestions = await generateSuggestions(session, { keyword, areaId, areaIds, tags });
    }

    return {
      resources,
      total,
      suggestions
    };
  } finally {
    await session.close();
  }
}
```

**修正後:**
```javascript
    // Generate suggestions if no results found
    let suggestions = null;
    if (resources.length === 0) {
      suggestions = await generateSuggestions(session, { keyword, areaId, areaIds, tags });
    }

    // Calculate pagination info
    const page = Math.floor(skip / limit) + 1;

    return {
      resources,
      total,
      page,
      limit,
      suggestions
    };
  } finally {
    await session.close();
  }
}
```

### 修正2: tests/integration/resources.test.js

`afterAll`の最後にドライバークローズを追加:

**修正前:**
```javascript
  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // ... cleanup code ...
    } finally {
      await session.close();
    }
  });
```

**修正後:**
```javascript
  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // ... cleanup code ...
    } finally {
      await session.close();
      // Close driver to allow Jest to exit
      await neo4jDriver.close();
    }
  });
```

---

## ✅ 修正確認

修正後、以下のコマンドでテストを実行:

```bash
npm test -- tests/integration/resources.test.js
```

### 期待される結果

```
PASS tests/integration/resources.test.js
  Resource Endpoints
    POST /api/resources
      ✓ should create a resource with authentication (XXXms)
      ✓ should reject resource creation without authentication (XXms)
      ✓ should reject invalid resource type (XXms)
    GET /api/resources/:id
      ✓ should get resource by ID (XXms)
      ✓ should return 404 for non-existent resource (XXms)
    GET /api/resources/search
      ✓ should search resources without filters (XXms)
      ✓ should search resources with keyword (XXms)
      ✓ should search resources with pagination (XXms)   ← これが通るはず
    POST /api/resources/:id/tags
      ✓ should add tags to resource (XXms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        X.XXXs
```

Jestの終了警告も消えているはずです。

---

## 🔍 追加の確認

### APIレスポンス構造の確認

修正後、検索APIは以下の構造を返すようになります:

```json
{
  "success": true,
  "data": {
    "resources": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "suggestions": null
  }
}
```

### 全テストスイートの実行

統合テストが通ったら、すべてのテストを実行してみましょう:

```bash
npm test
```

---

## 🐛 トラブルシューティング

### エラー: "Cannot find module"

```bash
npm install
```

### エラー: "Neo4j connection refused"

Neo4jコンテナを起動:
```bash
docker-compose up -d
```

### テストが依然として失敗する

1. Neo4jインデックスを作成:
```bash
npm run db:create-indexes
```

2. データベースをリセット:
```bash
npm run db:reset
```

3. テストを再実行:
```bash
npm test -- tests/integration/resources.test.js
```

---

## 📝 次のステップ

1. ✅ 自動修正スクリプトを実行
2. ✅ テストを実行して確認
3. ✅ 全テストスイートを実行
4. ✅ Error.mdのresource-search.test.jsエラーも確認

---

**作成日**: 2025-11-12  
**関連ファイル**:
- `INTEGRATION_TEST_FIX.md` - 詳細な技術説明
- `scripts/fix-resource-dao.js` - 自動修正スクリプト1
- `scripts/fix-integration-test.js` - 自動修正スクリプト2

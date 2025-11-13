# Community Resource Graph - 統合テストエラー修正パッチ

## 問題の概要

`tests/integration/resources.test.js` で以下のエラーが発生:
```
expect(response.body.data.page).toBe(1);
Expected: 1
Received: undefined
```

## 原因

`src/dao/resource-dao.js` の `search` 関数が、ページネーション情報（`page`と`limit`）を返していない。

現在の返り値:
```javascript
return {
  resources,
  total,
  suggestions
};
```

期待される返り値:
```javascript
return {
  resources,
  total,
  page,
  limit,
  suggestions
};
```

---

## 修正手順

### ステップ1: resource-dao.js の修正

ファイル: `src/dao/resource-dao.js`

約324行目あたり（`return {` の直前）を以下のように修正してください：

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

### ステップ2: resource-service.js の修正（オプション）

`src/services/resource-service.js` の `searchResources` 関数も、より明確にページネーション情報を返すように修正できます。

約98行目あたりを確認:

**現在のコード（修正不要）:**
```javascript
  // Perform search (DAO handles suggestions)
  const searchResult = await resourceDAO.search({
    tags: criteria.tags,
    areaId: criteria.areaId,
    areaIds: criteria.areaIds,
    keyword: criteria.keyword,
    sortBy: criteria.sortBy,
    page,
    limit
  });

  return searchResult;
```

このコードで問題ありませんが、より明示的にしたい場合は以下のようにできます:

**修正後（オプション）:**
```javascript
  // Perform search (DAO handles suggestions)
  const searchResult = await resourceDAO.search({
    tags: criteria.tags,
    areaId: criteria.areaId,
    areaIds: criteria.areaIds,
    keyword: criteria.keyword,
    sortBy: criteria.sortBy,
    skip: (page - 1) * limit,  // pageからskipに変換
    limit
  });

  // Ensure page is included in result
  return {
    ...searchResult,
    page,
    limit
  };
```

---

## 追加の修正: Jest終了問題の解決

### 問題
"Jest did not exit one second after the test run has completed."

### 原因
Neo4jセッション/ドライバーが適切にクローズされていない

### 修正: tests/integration/resources.test.js

`afterAll`にドライバークローズを追加:

**修正前:**
```javascript
  afterAll(async () => {
    // Clean up
    const session = neo4jDriver.getSession();
    try {
      // Delete resources...
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
      // Delete resources one by one to avoid syntax errors
      if (testResourceId) {
        await session.run(
          `MATCH (r:Resource {id: $resourceId}) DETACH DELETE r`,
          { resourceId: testResourceId }
        );
      }
      if (testAreaId) {
        await session.run(
          `MATCH (a:Area {id: $areaId}) DETACH DELETE a`,
          { areaId: testAreaId }
        );
      }
      if (userId) {
        await session.run(
          `MATCH (u:User {id: $userId}) DETACH DELETE u`,
          { userId }
        );
      }
    } finally {
      await session.close();
      // ドライバーをクローズ（重要！）
      await neo4jDriver.close();
    }
  });
```

---

## 検証手順

### 1. 修正を適用

上記の修正を `src/dao/resource-dao.js` に適用してください。

### 2. テストを実行

```bash
cd ~/AI-Workspace/community-resource-graph
npm run test:integration
```

または、特定のテストのみ実行:
```bash
npm test -- tests/integration/resources.test.js
```

### 3. 期待される結果

```
PASS tests/integration/resources.test.js
  Resource Endpoints
    POST /api/resources
      ✓ should create a resource with authentication
      ✓ should reject resource creation without authentication
      ✓ should reject invalid resource type
    GET /api/resources/:id
      ✓ should get resource by ID
      ✓ should return 404 for non-existent resource
    GET /api/resources/search
      ✓ should search resources without filters
      ✓ should search resources with keyword
      ✓ should search resources with pagination (182ms)
    POST /api/resources/:id/tags
      ✓ should add tags to resource

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

---

## まとめ

### 主な修正内容

1. **resource-dao.js**: `page`と`limit`を返り値に追加
2. **tests/integration/resources.test.js**: `afterAll`でドライバーをクローズ

### 修正による効果

- ✅ テストが正常にパス
- ✅ Jestが適切に終了
- ✅ APIレスポンスがページネーション情報を含む

---

**次のステップ**: 
1. `src/dao/resource-dao.js` を上記の通り修正してください
2. `npm test -- tests/integration/resources.test.js` を実行して確認してください

修正後の結果を教えていただければ、次のステップをご案内します！

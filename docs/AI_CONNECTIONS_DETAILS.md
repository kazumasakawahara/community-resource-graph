# AI支援「つながり」自動発見 - 詳細実装仕様書

**プロジェクト**: Community Resource Graph  
**AIエンジン**: Ollama（ローカルLLM）  
**作成日**: 2025年11月15日  
**バージョン**: 1.0

---

## 目次

1. [Ollama統合戦略](#ollama統合戦略)
2. [使用するモデルの詳細](#使用するモデルの詳細)
3. [機能1: 新規資源登録時の自動推薦](#機能1-新規資源登録時の自動推薦)
4. [機能2: 利用パターン検出](#機能2-利用パターン検出)
5. [機能3: フィードバック分析とタグ提案](#機能3-フィードバック分析とタグ提案)
6. [機能4: AIダッシュボード](#機能4-aiダッシュボード)
7. [実装コード例](#実装コード例)
8. [トラブルシューティング](#トラブルシューティング)

---

## Ollama統合戦略

### Ollama API接続方法

Dockerコンテナから`host.docker.internal`でMacのOllamaにアクセスします。

```javascript
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

// 埋め込み生成のAPI呼び出し
async function callOllamaEmbedding(text, model = 'nomic-embed-text') {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: text
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.embedding; // 768次元の配列
}

// テキスト生成のAPI呼び出し
async function callOllamaGenerate(prompt, model = 'qwen2.5:7b') {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      format: 'json' // JSON形式での出力を要求
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response;
}
```

---

## 使用するモデルの詳細

### 埋め込みモデル: nomic-embed-text

**ダウンロード**:
```bash
ollama pull nomic-embed-text
```

**特徴**:
- **次元数**: 768次元（現行のmultilingual-e5-smallと互換）
- **対応言語**: 日本語を含む多言語対応
- **速度**: CPUでも高速動作
- **用途**: セマンティック検索、類似度計算

**API使用例**:
```javascript
const embedding = await callOllamaEmbedding('小倉北区地域活動支援センター');
console.log(embedding.length); // 768
```

### テキスト生成モデル: qwen2.5:7b

**ダウンロード**:
```bash
ollama pull qwen2.5:7b
```

**特徴**:
- **パラメータ数**: 7B（適度なサイズ）
- **日本語性能**: 非常に高い
- **指示追従**: プロンプトへの従順性が優れている
- **用途**: フィードバック分析、タグ提案、説明文生成

**代替モデル**（必要に応じて）:
- **llama3.2:3b** - より軽量、高速
- **gemma2:9b** - より高性能、やや重い

---

## 機能1: 新規資源登録時の自動推薦

### 動作フロー

```
1. ユーザーが資源を登録
   ↓
2. resource-service.createResource()
   ↓
3. ollama-embedding-service.generateEmbedding()
   - Ollamaで埋め込み生成
   ↓
4. Neo4jにembeddingプロパティを保存
   ↓
5. Neo4jベクトル検索で類似資源を発見
   - COSINE類似度でスコアリング
   - 閾値: 0.6以上
   ↓
6. レスポンスに推薦リストを含める
   ↓
7. フロントエンドで表示
   - 「この資源と関連しそうな資源」
   - [つながりを作成]ボタン
```

### レスポンス例

```json
{
  "resource": {
    "id": "res_053",
    "name": "新しい支援センター",
    "type": "place",
    "description": "..."
  },
  "recommendations": [
    {
      "id": "res_001",
      "name": "小倉北区地域活動支援センター",
      "type": "place",
      "similarity": 0.85,
      "reason": "同じエリアで類似したサービス"
    },
    {
      "id": "res_015",
      "name": "相談支援事業所みらい",
      "type": "person",
      "similarity": 0.72,
      "reason": "関連する支援内容"
    }
  ]
}
```

---

## 機能2: 利用パターン検出

### Cypherクエリ例

同じユーザーがフィードバックした資源ペアを検出:

```cypher
MATCH (u:User)-[:GAVE_FEEDBACK]->(:Feedback)-[:ABOUT]->(r1:Resource)
MATCH (u)-[:GAVE_FEEDBACK]->(:Feedback)-[:ABOUT]->(r2:Resource)
WHERE id(r1) < id(r2)
WITH r1, r2, count(DISTINCT u) as co_users
WHERE co_users >= 2

// 既存のCO_UTILIZEDリレーションを削除して再作成
MERGE (r1)-[rel:CO_UTILIZED]-(r2)
SET rel.strength = toFloat(co_users) / 10.0,
    rel.users_count = co_users,
    rel.detected_at = datetime()

RETURN r1.name, r2.name, co_users
ORDER BY co_users DESC
LIMIT 20
```

### バッチスクリプト

`scripts/run-pattern-detection.js`:

```javascript
import neo4jDriver from '../src/db/neo4j-driver.js';

async function detectPatterns() {
  const session = neo4jDriver.getSession();
  
  try {
    console.log('🔍 Starting pattern detection...');
    
    const result = await session.run(`
      MATCH (u:User)-[:GAVE_FEEDBACK]->(:Feedback)-[:ABOUT]->(r1:Resource)
      MATCH (u)-[:GAVE_FEEDBACK]->(:Feedback)-[:ABOUT]->(r2:Resource)
      WHERE id(r1) < id(r2)
      WITH r1, r2, count(DISTINCT u) as co_users
      WHERE co_users >= 2
      
      MERGE (r1)-[rel:CO_UTILIZED]-(r2)
      SET rel.strength = toFloat(co_users) / 10.0,
          rel.users_count = co_users,
          rel.detected_at = datetime()
      
      RETURN r1.name as resource1, r2.name as resource2, co_users
      ORDER BY co_users DESC
    `);
    
    console.log(`✅ Detected ${result.records.length} patterns`);
    
    result.records.forEach(record => {
      console.log(`  ${record.get('resource1')} ↔ ${record.get('resource2')} (${record.get('co_users')} users)`);
    });
    
  } finally {
    await session.close();
  }
}

detectPatterns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
```

**Cron設定** (`package.json`):
```json
{
  "scripts": {
    "detect:patterns": "node scripts/run-pattern-detection.js"
  }
}
```

---

## 機能3: フィードバック分析とタグ提案

### プロンプト設計

```javascript
function buildTagAnalysisPrompt(feedbackText, existingTags) {
  return `あなたは障害福祉サービスの支援者です。以下のフィードバック内容を分析し、適切なタグを提案してください。

【フィードバック内容】
${feedbackText}

【既存のタグ一覧】
${existingTags.join(', ')}

【指示】
1. フィードバックの内容から、既存のタグリストの中で関連するタグを選んでください
2. 各タグの信頼度を0-100%で評価してください（70%以上を推奨）
3. 既存タグに該当しない場合、新しいタグを提案してください

【回答形式】（必ずJSON形式で回答してください）
{
  "existing_tags": [
    {"tag": "タグ名", "confidence": 85}
  ],
  "new_tags": [
    {"tag": "新しいタグ名", "reason": "提案理由"}
  ]
}

必ずJSON形式のみで回答してください。他の説明は不要です。`;
}
```

### 分析実行

```javascript
async function analyzeFeedbackForTags(feedbackText, existingTags) {
  const prompt = buildTagAnalysisPrompt(feedbackText, existingTags);
  
  try {
    const responseText = await callOllamaGenerate(prompt, 'qwen2.5:7b');
    
    // JSONパース（エラーハンドリング付き）
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // フォールバック: 空の結果を返す
      return { existingTags: [], newTags: [] };
    }
    
    return {
      existingTags: analysis.existing_tags || [],
      newTags: analysis.new_tags || []
    };
  } catch (error) {
    console.error('Tag analysis failed:', error);
    return { existingTags: [], newTags: [] };
  }
}
```

### 使用例

```javascript
const feedback = "とても静かで落ち着ける場所でした。駐車場も広くて便利です。";
const existingTags = ["静か", "にぎやか", "バリアフリー", "駐車場あり"];

const result = await analyzeFeedbackForTags(feedback, existingTags);

// 結果:
// {
//   existingTags: [
//     { tag: "静か", confidence: 90 },
//     { tag: "駐車場あり", confidence: 85 }
//   ],
//   newTags: [
//     { tag: "落ち着く", reason: "「落ち着ける場所」という表現から" }
//   ]
// }
```

---

## 機能4: AIダッシュボード

### UIコンポーネント構成

```typescript
// frontend/src/pages/AIInsightsPage.tsx

interface AIInsightsPageProps {}

export function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState<'connections' | 'tags' | 'patterns'>('connections');
  
  return (
    <div className="ai-insights-page">
      <h1>AI支援ダッシュボード</h1>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="connections">つながり提案</Tab>
        <Tab value="tags">タグ提案</Tab>
        <Tab value="patterns">利用パターン</Tab>
      </Tabs>
      
      {activeTab === 'connections' && <ConnectionSuggestions />}
      {activeTab === 'tags' && <TagSuggestions />}
      {activeTab === 'patterns' && <UtilizationPatterns />}
    </div>
  );
}
```

### ConnectionSuggestionsコンポーネント

```typescript
interface ConnectionSuggestion {
  resource1: Resource;
  resource2: Resource;
  strength: number;
  coUtilizationUsers: number;
}

export function ConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  
  useEffect(() => {
    fetchSuggestions();
  }, []);
  
  async function fetchSuggestions() {
    const response = await api.get('/ai-insights/connection-suggestions');
    setSuggestions(response.data.suggestions);
  }
  
  async function approveConnection(suggestion: ConnectionSuggestion) {
    await api.post('/ai-insights/approve-connection', {
      resource1Id: suggestion.resource1.id,
      resource2Id: suggestion.resource2.id,
      connectionType: 'related'
    });
    
    // 承認後、リストから削除
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  }
  
  return (
    <div className="connection-suggestions">
      <h2>推薦されたつながり</h2>
      
      {suggestions.map(suggestion => (
        <Card key={`${suggestion.resource1.id}-${suggestion.resource2.id}`}>
          <div className="suggestion-content">
            <div className="resource-pair">
              <ResourceCard resource={suggestion.resource1} />
              <ArrowIcon />
              <ResourceCard resource={suggestion.resource2} />
            </div>
            
            <div className="metrics">
              <span>共利用ユーザー: {suggestion.coUtilizationUsers}人</span>
              <span>強度: {(suggestion.strength * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="actions">
            <Button onClick={() => approveConnection(suggestion)}>
              承認して接続を作成
            </Button>
            <Button variant="secondary" onClick={() => rejectSuggestion(suggestion)}>
              却下
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## 実装コード例

### ollama-embedding-service.js

```javascript
const fetch = require('node-fetch');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Generate embedding using Ollama
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('❌ Ollama embedding generation failed:', error);
    throw error;
  }
}

/**
 * Test Ollama connection
 */
async function testConnection() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (response.ok) {
      console.log('✅ Ollama connection successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Ollama connection failed:', error);
    return false;
  }
}

module.exports = {
  generateEmbedding,
  testConnection
};
```

### feedback-analysis-service.js

```javascript
const fetch = require('node-fetch');
const neo4jDriver = require('../db/neo4j-driver');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'qwen2.5:7b';

/**
 * Analyze feedback and suggest tags
 */
async function analyzeFeedbackForTags(feedbackText, existingTags) {
  const prompt = `あなたは障害福祉サービスの支援者です。以下のフィードバック内容を分析し、適切なタグを提案してください。

【フィードバック内容】
${feedbackText}

【既存のタグ一覧】
${existingTags.join(', ')}

【指示】
1. フィードバックの内容から、既存のタグリストの中で関連するタグを選んでください
2. 各タグの信頼度を0-100%で評価してください
3. 既存タグに該当しない場合、新しいタグを提案してください

【回答形式】必ずJSON形式で回答:
{
  "existing_tags": [{"tag": "タグ名", "confidence": 85}],
  "new_tags": [{"tag": "新タグ", "reason": "理由"}]
}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    const data = await response.json();
    const analysis = JSON.parse(data.response);
    
    return {
      existingTags: analysis.existing_tags || [],
      newTags: analysis.new_tags || []
    };
  } catch (error) {
    console.error('❌ Feedback analysis failed:', error);
    return { existingTags: [], newTags: [] };
  }
}

/**
 * Get tag suggestions for a feedback
 */
async function suggestTagsForFeedback(feedbackId) {
  const session = neo4jDriver.getSession();
  
  try {
    // Get feedback content
    const feedbackResult = await session.run(
      'MATCH (f:Feedback {id: $feedbackId}) RETURN f.content as content',
      { feedbackId }
    );
    
    if (feedbackResult.records.length === 0) {
      throw new Error('Feedback not found');
    }
    
    const feedbackContent = feedbackResult.records[0].get('content');
    
    // Get existing tags
    const tagsResult = await session.run(
      'MATCH (t:Tag) RETURN t.name as name ORDER BY t.usage_count DESC'
    );
    
    const existingTags = tagsResult.records.map(r => r.get('name'));
    
    // Analyze with Ollama
    return await analyzeFeedbackForTags(feedbackContent, existingTags);
  } finally {
    await session.close();
  }
}

/**
 * Apply tags to a resource
 */
async function applyTagsToResource(resourceId, tagNames) {
  const session = neo4jDriver.getSession();
  
  try {
    for (const tagName of tagNames) {
      await session.run(`
        MERGE (t:Tag {name: $tagName})
        ON CREATE SET t.id = 'tag_' + randomUUID(),
                     t.category = 'auto_suggested',
                     t.usage_count = 0
        
        WITH t
        MATCH (r:Resource {id: $resourceId})
        MERGE (r)-[:HAS_TAG]->(t)
        SET t.usage_count = t.usage_count + 1
      `, { tagName, resourceId });
    }
    
    return { success: true, appliedTags: tagNames };
  } finally {
    await session.close();
  }
}

module.exports = {
  analyzeFeedbackForTags,
  suggestTagsForFeedback,
  applyTagsToResource
};
```

---

## トラブルシューティング

### Ollamaに接続できない

**症状**: `ECONNREFUSED` エラー

**確認事項**:
1. Macでollamaが起動しているか
   ```bash
   ollama list
   ```

2. ollamaを起動
   ```bash
   ollama serve
   ```

3. Dockerから接続テスト
   ```bash
   curl http://host.docker.internal:11434/api/tags
   ```

### 埋め込み生成が遅い

**対策**:
1. 軽量モデルに変更
   ```bash
   ollama pull all-minilm  # 384次元
   ```

2. バッチ処理でキャッシュ活用

### JSON解析エラー

**対策**:
1. `format: 'json'` パラメータを明示
2. プロンプトに「必ずJSON形式で」を強調
3. try-catchでフォールバック処理

---

**実装の準備が整いましたら、フェーズ0から順次作業を開始できます。**

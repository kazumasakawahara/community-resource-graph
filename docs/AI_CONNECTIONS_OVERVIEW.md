# AI支援「つながり」自動発見 - 実装仕様（概要版）

**プロジェクト**: Community Resource Graph  
**AIエンジン**: Ollama（ローカルLLM）  
**作成日**: 2025年11月15日

---

## 🎯 目的

現在手動で行っている資源間の「つながり」登録を、Ollamaベースの**ローカルAI**で支援し、支援者の負担を軽減しながら、ネットワークを自然に成長させる。

---

## 🤖 使用するOllamaモデル

### 埋め込みモデル（セマンティック検索用）

```bash
# 推奨: nomic-embed-text
ollama pull nomic-embed-text
```

**特徴**:
- 768次元ベクトル（現行システムと互換）
- 日本語対応
- 高速（CPU上でも動作）

### テキスト生成モデル（フィードバック分析用）

```bash
# 推奨: qwen2.5:7b
ollama pull qwen2.5:7b
```

**特徴**:
- 日本語の理解が優秀
- 指示に従う能力が高い
- 推論速度が速い

**メモリ要件**: 最低8GB RAM推奨

---

## ✨ 実装する4つの機能

### 1️⃣ 新規資源登録時の自動推薦

**動作フロー**:
```
資源登録 → Ollama埋め込み生成 → Neo4jベクトル検索 
→ 類似資源を推薦 → ワンクリックで「つながり」作成
```

### 2️⃣ 利用パターン検出

**動作フロー**:
```
バッチ処理（夜間） → フィードバック分析 
→ 同じユーザーが利用した資源ペアを検出
→ CO_UTILIZEDリレーション作成
```

### 3️⃣ フィードバック内容の分析とタグ自動提案

**動作フロー**:
```
フィードバック投稿 → Ollama(qwen2.5)で分析
→ 既存タグとの関連性判定 → タグ候補を提案
→ 支援者が承認/却下
```

### 4️⃣ AIダッシュボード

**表示内容**:
- 推薦されたつながり（承認/却下可能）
- タグ提案リスト（適用/却下可能）
- 利用パターン統計

---

## 🏗️ 技術構成

### 新規作成するファイル

```
src/
├── services/
│   ├── ollama-embedding-service.js      # Ollama埋め込み
│   ├── pattern-detection-service.js     # 利用パターン検出
│   ├── feedback-analysis-service.js     # フィードバック分析
│   └── ai-insights-service.js           # AI推薦統合
│
├── controllers/
│   └── ai-insights-controller.js        # APIコントローラー
│
├── routes/
│   └── ai-insights-routes.js            # ルーティング

scripts/
└── run-pattern-detection.js             # バッチ処理

frontend/src/
├── pages/
│   └── AIInsightsPage.tsx               # AIダッシュボード
└── components/AIInsights/
    ├── ConnectionSuggestions.tsx
    ├── TagSuggestions.tsx
    └── UtilizationPatterns.tsx
```

### API設計

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/ai-insights/connection-suggestions` | つながり提案取得 |
| POST | `/api/ai-insights/approve-connection` | つながり承認 |
| GET | `/api/ai-insights/tag-suggestions` | タグ提案取得 |
| POST | `/api/ai-insights/apply-tags` | タグ適用 |

---

## 📊 実装フェーズ（6-8週間）

| フェーズ | 期間 | 内容 |
|---------|------|------|
| 0 | 1日 | 環境準備（Ollamaモデルダウンロード） |
| 1 | 3-4日 | Ollama統合基盤 |
| 2 | 4-5日 | 利用パターン検出 |
| 3 | 5-6日 | フィードバック分析 |
| 4 | 3-4日 | AI Insights統合 |
| 5 | 7-10日 | フロントエンド実装 |
| 6 | 3-4日 | 既存フロー統合 |
| 7 | 5-7日 | 最適化・本番準備 |

**合計**: 31-41日（約6-8週間）

---

## ⚙️ 環境設定

### .env設定

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=qwen2.5:7b

# AI Feature Flags
ENABLE_AUTO_RECOMMENDATIONS=true
ENABLE_TAG_SUGGESTIONS=true
ENABLE_PATTERN_DETECTION=true

# AI Thresholds
SIMILARITY_THRESHOLD=0.6
TAG_CONFIDENCE_THRESHOLD=0.7
CO_UTILIZATION_MIN_USERS=2
```

### Docker設定

`docker-compose.yml`に以下を追加:

```yaml
services:
  app:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## 🔒 プライバシー保護の利点

- ✅ すべてローカル処理（外部APIへのデータ送信なし）
- ✅ GDPR/個人情報保護法に完全準拠
- ✅ 障害福祉サービスの個人情報を保護
- ✅ コスト削減（API利用料不要）
- ✅ オフライン動作可能

---

## 🚀 次のステップ

1. **Ollamaモデルの確認・ダウンロード**
   ```bash
   ollama list
   ollama pull nomic-embed-text
   ollama pull qwen2.5:7b
   ```

2. **この仕様書のレビュー**
   - 追加・変更したい機能の確認
   - 優先順位の決定

3. **実装開始**
   - フェーズ0（環境準備）から順次実装

---

**詳細な実装内容は `AI_CONNECTIONS_DETAILS.md` を参照してください。**

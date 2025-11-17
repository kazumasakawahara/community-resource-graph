# Community Resource Graph

Neo4jベースの障害者支援ネットワーク可視化システム - AI駆動のセマンティック検索とレコメンデーション機能を備えた地域資源グラフデータベース

## 🎯 プロジェクト概要

このシステムは、障害者支援に関わる地域資源（施設、サービス、支援団体）をグラフデータベースで管理し、以下の機能を提供します：

- **グラフベースの資源管理**: Neo4jによる関係性の可視化
- **セマンティック検索**: Ollama埋め込みモデルによる自然言語検索
- **インテリジェントレコメンデーション**: ベクトル類似度ベースの関連資源推薦
- **利用パターン自動検出**: フィードバックデータから共利用パターンを検出
- **ネットワーク可視化**: D3.jsによるインタラクティブな関係性表示
- **ニーズマッチング**: 支援ニーズと資源のマッチング機能
- **フィードバックシステム**: ユーザーフィードバックの収集と分析

## ✅ プロジェクトステータス

**完成度: 10/10 (100%)** 🎉

すべての基本機能が実装され、テストが完了しました。

### テスト完了状況 (9/9)
- ✅ ユーザー登録・ログイン
- ✅ 資源一覧表示
- ✅ 資源登録
- ✅ 重複チェック
- ✅ キーワード検索
- ✅ セマンティック検索
- ✅ フィードバック投稿
- ✅ エゴネットワーク表示
- ✅ ダッシュボード統計

詳細は [TEST_STATUS.md](TEST_STATUS.md) を参照してください。

## 🏗️ システムアーキテクチャ

```
Frontend (React + TypeScript + Vite)
├── セマンティック検索UI
├── 資源詳細ページ
├── ネットワーク可視化 (D3.js)
└── レスポンシブデザイン

Backend (Express.js + Node.js)
├── RESTful API
├── 認証・認可
├── ベクトル埋め込み生成
└── Neo4jデータアクセス層

Database (Neo4j Graph Database)
├── Resource, Area, Tag, ResourceType ノード
├── LOCATED_IN, TAGGED_WITH, IS_TYPE 関係
├── ベクトルインデックス (768次元)
└── Cypherクエリによるグラフ操作

AI/ML (Ollama)
├── mxbai-embed-large モデル
├── セマンティック埋め込み生成（1024次元）
├── コサイン類似度計算
└── 利用パターン検出
```

## ✨ 主要機能

### 1. セマンティック検索
- 自然言語クエリによる資源検索
- E5プレフィックス ("query:", "passage:") による最適化
- デフォルト閾値: 0.5 (50%類似度以上)
- モード切替: キーワード検索 ⇄ セマンティック検索

### 2. AIレコメンデーション
- ベクトル類似度ベースの関連資源推薦
- デフォルト閾値: 0.6 (60%類似度以上)
- 既存の接続関係を考慮 (`is_connected` フラグ)
- 類似度スコアをパーセンテージ表示

### 3. ネットワーク可視化
- D3.js物理シミュレーション
- インタラクティブな操作 (ズーム、ドラッグ、ホバー)
- エゴネットワーク表示 (1-3段階の深さ)
- レスポンシブデザイン (モバイル対応)
- アクセシビリティ (ARIA属性、キーボードナビゲーション)

### 4. ニーズマッチング
- 支援ニーズの登録と管理
- 地域別ニーズ検索
- ステータス管理 (pending, matched, resolved)
- マッチング履歴

### 5. フィードバックシステム
- 資源への訪問フィードバック投稿
- 訪問日記録
- コメント投稿
- 「役に立った」機能
- 資源別フィードバック集計

### 6. 利用パターン自動検出
- フィードバックデータから共利用パターンを検出
- CO_UTILIZEDリレーションシップの自動生成・更新
- 共利用強度（strength）と共通ユーザー数（users_count）の算出
- バッチ処理スクリプトによる定期実行
- API統合による共利用資源の動的取得

## 🚀 セットアップ

### 前提条件

- Node.js 20.x 以上
- Docker & Docker Compose (Neo4j用)
- npm または yarn

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/kazumasakawahara/community-resource-graph.git
cd community-resource-graph

# 2. 依存関係をインストール
npm install

# フロントエンドの依存関係もインストール
cd frontend && npm install && cd ..

# 3. Neo4jデータベースを起動
docker compose up -d

# 4. データベースを初期化
npm run db:init-schema
npm run db:seed-demo

# 5. ベクトルインデックスを作成
npm run db:create-indexes
npm run db:vectorize

# 6. 開発サーバーを起動（バックエンド）
npm run dev

# 7. 別のターミナルでフロントエンドを起動
cd frontend && npm run dev
```

アプリケーションにアクセス:
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000
- Neo4jブラウザ: http://localhost:17474

### 環境変数

`.env` ファイルを作成し、以下の設定を追加：

```env
# Neo4j設定
NEO4J_URI=bolt://localhost:17687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# サーバー設定
PORT=3000
NODE_ENV=development

# JWT設定
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## 📦 プロジェクト構造

```
community-resource-graph/
├── frontend/                 # Reactフロントエンド
│   ├── src/
│   │   ├── api/             # API クライアント
│   │   ├── components/      # React コンポーネント
│   │   │   ├── Network/     # ネットワーク可視化
│   │   │   ├── Resources/   # 資源管理
│   │   │   ├── Needs/       # ニーズ管理
│   │   │   └── Auth/        # 認証
│   │   ├── pages/           # ページコンポーネント
│   │   └── types/           # TypeScript型定義
│   └── package.json
│
├── src/                     # バックエンド
│   ├── controllers/         # APIコントローラー
│   ├── services/            # ビジネスロジック
│   ├── dao/                 # データアクセス層
│   ├── middleware/          # Express ミドルウェア
│   ├── routes/              # APIルート
│   └── server.js            # エントリーポイント
│
├── scripts/                 # ユーティリティスクリプト
│   ├── init-schema.js       # スキーマ初期化
│   ├── seed-demo-data.js    # デモデータ投入
│   ├── create-vector-index.js
│   └── vectorize-resources.js
│
├── tests/                   # 統合テスト
│   └── integration/
│       ├── auth.test.js
│       ├── resource.test.js
│       ├── network.test.js
│       ├── needs.test.js
│       └── feedback.test.js
│
├── e2e/                     # E2Eテスト
│   ├── network-graph.spec.ts
│   ├── auth.spec.ts
│   └── helpers/
│
├── docs/                    # ドキュメント
│   ├── API_ENDPOINTS.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── system-overview.md
│
├── docker-compose.yml       # Neo4j設定
├── TEST_STATUS.md           # テスト状況報告書
└── README.md
```

## 🧪 テスト

### 統合テスト (Jest)

```bash
# 全テスト実行
npm test

# 個別テスト実行
npm test -- tests/integration/resource.test.js

# カバレッジ付き
npm test -- --coverage

# 現在のテスト結果: 93/93 (100%) ✅
# - 統合テスト: 68件
# - 利用パターン検出: 25件（ユニット15件 + 統合10件）
```

### E2Eテスト (Playwright)

```bash
# 全E2Eテスト実行
npm run test:e2e

# NetworkGraph テスト
npx playwright test e2e/network-graph.spec.ts

# ヘッドレスモードで実行
npx playwright test --headed

# デバッグモード
npx playwright test --debug

# 現在のテスト結果: 17/17 NetworkGraph tests ✅
```

### 手動テスト

すべての主要機能が手動テストで検証済みです：

1. ✅ ユーザー登録・ログイン機能
2. ✅ 資源一覧表示（52件）
3. ✅ 資源登録フォーム
4. ✅ 重複チェック機能
5. ✅ キーワード検索
6. ✅ セマンティック検索（AI検索）
7. ✅ フィードバック投稿機能
8. ✅ エゴネットワーク可視化
9. ✅ ダッシュボード統計表示

詳細なテスト結果は [TEST_STATUS.md](TEST_STATUS.md) を参照してください。

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# フロントエンド起動 (別ターミナル)
cd frontend && npm run dev

# バックエンドのみ起動
node src/server.js

# データベース操作
npm run db:init-schema      # スキーマ初期化
npm run db:seed-demo        # デモデータ投入
npm run db:create-indexes   # インデックス作成
npm run db:vectorize        # ベクトル化実行

# パターン検出
npm run detect:patterns     # 利用パターン自動検出実行
npm run detect:patterns -- --min-users=3  # 最小共通ユーザー数を指定
npm run detect:patterns -- --dry-run      # ドライラン（検出のみ）

# テスト
npm test                    # 統合テスト
npm run test:e2e           # E2Eテスト
npm run test:search        # 検索機能テスト

# コード品質
npm run lint               # ESLint
npm run typecheck          # TypeScript型チェック
```

## 📊 API エンドポイント

### 認証
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報

### 資源
- `GET /api/resources` - 資源一覧
- `GET /api/resources/search` - キーワード検索
- `POST /api/resources/semantic-search` - セマンティック検索
- `GET /api/resources/:id` - 資源詳細
- `GET /api/resources/:id?includeCoUtilized=true` - 資源詳細（共利用資源含む）
- `POST /api/resources` - 資源作成（要認証）
- `PUT /api/resources/:id` - 資源更新（要認証）
- `GET /api/resources/:id/recommendations` - AIレコメンデーション

### ネットワーク
- `GET /api/resources/:id/network` - エゴネットワーク取得

### ニーズ
- `GET /api/needs` - ニーズ一覧
- `POST /api/needs` - ニーズ作成（要認証）
- `PUT /api/needs/:id/status` - ステータス更新（要認証）
- `GET /api/needs/area/:areaId` - 地域別ニーズ

### フィードバック
- `POST /api/feedback` - フィードバック投稿（要認証）
- `GET /api/feedback/resource/:id` - 資源別フィードバック

### 統計・マスタ
- `GET /api/stats/dashboard` - ダッシュボード統計
- `GET /api/stats/areas` - エリア別統計
- `GET /api/stats/tags` - タグ統計
- `GET /api/areas` - 地域一覧
- `GET /api/tags` - タグ一覧

## 🎨 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速ビルドツール
- **D3.js** - データ可視化
- **Axios** - HTTP クライアント
- **React Router** - ルーティング

### バックエンド
- **Node.js 20** - ランタイム
- **Express.js** - Webフレームワーク
- **Neo4j** - グラフデータベース
- **JWT** - 認証トークン
- **bcryptjs** - パスワードハッシュ

### AI/ML
- **Ollama** - ローカルLLM実行環境
- **mxbai-embed-large** - 多言語埋め込みモデル（1024次元）
- **コサイン類似度計算** - JavaScript実装

### テスト
- **Jest** - 統合テストフレームワーク
- **Playwright** - E2Eテストフレームワーク
- **Supertest** - HTTP アサーション

### DevOps
- **Docker Compose** - コンテナオーケストレーション
- **ESLint** - 静的解析
- **Git** - バージョン管理

## 🔬 セマンティック検索の仕組み

### 1. 埋め込みベクトル生成

```javascript
// E5モデルのプレフィックス使用
const queryVector = await generateEmbedding(`query: ${userQuery}`);
const docVector = await generateEmbedding(`passage: ${resourceDescription}`);
```

### 2. コサイン類似度計算

```javascript
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

### 3. 類似度閾値

- **検索**: 0.5 (50%以上)
- **レコメンデーション**: 0.6 (60%以上)

### 4. パフォーマンス最適化

- **モデル事前ロード**: サーバー起動時にロード（初回検索の高速化）
- **タイムアウト設定**: 90秒（モデル初期化）、10秒（埋め込み生成）
- **JavaScript実装**: Neo4j GDSライブラリ不要（プラットフォーム独立性）

## 📈 パフォーマンス指標

### サーバー起動
- 初回起動: 30-60秒（モデルダウンロード含む）
- 通常起動: 5-10秒（モデルキャッシュ済み）

### 検索レスポンス
- 初回検索: 1-2秒（モデル準備済み）
- 2回目以降: 0.5-1秒

### ネットワーク可視化
- 初期描画: 500ms-1s（ノード数による）
- インタラクション: <100ms（60fps）

## 🛡️ セキュリティ

- **JWT認証**: ステートレス認証
- **パスワードハッシュ**: bcryptjs (10 rounds)
- **入力検証**: すべてのAPIエンドポイントで実施
- **重複チェック**: 同一名称+住所での重複登録を防止
- **CORS設定**: 開発環境のみ許可
- **環境変数**: 機密情報の外部化

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、GitHubのIssueを作成してください。

---

**Built with ❤️ for 障害者支援コミュニティ**

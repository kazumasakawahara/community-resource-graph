# Implementation Tasks

## Feature Information
- **Feature Name**: community-resource-graph
- **Language**: ja
- **Generated At**: 2025-11-11T12:30:00Z

---

## Phase 1: プロジェクトセットアップとインフラストラクチャ

- [ ] 1. 開発環境のセットアップ
- [x] 1.1 (P) バックエンドプロジェクト初期化
  - Node.js 18+ プロジェクト作成 (package.json, tsconfig.json)
  - Express.js, neo4j-driver, jsonwebtoken, bcryptjs, express-validator 依存関係追加
  - TypeScript設定 (strict mode, ES module)
  - _Requirements: 10_

- [x] 1.2 (P) フロントエンドプロジェクト初期化
  - Vite + React 18+ プロジェクト作成
  - Axios, React Router, Neovis.js 依存関係追加
  - TypeScript設定 (strict mode)
  - _Requirements: 7, 10_

- [x] 1.3 (P) Neo4jデータベースセットアップ
  - Docker Compose設定ファイル作成 (Neo4j 5.x コミュニティ版)
  - 環境変数管理 (.env.example, .gitignore)
  - Neo4j接続確認スクリプト
  - _Requirements: 11_

- [ ] 2. Neo4jデータベーススキーマ初期化
- [x] 2.1 制約とインデックスの作成
  - User.email uniqueness constraint
  - Resource, User, Feedback, Need, Area の id uniqueness constraints
  - Resource.name, Resource.type, Tag.name, Need.status, Area.name インデックス作成
  - スキーマ初期化スクリプト (Cypher)
  - _Requirements: 11_

- [x] 2.2 デモデータ生成スクリプト
  - 初期エリア作成 (小倉北区、八幡東区等)
  - 初期タグ作成 (静か、バリアフリー等)
  - デモ資源50件、ユーザー5名、フィードバック10件
  - ニーズ5件、つながり20件
  - _Requirements: 1, 2, 3, 5, 6, 8_

---

## Phase 2: バックエンド - データアクセス層 (DAO)

- [ ] 3. Neo4j Driver インスタンス管理
- [x] 3.1 ドライバシングルトン実装
  - Neo4j Driver設定 (接続プール、タイムアウト)
  - getDriver, getSession, close メソッド実装
  - 接続エラーハンドリング
  - _Requirements: 11_

- [ ] 4. User DAO実装
- [x] 4.1 (P) ユーザーCRUD操作
  - create: User ノード作成、password bcryptハッシュ化
  - findByEmail: email検索クエリ
  - findById: IDでユーザー取得
  - getUserContributions: 登録資源数・フィードバック数集計
  - _Requirements: 10_

- [ ] 5. Resource DAO実装
- [x] 5.1 (P) 資源CRUD操作
  - create: Resource ノード作成、REGISTERED_BY/LOCATED_IN リレーションシップ作成
  - findById: IDで資源詳細取得 (タグ、エリア、フィードバック含む)
  - incrementViewCount, incrementFeedbackCount: カウンタ更新
  - _Requirements: 1, 3_

- [x] 5.2 (P) 資源検索機能
  - search: タグ・エリア・キーワード複合検索クエリ
  - ページネーション (SKIP/LIMIT)、ソート (feedback_count, created_at, view_count)
  - 検索結果ゼロ時の代替候補ロジック (関連タグ、近隣エリア提案)
  - _Requirements: 2, 3, 4_

- [x] 5.3 (P) タグ管理
  - addTags: 既存Tag利用または新規Tag作成、HAS_TAG リレーションシップ作成
  - Tag.usage_count 自動インクリメント
  - suggestTags: usage_count上位タグ取得
  - _Requirements: 2_

- [x] 5.4 (P) 資源間のつながり管理
  - createRelationship: RELATED_TO リレーションシップ作成 (relation_type, distance, description)
  - findConnectedResources: 直接つながっている資源一覧取得
  - fetchEgoNetwork: 多段階つながり探索 (`[:RELATED_TO*1..3]`)、ノード数上限100件制御
  - _Requirements: 6, 7_

- [ ] 6. Feedback DAO実装
- [x] 6.1 (P) フィードバックCRUD操作
  - create: Feedback ノード作成、HAS_FEEDBACK/GIVEN_BY リレーションシップ作成
  - findByResourceId: 資源のフィードバック一覧取得 (投稿者情報含む)
  - incrementHelpfulCount: helpful_count 更新
  - _Requirements: 5_

- [ ] 7. Need DAO実装
- [x] 7.1 (P) ニーズCRUD操作
  - create: Need ノード作成 (status='open')、IN_AREA/RECORDED_BY リレーションシップ作成
  - findAll: ニーズ一覧取得 (status, areaフィルター、ページネーション)
  - findById: ニーズ詳細取得
  - updateStatus: status 更新 (open → matched → closed)
  - _Requirements: 8_

- [x] 7.2 (P) ニーズマッチング機能
  - findResourcesByArea: 同一エリア内の資源抽出
  - createMatch: MATCHED_BY リレーションシップ作成 (match_quality, note)
  - need.status を matched に更新
  - _Requirements: 9_

- [ ] 8. Analytics DAO実装
- [x] 8.1 (P) 統計集計クエリ
  - countAllResources, countAllFeedback, countAllNeeds: 全件数取得
  - countNeedsByStatus: ステータス別ニーズ数
  - getResourceDistributionByArea: エリア別資源分布
  - getPopularTags: usage_count 上位タグ
  - getUserRanking: 貢献度ランキング (登録資源数 + フィードバック数)
  - analyzeUnmatchedNeeds: 未マッチニーズの分類分析
  - _Requirements: 12_

---

## Phase 3: バックエンド - サービス層

- [ ] 9. UserService実装
- [ ] 9.1 (P) ユーザー認証機能
  - createUser: パスワードハッシュ化、User作成
  - authenticateUser: パスワード検証、JWT生成 (Access Token 15分, Refresh Token 7日)
  - refreshAccessToken: Refresh Tokenから新Access Token発行
  - _Requirements: 10_

- [ ] 9.2 (P) ユーザープロフィール機能
  - getUserProfile: プロフィール情報取得
  - getUserContributions: 登録資源・フィードバック・ニーズ一覧取得
  - _Requirements: 10_

- [ ] 10. ResourceService実装
- [ ] 10.1 (P) 資源管理ビジネスロジック
  - createResource: ID自動生成 (`{type}_{sequential}`)、view_count/feedback_count 初期化
  - getResourceById: 資源詳細取得、view_count 自動インクリメント
  - suggestTags: タグサジェスト機能
  - _Requirements: 1, 2_

- [ ] 10.2 (P) 資源検索ビジネスロジック
  - searchResources: 複合検索、ページネーション、ソート制御
  - 検索結果ゼロ時の代替候補提案ロジック実装
  - _Requirements: 4_

- [ ] 10.3 (P) タグ・つながり管理
  - addTagsToResource: タグ追加、usage_count 更新
  - createRelationship: つながり作成
  - getConnectedResources: つながり一覧取得
  - _Requirements: 2, 6_

- [ ] 11. FeedbackService実装
- [ ] 11.1 (P) フィードバック管理
  - createFeedback: フィードバック作成、Resource.feedback_count 自動インクリメント
  - getFeedbacksByResource: フィードバック一覧取得
  - incrementHelpfulCount: 役立ったカウント増加
  - _Requirements: 5_

- [ ] 12. NeedService実装
- [ ] 12.1 (P) ニーズ管理
  - createNeed: ニーズ作成 (status='open')
  - getNeeds: ニーズ一覧取得 (status='open' 優先)
  - getNeedById: ニーズ詳細取得
  - _Requirements: 8_

- [ ] 12.2 (P) ニーズマッチング推薦
  - findMatchingCandidates: 同一エリア資源抽出、match_quality 算出ロジック (high/medium/low)
  - createMatch: マッチング承認、need.status 更新
  - _Requirements: 9_

- [ ] 13. VisualizationService実装
- [ ] 13.1 (P) エゴネットワーク取得
  - getEgoNetwork: 深さ制限 (1..3)、ノード数上限100件制御
  - グラフデータ構造 (nodes[], edges[]) 生成
  - 警告メッセージ生成 (ノード数超過時)
  - _Requirements: 7_

- [ ] 14. AnalyticsService実装
- [ ] 14.1 (P) 統計分析機能
  - getSystemOverview: システム統計概要
  - getResourceDistributionByArea: エリア別分布
  - getPopularTags: 人気タグランキング
  - getUserRanking: ユーザー貢献度ランキング
  - analyzeUnmatchedNeeds: 未マッチニーズ分析
  - 5秒以内レスポンス最適化 (クエリチューニング)
  - _Requirements: 12_

---

## Phase 4: バックエンド - Web層 (Controllers & Middleware)

- [ ] 15. JWT認証ミドルウェア実装
- [ ] 15.1 (P) JWT検証ミドルウェア
  - authenticate: Access Token検証、req.user にデコードされたペイロードをセット
  - トークン期限切れ・無効エラーハンドリング (401 Unauthorized)
  - _Requirements: 10_

- [ ] 15.2 (P) 権限制御ミドルウェア
  - requireRole: 許可されたrole確認 (supporter, individual, family, resident)
  - 権限不足時403 Forbiddenエラー
  - _Requirements: 10_

- [ ] 16. エラーハンドリングミドルウェア実装
- [ ] 16.1 (P) グローバルエラーハンドラ
  - エラータイプ分類 (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, DatabaseError, InternalServerError)
  - HTTPステータスコード割り当て (400, 401, 403, 404, 409, 500)
  - ErrorResponse形式 JSON生成 (type, message, details, code, timestamp, path)
  - 開発環境でスタックトレース表示
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12_

- [ ] 17. バリデーションミドルウェア実装
- [ ] 17.1 (P) リクエストバリデーション
  - express-validator統合
  - 共通バリデーションルール (name, email, type, tags, areaId等)
  - XSS対策 (trim, escape)
  - バリデーションエラー時400エラー
  - _Requirements: 1, 2, 3, 5, 8, 10_

- [ ] 18. AuthController実装
- [ ] 18.1 (P) 認証エンドポイント
  - POST /api/auth/register: ユーザー登録
  - POST /api/auth/login: ログイン (JWT発行)
  - POST /api/auth/refresh: Access Token更新
  - POST /api/auth/logout: ログアウト
  - リクエストバリデーション適用
  - _Requirements: 10_

- [ ] 19. ResourceController実装
- [ ] 19.1 (P) 資源CRUD エンドポイント
  - POST /api/resources: 資源作成 (JWT認証必須)
  - GET /api/resources/:id: 資源詳細取得
  - POST /api/resources/:id/tags: タグ追加
  - POST /api/resources/:id/relationships: つながり作成
  - GET /api/resources/:id/connections: つながり一覧
  - リクエストバリデーション適用
  - _Requirements: 1, 2, 6_

- [ ] 19.2 (P) 資源検索エンドポイント
  - GET /api/resources/search: 複合検索 (tags, area, keyword, sortBy, page, limit)
  - ページネーションレスポンス (resources[], total, page, limit, hasMore)
  - _Requirements: 4_

- [ ] 20. FeedbackController実装
- [ ] 20.1 (P) フィードバックエンドポイント
  - POST /api/resources/:resourceId/feedback: フィードバック投稿 (JWT認証必須)
  - GET /api/resources/:resourceId/feedback: フィードバック一覧
  - POST /api/feedback/:id/helpful: 役立ったマーク
  - リクエストバリデーション適用
  - _Requirements: 5_

- [ ] 21. NeedController実装
- [ ] 21.1 (P) ニーズCRUDエンドポイント
  - POST /api/needs: ニーズ記録 (JWT認証必須)
  - GET /api/needs: ニーズ一覧 (status, area, page, limit)
  - GET /api/needs/:id: ニーズ詳細
  - リクエストバリデーション適用
  - _Requirements: 8_

- [ ] 21.2 (P) ニーズマッチングエンドポイント
  - GET /api/needs/:id/matches: マッチング候補取得
  - POST /api/needs/:id/match: マッチング承認 (JWT認証必須)
  - _Requirements: 9_

- [ ] 22. VisualizationController実装
- [ ] 22.1 (P) エゴネットワークエンドポイント
  - GET /api/visualization/ego-network/:resourceId: エゴネットワーク取得 (depth パラメータ、デフォルト2)
  - ノード数上限100件制御、警告メッセージ含む
  - _Requirements: 7_

- [ ] 23. AnalyticsController実装
- [ ] 23.1 (P) 統計エンドポイント
  - GET /api/analytics/overview: システム統計概要
  - GET /api/analytics/distribution/area: エリア別資源分布
  - GET /api/analytics/tags/popular: 人気タグランキング (limit パラメータ)
  - GET /api/analytics/users/ranking: ユーザー貢献度ランキング (limit パラメータ)
  - GET /api/analytics/needs/unmatched: 未マッチニーズ分析
  - _Requirements: 12_

- [ ] 24. Express アプリケーション統合
- [ ] 24.1 バックエンドサーバー起動
  - ルート統合 (auth, resources, feedback, needs, visualization, analytics)
  - CORS設定 (フロントエンドURLの許可、credentials: true)
  - Rate Limiting設定 (100リクエスト/15分)
  - グローバルエラーハンドラ適用
  - サーバー起動スクリプト (PORT: 4000)
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12_

---

## Phase 5: フロントエンド - コンポーネント実装

- [ ] 25. 認証コンポーネント実装
- [ ] 25.1 (P) ログイン・登録UIコンポーネント
  - LoginComponent: メールアドレス・パスワード入力フォーム
  - RegisterComponent: ユーザー登録フォーム (name, email, password, role, organization)
  - AuthContext: JWT管理、ログイン状態保持
  - PrivateRoute: JWT認証が必要なルート保護
  - _Requirements: 10_

- [ ] 26. 資源コンポーネント実装
- [ ] 26.1 (P) 資源一覧・検索UIコンポーネント
  - ResourceListComponent: 資源一覧表示、フィルター (tags, area, keyword, sortBy)
  - TagSelectorComponent: タグ選択UI、サジェスト機能
  - AreaSelectorComponent: エリア選択UI
  - PaginationComponent: ページネーション
  - _Requirements: 2, 3, 4_

- [ ] 26.2 (P) 資源詳細UIコンポーネント
  - ResourceDetailComponent: 資源詳細表示 (タグ、エリア、つながり、フィードバック一覧)
  - フィードバック投稿ボタン、エゴネットワーク表示ボタン
  - _Requirements: 1, 5, 6_

- [ ] 26.3 (P) 資源登録UIコンポーネント
  - ResourceFormComponent: 資源登録フォーム (name, type, description, address, contact, hours, areaId, tags)
  - リアルタイムバリデーション (name必須、type選択)
  - _Requirements: 1, 2, 3_

- [ ] 27. フィードバックコンポーネント実装
- [ ] 27.1 (P) フィードバックUIコンポーネント
  - FeedbackFormComponent: フィードバック投稿フォーム (content, visit_date)
  - FeedbackListComponent: フィードバック一覧表示 (投稿者、投稿日、訪問日、helpful_count)
  - 役立ったマークボタン
  - _Requirements: 5_

- [ ] 28. ニーズコンポーネント実装
- [ ] 28.1 (P) ニーズ管理UIコンポーネント
  - NeedListComponent: ニーズ一覧 (status='open' 優先表示)
  - NeedFormComponent: ニーズ記録フォーム (title, description, target, purpose, areaId)
  - _Requirements: 8_

- [ ] 28.2 (P) ニーズマッチングUIコンポーネント
  - NeedDetailComponent: ニーズ詳細表示、マッチング候補一覧
  - マッチング承認ボタン (note入力)
  - match_quality表示 (high/medium/low)
  - _Requirements: 9_

- [ ] 29. エゴネットワーク可視化コンポーネント実装
- [ ] 29.1 Neovis.js統合
  - EgoNetworkComponent: Neovis.js初期化、API連携
  - グラフ描画 (nodes, edges, relation_type別の色・スタイル)
  - ノードクリックイベント (資源詳細パネル表示)
  - 深さ調整UI (depth: 1-3)
  - ズーム、パン操作
  - _Requirements: 7_

- [ ] 30. 統計ダッシュボードコンポーネント実装
- [ ] 30.1 (P) ダッシュボードUIコンポーネント
  - DashboardComponent: システム統計概要表示 (全資源数、全フィードバック数、全ニーズ数)
  - エリア別資源分布グラフ
  - 人気タグランキング表示
  - ユーザー貢献度ランキング表示
  - _Requirements: 12_

- [ ] 31. React アプリケーション統合
- [ ] 31.1 ルーティング・レイアウト統合
  - React Router設定 (/, /login, /register, /resources, /resources/:id, /needs, /needs/:id, /visualization, /dashboard)
  - NavbarComponent: ナビゲーションバー、ログインユーザー表示
  - FooterComponent: フッター
  - AuthContext Provider適用
  - PrivateRoute適用 (資源登録、フィードバック投稿、ニーズ記録)
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12_

---

## Phase 6: テストとQA

- [ ] 32. バックエンド ユニットテスト
- [ ] 32.1 Service層ユニットテスト
  - UserService, ResourceService, FeedbackService, NeedService, VisualizationService, AnalyticsService のテストケース作成
  - モックDAO使用、Jest + ts-jest
  - カバレッジ80%以上確保
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12_

- [ ] 32.2 (P) DAO層ユニットテスト
  - ResourceDAO, UserDAO, FeedbackDAO, NeedDAO, AnalyticsDAO のテストケース作成
  - モックNeo4j Driver使用
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12_

- [ ] 33. バックエンド 統合テスト
- [ ] 33.1 Neo4j Testcontainers統合テスト
  - Service + DAO + 実Neo4jデータベース統合テスト
  - 主要APIフロー (資源登録→検索→フィードバック投稿、ニーズ記録→マッチング)
  - Jest + Testcontainers
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12_

- [ ] 34. E2Eテスト
- [ ] 34.1 Playwright E2Eテストシナリオ
  - ユーザー登録→ログイン→資源登録→検索→詳細閲覧
  - フィードバック投稿→役立ったマーク
  - ニーズ記録→マッチング候補確認→マッチング承認
  - エゴネットワーク可視化→ノードクリック→詳細パネル表示
  - 統計ダッシュボード閲覧
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12_

- [ ] 35. パフォーマンステスト
- [ ] 35.1 k6 負荷テスト
  - 検索クエリレスポンス3秒以内検証 (資源1000件以下)
  - エゴネットワーク取得5秒以内検証 (深さ3、100ノード以下)
  - 同時接続50ユーザー負荷テスト
  - _Requirements: 4, 7_

---

## Summary

**Total**: 35 major tasks, 60+ sub-tasks
**All Requirements Covered**: 1-12 (12 requirements)
**Average Task Size**: 1-3 hours per sub-task

### Quality Validation
- ✅ All 12 requirements mapped to tasks
- ✅ Task dependencies verified (DAO → Service → Controller → UI)
- ✅ Testing tasks included (Unit, Integration, E2E, Performance)
- ✅ Parallel execution markers applied (P) for independent tasks
- ✅ Natural language descriptions focused on capabilities

### Next Action
タスクをレビューし、承認後に実装フェーズに進んでください。
実装開始前に**必ずコンテキストをクリア**し、タスク間で新しいセッションを開始することを推奨します。

```bash
# タスク承認・実装開始
/kiro:spec-impl community-resource-graph 1.1  # 個別タスク実行 (推奨)
/kiro:spec-impl community-resource-graph 1.1,1.2  # 複数タスク実行
/kiro:spec-impl community-resource-graph  # 全タスク実行 (非推奨: コンテキスト肥大化)
```

---

_Generated at: 2025-11-11T12:30:00Z_

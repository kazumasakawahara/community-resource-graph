# Research & Design Decisions

## Summary
- **Feature**: community-resource-graph
- **Discovery Scope**: New Feature (Greenfield開発)
- **Key Findings**:
  - Node.js + Express + React スタックがNeo4jとの統合実績豊富
  - Neovis.js (Neo4j公式) がReact統合とグラフ可視化に最適
  - JWT認証 + bcryptが Node.js APIのセキュリティ標準
  - 3層アーキテクチャ (Web/Service/Data) がExpress.js REST APIの推奨パターン

## Research Log

### Neo4j Node.js Driver統合
- **Context**: バックエンドからNeo4jへの接続方法とベストプラクティスの調査
- **Sources Consulted**:
  - [Neo4j JavaScript Driver Manual (公式)](https://neo4j.com/docs/javascript-manual/current/)
  - [Performance Recommendations (公式)](https://neo4j.com/docs/javascript-manual/current/performance/)
  - [neo4j-driver npm package](https://www.npmjs.com/package/neo4j-driver)

- **Findings**:
  - **最新バージョン**: neo4j-driver v5.x (Node.js 18以降必須)
  - **バージョン互換性**: Driver v5.xはNeo4j 4.4, 5.x, 2025.x全てサポート
  - **セッション管理**: Driver/Session両方で`.close()`メソッド呼び出し必須
  - **パフォーマンス最適化**:
    - クラスタ環境で読み取りクエリは`routing: READ`設定
    - 頻繁にフィルタするプロパティにインデックス作成 (name, type等)
    - 新規データ挿入時は`MERGE`ではなく`CREATE`使用 (クエリ数半減)
  - **データ型処理**: Neo4jから受け取る整数は内部integer型で表現、JavaScriptのnumber型は自動的にFloat型認識

- **Implications**:
  - Driver v5.x + Node.js 18以降を技術スタックに採用
  - データアクセス層でDriver/Sessionライフサイクル管理必須
  - インデックス戦略を初期化スクリプトに実装 (Resource.name, Resource.type等)
  - Cypherクエリで`CREATE`優先、`MERGE`は既存チェック時のみ使用

### React Neo4j グラフ可視化ライブラリ
- **Context**: Requirement 7 (エゴネットワーク可視化) 実装のためのライブラリ選定
- **Sources Consulted**:
  - [Graph Visualization Tools - Neo4j公式](https://neo4j.com/developer/tools-graph-visualization/)
  - [15 Best Graph Visualization Tools (Neo4j Blog)](https://neo4j.com/blog/graph-visualization/neo4j-graph-visualization-tools/)
  - [react-graph-viz-engine GitHub](https://github.com/neo4j-field/react-graph-viz-engine)

- **Findings**:
  - **Neovis.js**:
    - Neo4j公式、Vis.jsラッパー
    - Cypherクエリを直接実行してブラウザ描画
    - React統合が容易、Neo4jプロパティグラフモデルと親和性高い
    - 中規模データセット向け (数千ノード)

  - **Cytoscape.js**:
    - 最も広範なオープンソースライブラリ
    - 数万ノード・数十万エッジ対応
    - 豊富なレイアウト・スタイリング・イベントハンドリング
    - タッチスクリーン対応
    - 学習曲線やや高い

  - **D3.js**:
    - 最高レベルのカスタマイズ性
    - ノード・エッジを別々のコレクションに変換必要
    - 学習曲線高いが強力
    - 複雑な可視化プロジェクト向け

- **Implications**:
  - **Phase 1-2**: Neovis.js推奨 (Neo4j公式、Cypher直接実行、React統合容易)
  - **Phase 3 (スケール時)**: Cytoscape.js検討 (大規模データセット対応)
  - グラフ可視化コンポーネントは独立コンポーネント化 (ライブラリ切り替え容易)
  - エゴネットワーク取得APIはライブラリ非依存のデータ構造で返す (nodes[], edges[])

### Express.js + Neo4j REST API アーキテクチャ
- **Context**: バックエンドAPIの構造パターン調査
- **Sources Consulted**:
  - [A Minimalist Architecture Pattern for Express.js API (DEV Community)](https://dev.to/dividedbynil/a-minimalist-architecture-pattern-for-expressjs-api-applications-nee)
  - [Node.js Architectural Patterns (DEV Community)](https://dev.to/sasithwarnakafonseka/nodejs-architectural-patterns-with-examples-1335)
  - [Building Neo4j Applications with Node.js (GraphAcademy)](https://neo4j.com/developer/js-movie-app/)

- **Findings**:
  - **3層アーキテクチャ (標準パターン)**:
    - **Web Layer** (Routes, Controllers, Middleware): HTTPリクエスト送受信・バリデーション
    - **Service/Business Logic Layer**: ビジネスロジック・ワークフロー処理
    - **Data Access Layer**: データベース読み書き (Neo4j Driver使用)

  - **Neo4j統合方式**:
    - neo4j-driverパッケージでDB接続設定
    - Session + Transactionでデータベース操作
    - CypherクエリをData Access Layerに集中管理
    - 取得データをJSON形式にマッピングしてAPI返却

  - **RESTful設計**:
    - リソースベースURLパターン (`/resources`, `/needs`, `/feedbacks`)
    - HTTPメソッド標準使用 (GET, POST, PUT, DELETE)
    - ステートレス設計 (JWT認証)

- **Implications**:
  - 3層アーキテクチャ採用:
    - `/src/routes/`: エンドポイント定義
    - `/src/controllers/`: リクエストハンドリング
    - `/src/services/`: ビジネスロジック
    - `/src/database/`: Neo4j Driver操作、Cypherクエリ
  - Cypherクエリテンプレート化 (再利用性向上)
  - トランザクション境界明確化 (リレーションシップ作成時等)

### JWT認証 Express.js ベストプラクティス
- **Context**: Requirement 10 (ユーザー管理・認証) のセキュリティ実装調査
- **Sources Consulted**:
  - [5 JWT Authentication Best Practices (Tech Tonic)](https://medium.com/deno-the-complete-reference/5-jwt-authentication-best-practices-for-node-js-apps-f1aaceda3f81)
  - [Securing Express.js APIs with JWT (InfyOm)](https://infyom.com/blog/best-practices-securing-nodejs-express-apis-with-jwt-authentication-and-custom-authorization/)
  - [JWT Authentication in Node.js Practical Guide](https://dvmhn07.medium.com/jwt-authentication-in-node-js-a-practical-guide-c8ab1b432a49)

- **Findings**:
  - **セキュアな秘密鍵管理**:
    - 環境変数でJWT秘密鍵保存 (dotenv使用)
    - ハードコード禁止、公開リポジトリ除外

  - **トークン有効期限戦略**:
    - Access Token: 短期間 (15分〜1時間)
    - Refresh Token: 長期間 (1日〜1週間)

  - **Refresh Token実装**:
    - 短命Access Tokenと長命Refresh Token併用
    - セキュリティ妥協なくユーザーセッション維持

  - **追加セキュリティ対策**:
    - `helmet`ミドルウェア: セキュアHTTPヘッダー設定
    - `express-validator`: 入力バリデーション
    - HTTPS: 本番環境必須

  - **トークンベースアーキテクチャ利点**:
    - ステートレスAPI設計
    - サーバーにセッションデータ保存不要
    - マイクロサービス・水平スケーリング適合

  - **ミドルウェア実装**:
    - JWT検証ミドルウェア: 全APIリクエスト検証
    - Role-based Authorization: ユーザー役割チェック

- **Implications**:
  - JWT + bcrypt認証実装:
    - `jsonwebtoken` パッケージ使用
    - `bcrypt` パッケージでパスワードハッシュ化
  - Access Token (15分) + Refresh Token (7日) 設計
  - 環境変数管理: `.env` (gitignore必須)
  - ミドルウェア: `/src/middleware/auth.js` (JWT検証、Role確認)
  - セキュリティパッケージ: helmet, express-validator, cors

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **3層アーキテクチャ** | Web (Routes/Controllers) → Service (Business Logic) → Data Access (Neo4j Driver) | ・関心の分離明確<br>・Express.js標準パターン<br>・保守性高い<br>・テスト容易 | ・小規模プロジェクトには過剰<br>・レイヤー間のボイラープレート | **選定**: Express.js + Neo4j実績多数、Phase 1 MVP〜Phase 3拡張に適合 |
| **Hexagonal (Ports & Adapters)** | コアドメインを外部技術から分離 | ・技術スタック切り替え容易<br>・ドメインロジック純粋性 | ・アダプター層実装コスト高<br>・小規模には過剰設計 | Phase 3以降、複数データソース統合時に再検討 |
| **MVC (Model-View-Controller)** | フロントエンド統合型MVC | ・フルスタック一体化<br>・単純なCRUDに適合 | ・API専用設計には不向き<br>・フロントエンド分離推奨のため非採用 | REST API + React SPAの分離設計のため不採用 |

## Design Decisions

### Decision: Node.js + Express.js バックエンド
- **Context**: バックエンド言語・フレームワーク選定
- **Alternatives Considered**:
  1. **Node.js + Express.js** — JavaScript統一、Neo4j Driver公式対応、軽量
  2. **Python + FastAPI** — 型ヒント強力、非同期性能高い、学習コスト低
  3. **Java + Spring** — エンタープライズ実績、型安全性高い、開発速度遅

- **Selected Approach**: Node.js + Express.js
  - Neo4j公式JavaScript Driver (v5.x) 完全対応
  - フロントエンド (React) と言語統一 → 開発効率向上
  - npm エコシステム豊富 (JWT, validation, security)
  - 軽量・高速起動 → 開発イテレーション高速
  - GraphAcademy公式チュートリアル・サンプル豊富

- **Rationale**:
  - Phase 1 MVP目標 (Week 1-4) に最速開発可能
  - JavaScript統一で開発者認知負荷低減
  - Neo4j統合実績多数、トラブルシューティング情報豊富

- **Trade-offs**:
  - **Benefits**: 開発速度、エコシステム、Neo4j親和性
  - **Compromises**: Python比較で型安全性やや劣る (TypeScript併用で軽減)

- **Follow-up**: TypeScript導入検討 (型安全性向上、Phase 2以降)

### Decision: React フロントエンド
- **Context**: フロントエンドフレームワーク選定
- **Alternatives Considered**:
  1. **React** — 最大エコシステム、グラフ可視化ライブラリ豊富、コンポーネント再利用性高
  2. **Vue.js** — 学習曲線緩やか、軽量、日本語ドキュメント充実
  3. **Angular** — TypeScript標準、大規模向け、学習コスト高

- **Selected Approach**: React
  - Neovis.js, Cytoscape.js両方がReact統合サンプル提供
  - UIワイヤーフレーム (community-resource-wireframe.html) をReactコンポーネント化容易
  - コンポーネント駆動設計 → 段階的機能追加適合
  - React Hooks で状態管理シンプル

- **Rationale**:
  - グラフ可視化ライブラリのReact統合実績豊富
  - UIワイヤーフレーム既存 → 実装ガイド明確
  - コンポーネント再利用性 → Phase 1〜3拡張効率化

- **Trade-offs**:
  - **Benefits**: エコシステム、グラフライブラリ対応、実装速度
  - **Compromises**: Vue比較で学習曲線やや急 (ただし広範なチュートリアル存在)

### Decision: Neovis.js グラフ可視化 (Phase 1-2)
- **Context**: Requirement 7 (エゴネットワーク可視化) 実装ライブラリ
- **Alternatives Considered**:
  1. **Neovis.js** — Neo4j公式、Cypher直接実行、React統合容易
  2. **Cytoscape.js** — 大規模データセット対応、豊富な機能、学習コスト高
  3. **D3.js** — 最高カスタマイズ性、学習曲線最も急、データ変換必要

- **Selected Approach**: Phase 1-2はNeovis.js、Phase 3でCytoscape.js検討
  - Neovis.js利点:
    - Neo4j公式ライブラリ → 互換性保証
    - Cypherクエリ結果を直接描画 → データ変換不要
    - React統合サンプル豊富
    - 初期実装速度最速

  - 段階的移行計画:
    - Phase 1: Neovis.jsで基本可視化実装
    - Phase 2: 中規模データ (100ノード程度) で検証
    - Phase 3: データ規模拡大時にCytoscape.js移行検討

- **Rationale**:
  - Phase 1目標 (Week 1-4) で可視化機能デモ可能
  - Cypherクエリ → Neovis.js直接レンダリング → 実装最短
  - グラフ可視化コンポーネント独立化 → ライブラリ切り替え容易

- **Trade-offs**:
  - **Benefits**: 最速実装、Neo4j親和性、Phase 1目標達成
  - **Compromises**: 大規模データ時にパフォーマンス限界 (Phase 3でCytoscape.js移行で対応)

- **Follow-up**: グラフ可視化API設計時にライブラリ非依存データ構造採用 (nodes[], edges[])

### Decision: JWT認証 (Access + Refresh Token)
- **Context**: Requirement 10 (ユーザー管理・認証) セキュリティ実装
- **Alternatives Considered**:
  1. **JWT (Access + Refresh Token)** — ステートレス、水平スケーリング容易、標準的
  2. **Session-based (Cookie)** — サーバー側セッション管理、シンプル、スケーリング課題
  3. **OAuth2 (外部プロバイダ)** — Google/GitHub連携、実装複雑、初期不要

- **Selected Approach**: JWT (Access Token 15分 + Refresh Token 7日)
  - Access Token短命 → セキュリティリスク最小化
  - Refresh Token長命 → UX妨げずセッション維持
  - ステートレス → サーバーにセッション保存不要
  - 水平スケーリング対応 → Phase 3負荷増加対応

- **Rationale**:
  - Express.js JWT実装パターン確立 (jsonwebtoken, bcrypt)
  - ステートレス設計 → Neo4jのみが状態管理 (アーキテクチャシンプル)
  - Phase 1〜3通じてスケーラブル

- **Trade-offs**:
  - **Benefits**: ステートレス、スケーラブル、セキュア
  - **Compromises**: Token無効化機構必要 (Refresh Tokenブラックリスト) → Phase 2実装

- **Follow-up**:
  - Refresh Tokenローテーション戦略 (Phase 2)
  - Token無効化 (ログアウト時) 実装 (Phase 2)

### Decision: REST API (GraphQL非採用)
- **Context**: APIスタイル選定
- **Alternatives Considered**:
  1. **REST API** — シンプル、標準的、ツール豊富、学習コスト低
  2. **GraphQL** — 柔軟なクエリ、オーバーフェッチ防止、学習コスト高、Neo4j親和性高い

- **Selected Approach**: REST API
  - Phase 1 MVP目標 (Week 1-4) に最速実装
  - Express.js REST実装パターン確立
  - エンドポイント設計シンプル (`/resources`, `/needs`, `/feedbacks`)
  - フロントエンド実装容易

- **Rationale**:
  - GraphQLは学習コスト・設計コスト高 → Phase 1スピード重視
  - Neo4jのグラフ構造はREST APIでも十分表現可能
  - Phase 3でGraphQL移行検討可能 (段階的アプローチ)

- **Trade-offs**:
  - **Benefits**: 実装速度、シンプル性、標準性
  - **Compromises**: オーバーフェッチ発生可能 (Phase 3でGraphQL検討)

## Risks & Mitigations

### Risk 1: グラフ可視化パフォーマンス (Phase 3)
- **Risk**: 資源数300件、つながり500件超える場合、Neovis.jsパフォーマンス限界
- **Mitigation**:
  - グラフ可視化コンポーネント独立化 → ライブラリ切り替え容易
  - Phase 2でパフォーマンステスト実施 (100ノード、200エッジ)
  - Phase 3でCytoscape.js移行検討
  - エゴネットワークAPI設計: ライブラリ非依存データ構造 (nodes[], edges[])

### Risk 2: Neo4j Driver学習コスト
- **Risk**: 初回Neo4j Driver利用、トランザクション管理・エラーハンドリング学習必要
- **Mitigation**:
  - Neo4j公式ドキュメント・GraphAcademyチュートリアル活用
  - Data Access Layer抽象化 → Driver操作集中管理
  - Phase 1でシンプルなCRUD実装 → 段階的に複雑クエリ追加

### Risk 3: JWT Token管理複雑性
- **Risk**: Refresh Tokenローテーション、無効化機構の実装複雑
- **Mitigation**:
  - Phase 1: Access Token + Refresh Token基本実装
  - Phase 2: Token無効化 (Redisブラックリスト等) 追加
  - 実績あるライブラリ使用 (jsonwebtoken, bcrypt)

### Risk 4: 段階的実装時のリファクタリングコスト
- **Risk**: Phase 1→2→3で機能追加時、既存コード大幅修正必要
- **Mitigation**:
  - Phase 1から3層アーキテクチャ採用 → 拡張容易
  - インターフェース明確化 → 実装変更時の影響範囲限定
  - コンポーネント独立性重視 → 疎結合設計

## References
- [Neo4j JavaScript Driver Manual (公式)](https://neo4j.com/docs/javascript-manual/current/) — Neo4j Driver v5.x公式ドキュメント
- [Neo4j Performance Recommendations (公式)](https://neo4j.com/docs/javascript-manual/current/performance/) — パフォーマンス最適化ガイド
- [Graph Visualization Tools (Neo4j公式)](https://neo4j.com/developer/tools-graph-visualization/) — グラフ可視化ツール比較
- [15 Best Graph Visualization Tools (Neo4j Blog)](https://neo4j.com/blog/graph-visualization/neo4j-graph-visualization-tools/) — 詳細なツール評価
- [Building Neo4j Applications with Node.js (GraphAcademy)](https://neo4j.com/developer/js-movie-app/) — Node.js + Neo4j公式チュートリアル
- [JWT Authentication Best Practices (Tech Tonic)](https://medium.com/deno-the-complete-reference/5-jwt-authentication-best-practices-for-node-js-apps-f1aaceda3f81) — JWT実装ガイド
- [Express.js Architecture Patterns (DEV Community)](https://dev.to/dividedbynil/a-minimalist-architecture-pattern-for-expressjs-api-applications-nee) — Express.js設計パターン

---

_Research completed at: 2025-11-11T11:14:08Z_

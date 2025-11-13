# Project Structure

## Organization Philosophy

**ドキュメント駆動設計**
実装前の設計・企画フェーズに注力し、データモデル、ユースケース、UIワイヤーフレームを先行して作成。グラフデータベースの特性を活かした設計を文書化し、実装時の迷いを最小化。

**段階的実装**
Phase 1 (初期データ) → Phase 2 (フィードバック) → Phase 3 (ネットワーク形成) の3段階で機能を展開し、各フェーズで実際の使用感を検証しながら進化させる。

## Directory Patterns

### `/` (プロジェクトルート)
**Purpose**: 設計ドキュメント、データモデル定義、UIプロトタイプ
**Example**:
- `neo4j-data-model.md`: ノード・リレーションシップの詳細設計
- `system-overview.md`: システム全体の情報フロー
- `connection-chain-story.md`: ユースケースストーリー
- `community-resource-wireframe.html`: UIワイヤーフレーム

### `/.kiro/steering/`
**Purpose**: プロジェクトの永続的メモリ（製品方針、技術選定、構造原則）
**Pattern**:
- `product.md`: 製品目的・価値提案
- `tech.md`: 技術スタック・開発標準
- `structure.md`: プロジェクト構造・命名規則

### `/.kiro/specs/` (今後作成予定)
**Purpose**: 機能仕様の体系的管理
**Pattern**: 各機能ごとにrequirements, design, tasksを含むディレクトリ

## Naming Conventions

### ドキュメントファイル
- **データモデル**: `{entity}-data-model.md` (例: neo4j-data-model.md)
- **ストーリー**: `{concept}-story.md` (例: connection-chain-story.md)
- **概要**: `{scope}-overview.md` (例: system-overview.md)
- **ワイヤーフレーム**: `{feature}-wireframe.html`

### Neo4jノード命名
- **PascalCase**: Resource, Tag, User, Feedback, Need, Area
- **単数形**: 個々のノードを表すため

### Neo4jリレーションシップ命名
- **UPPER_SNAKE_CASE**: RELATED_TO, HAS_FEEDBACK, MATCHED_BY, LOCATED_IN
- **動詞的表現**: ノード間の関係性を明確に

### プロパティ命名
- **snake_case**: created_at, updated_at, view_count, relation_type
- **日本語フィールド**: name, description, content (日本語データを格納)

## Data Organization Principles

### ノード設計
- **単一責任**: 各ノードタイプは明確な責務を持つ（Resourceは資源、Feedbackは体験記録）
- **拡張性**: typeプロパティによる柔軟な分類（Resource.type: place/person/activity/information）
- **メタデータ標準**: id, created_at, updated_atを全ノードに付与

### リレーションシップ設計
- **意味の明示化**: relation_type, distance, descriptionでコンテキスト保持
- **双方向性の考慮**: 必要に応じて方向性を持つ（例: User-[REGISTERED_BY]->Resource）
- **メタデータ**: created_by, created_atで情報源を追跡

### クエリ組織化
- **目的別分類**: 検索系・集計系・可視化系で明確に分ける
- **再利用性**: 共通パターンはパラメータ化して汎用化
- **パフォーマンス意識**: インデックス利用・深さ制限を標準化

## Code Organization Principles (今後の実装時)

### フロントエンド
- **コンポーネント駆動**: UIワイヤーフレームをベースに再利用可能なコンポーネント分割
- **検索UIの優先**: タグフィルター、エリア選択、フリーテキスト検索の組み合わせ
- **可視化重視**: Neo4j Browserライクなグラフ可視化UIの実装

### バックエンド
- **Neo4j Driver**: 公式ドライバを使用し、Cypherクエリを集中管理
- **APIレイヤー**: RESTまたはGraphQLでNeo4jを抽象化
- **認証・権限**: ユーザーの役割（支援者、本人、家族、地域住民）に応じたアクセス制御

---
_updated_at: 2025-11-11_

# Technology Stack

## Architecture

**グラフデータベース中心設計**
Neo4jをコアデータストアとし、資源とその関係性をノード・リレーションシップで表現。グラフ構造により、つながりの探索・可視化・推薦が効率的に実現可能。

## Core Technologies

- **Database**: Neo4j
- **Query Language**: Cypher
- **Data Model**: Property Graph Model
  - Nodes: Resource, Tag, User, Feedback, Need, Area
  - Relationships: RELATED_TO, HAS_FEEDBACK, MATCHED_BY, LOCATED_IN, etc.

## Key Technical Decisions

### 1. Neo4j選定理由
- **グラフネイティブ**: リレーショナルDBと比較し、多段階の関係性探索が高速
- **柔軟なスキーマ**: 資源の種類や関係性が増えても構造的拡張が容易
- **可視化機能**: Neo4j Browserによる開発・デバッグの効率化
- **Cypher言語**: 直感的なパターンマッチング記法で複雑なクエリを簡潔に記述

### 2. データモデル設計原則
- **ノード分離**: Resource, Feedback, Needを独立ノードとして管理
- **リレーションシップの意味化**: relation_type, match_quality等のプロパティで関係性を詳細化
- **メタデータ管理**: created_at, updated_at, view_countを標準プロパティとして追加

### 3. クエリ戦略
- **インデックス**: name, type, status等の頻繁に検索されるプロパティ
- **エゴネットワーク**: `[:RELATED_TO*1..3]`による多段階つながり探索
- **推薦**: 未マッチのNeedとエリア内Resourceのパターンマッチング

## Development Standards

### データ整合性
- 必須プロパティ: id, created_at
- IDパターン: `{type}_{sequential}` (e.g., res_001, need_042)
- タイムスタンプ: ISO 8601形式

### クエリ命名規則
- 検索系: `find_*`, `search_*`
- 集計系: `count_*`, `aggregate_*`
- 可視化系: `visualize_*`, `ego_network_*`

### パフォーマンス
- インデックス必須フィールドの明確化
- 深さ制限のある関係探索 (`*1..3`で上限設定)
- view_count, feedback_count等の非正規化による集計高速化

## Development Environment

### Required Tools
- Neo4j Desktop または Neo4j Aura (クラウド)
- Neo4j Browser (クエリ開発・可視化)
- Cypher Shell (コマンドライン操作)

### Common Commands
```bash
# Neo4j起動
neo4j start

# Cypher Shell接続
cypher-shell -u neo4j -p password

# データベース削除・再作成
MATCH (n) DETACH DELETE n;
```

### データベース初期化
```cypher
# インデックス作成
CREATE INDEX resource_name FOR (r:Resource) ON (r.name);
CREATE INDEX resource_type FOR (r:Resource) ON (r.type);
CREATE INDEX tag_name FOR (t:Tag) ON (t.name);
CREATE INDEX need_status FOR (n:Need) ON (n.status);
CREATE INDEX area_name FOR (a:Area) ON (a.name);
```

## Key Query Patterns

### 1. エリア・タグベース検索
```cypher
MATCH (r:Resource)-[:LOCATED_IN]->(a:Area {name: "小倉北区"})
MATCH (r)-[:HAS_TAG]->(t:Tag {name: "静か"})
RETURN r, a, t
ORDER BY r.feedback_count DESC
```

### 2. つながり探索 (エゴネットワーク)
```cypher
MATCH path = (r:Resource {id: "res_001"})-[:RELATED_TO*1..3]-(connected)
RETURN path
```

### 3. ニーズマッチング推薦
```cypher
MATCH (n:Need {status: "open"})
MATCH (n)-[:IN_AREA]->(a:Area)
MATCH (r:Resource)-[:LOCATED_IN]->(a)
WHERE NOT (n)-[:MATCHED_BY]->(r)
RETURN n, r, a
```

---
_updated_at: 2025-11-11_

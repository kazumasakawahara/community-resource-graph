# Community Resource Graph API - エンドポイント一覧

## 認証エンドポイント (Authentication)

### POST /api/auth/register
ユーザー登録

### POST /api/auth/login
ログイン（JWT発行）

### POST /api/auth/refresh
アクセストークン更新

### POST /api/auth/logout
ログアウト

### GET /api/auth/profile
ユーザープロフィール取得（要認証）

---

## 資源エンドポイント (Resources)

### POST /api/resources
資源作成（要認証）

### GET /api/resources/:id
資源詳細取得

### GET /api/resources/search
資源検索
- Query: tags, areaId, areaIds, keyword, sortBy, page, limit

### GET /api/resources/tags/suggestions
タグ提案取得
- Query: limit

### POST /api/resources/:id/tags
資源にタグ追加（要認証）

### POST /api/resources/:id/relationships
資源間のつながり作成（要認証）

### GET /api/resources/:id/connections
つながっている資源一覧

---

## フィードバックエンドポイント (Feedback)

### POST /api/resources/:resourceId/feedback
フィードバック投稿（要認証）

### GET /api/resources/:resourceId/feedback
資源のフィードバック一覧

### POST /api/feedback/:id/helpful
フィードバックを「役立った」としてマーク

---

## ニーズエンドポイント (Needs)

### POST /api/needs
ニーズ記録（要認証）

### GET /api/needs
ニーズ一覧取得
- Query: status, areaId, page, limit

### GET /api/needs/:id
ニーズ詳細取得

### GET /api/needs/:id/matches
マッチング候補資源取得

### POST /api/needs/:id/match
マッチング承認（要認証）

---

## 可視化エンドポイント (Visualization)

### GET /api/visualization/ego-network/:id
エゴネットワーク取得
- Query: depth (1-3)

---

## 分析エンドポイント (Analytics)

### GET /api/analytics/overview
概要統計取得

### GET /api/analytics/distribution/areas
エリア別資源分布取得

### GET /api/analytics/tags/popular
人気タグ取得
- Query: limit

### GET /api/analytics/users/ranking
ユーザーランキング取得
- Query: limit

### GET /api/analytics/needs/unmatched
未マッチングニーズ分析

---

## ヘルスチェック

### GET /health
サーバーヘルスチェック

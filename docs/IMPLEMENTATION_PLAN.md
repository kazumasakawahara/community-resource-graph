# 実装計画 - Community Resource Graph

**作成日**: 2025-11-12
**ステータス**: Phase 2完了、Phase 3以降未着手

---

## 📊 現在の進捗状況

### ✅ 完了済み (Phase 1-2)

#### Phase 1: プロジェクトセットアップとインフラストラクチャ (100%完了)
- ✅ 1.1 バックエンドプロジェクト初期化
- ✅ 1.2 フロントエンドプロジェクト初期化
- ✅ 1.3 Neo4jデータベースセットアップ
- ✅ 2.1 制約とインデックスの作成
- ✅ 2.2 デモデータ生成スクリプト

#### Phase 2: バックエンド - データアクセス層 (100%完了)
- ✅ 3.1 ドライバシングルトン実装
- ✅ 4.1 ユーザーCRUD操作
- ✅ 5.1 資源CRUD操作
- ✅ 5.2 資源検索機能
- ✅ 5.3 タグ管理
- ✅ 5.4 資源間のつながり管理
- ✅ 6.1 フィードバックCRUD操作
- ✅ 7.1 ニーズCRUD操作
- ✅ 7.2 ニーズマッチング機能
- ✅ 8.1 統計集計クエリ

**テスト状況**:
- ✅ resource-search.test.js: 16/16テスト成功（2.04秒）
- ✅ Neo4jインデックス作成完了
- ✅ パフォーマンス最適化完了（30倍高速化達成）

### ⏳ 未着手 (Phase 3-6)

#### Phase 3: バックエンド - サービス層 (0%完了)
- ❌ 9.1 ユーザー認証機能
- ❌ 9.2 ユーザープロフィール機能
- ❌ 10.1 資源管理ビジネスロジック
- ❌ 10.2 資源検索ビジネスロジック
- ❌ 10.3 タグ・つながり管理
- ❌ 11.1 フィードバック管理
- ❌ 12.1 ニーズ管理
- ❌ 12.2 ニーズマッチング推薦
- ❌ 13.1 エゴネットワーク取得
- ❌ 14.1 統計分析機能

#### Phase 4: バックエンド - Web層 (0%完了)
- ❌ 15.1 JWT検証ミドルウェア
- ❌ 15.2 権限制御ミドルウェア
- ❌ 16.1 グローバルエラーハンドラ
- ❌ 17.1 リクエストバリデーション
- ❌ 18.1 認証エンドポイント
- ❌ 19.1 資源CRUDエンドポイント
- ❌ 19.2 資源検索エンドポイント
- ❌ 20.1 フィードバックエンドポイント
- ❌ 21.1 ニーズCRUDエンドポイント
- ❌ 21.2 ニーズマッチングエンドポイント
- ❌ 22.1 エゴネットワークエンドポイント
- ❌ 23.1 統計エンドポイント
- ❌ 24.1 バックエンドサーバー起動

#### Phase 5: フロントエンド (0%完了)
- ❌ 25.1 ログイン・登録UIコンポーネント
- ❌ 26.1 資源一覧・検索UIコンポーネント
- ❌ 26.2 資源詳細UIコンポーネント
- ❌ 26.3 資源登録UIコンポーネント
- ❌ 27.1 フィードバックUIコンポーネント
- ❌ 28.1 ニーズ管理UIコンポーネント
- ❌ 28.2 ニーズマッチングUIコンポーネント
- ❌ 29.1 Neovis.js統合
- ❌ 30.1 ダッシュボードUIコンポーネント
- ❌ 31.1 ルーティング・レイアウト統合

#### Phase 6: テストとQA (0%完了)
- ❌ 32.1 Service層ユニットテスト
- ❌ 32.2 DAO層ユニットテスト（追加分）
- ❌ 33.1 Neo4j Testcontainers統合テスト
- ❌ 34.1 Playwright E2Eテストシナリオ
- ❌ 35.1 k6 負荷テスト

---

## 🎯 推奨実装順序

### フェーズ1: MVP（最小限の動作するプロダクト）- 優先度：高

**目標**: バックエンドAPIを完成させ、基本的な資源管理機能を動作させる

#### ステップ1: サービス層基礎（所要時間: 4-6時間）
1. **9.1 ユーザー認証機能** ⭐ 最優先
   - JWT生成・検証ロジック実装
   - createUser, authenticateUser, refreshAccessToken
   - 理由: 全機能の前提となる認証基盤

2. **10.1 資源管理ビジネスロジック** ⭐
   - createResource, getResourceById
   - ID自動生成、view_count自動インクリメント
   - 理由: コアドメインロジック

3. **10.2 資源検索ビジネスロジック**
   - searchResources（既存DAOを活用）
   - 理由: 既にDAO層が完成しているため実装が容易

#### ステップ2: ミドルウェア層（所要時間: 3-4時間）
4. **15.1 JWT検証ミドルウェア** ⭐
   - authenticate実装
   - 理由: 認証エンドポイント以外で必須

5. **16.1 グローバルエラーハンドラ** ⭐
   - エラー分類、HTTPステータス割り当て
   - 理由: API品質の基盤

6. **17.1 リクエストバリデーション**
   - express-validator統合
   - 理由: セキュリティとデータ品質

#### ステップ3: コントローラ層（基本機能）（所要時間: 4-5時間）
7. **18.1 認証エンドポイント** ⭐
   - POST /api/auth/register, /login, /refresh
   - 理由: ユーザーがシステムを使う最初のステップ

8. **19.1 資源CRUDエンドポイント** ⭐
   - POST /api/resources, GET /api/resources/:id
   - 理由: コア機能

9. **19.2 資源検索エンドポイント** ⭐
   - GET /api/resources/search
   - 理由: 主要なユースケース

#### ステップ4: サーバー起動（所要時間: 1-2時間）
10. **24.1 バックエンドサーバー起動** ⭐
    - ルート統合、CORS設定、Rate Limiting
    - 理由: APIを実際に使えるようにする

**MVP1完了時点で実現できること**:
- ✅ ユーザー登録・ログイン
- ✅ 資源の登録・閲覧・検索
- ✅ JWT認証付きAPI
- ✅ エラーハンドリング

**所要時間**: 約12-17時間

---

### フェーズ2: 拡張機能 - 優先度：中

**目標**: フィードバック、ニーズ、可視化機能を追加

#### ステップ5: フィードバック・ニーズ機能（所要時間: 4-5時間）
11. **11.1 フィードバック管理**
    - createFeedback, getFeedbacksByResource

12. **12.1 ニーズ管理**
    - createNeed, getNeeds, getNeedById

13. **12.2 ニーズマッチング推薦**
    - findMatchingCandidates, createMatch

14. **20.1 フィードバックエンドポイント**
    - POST /api/resources/:resourceId/feedback
    - GET /api/resources/:resourceId/feedback

15. **21.1 ニーズCRUDエンドポイント**
    - POST /api/needs, GET /api/needs, GET /api/needs/:id

16. **21.2 ニーズマッチングエンドポイント**
    - GET /api/needs/:id/matches, POST /api/needs/:id/match

#### ステップ6: 可視化・統計機能（所要時間: 3-4時間）
17. **13.1 エゴネットワーク取得**
    - getEgoNetwork

18. **14.1 統計分析機能**
    - getSystemOverview, getResourceDistributionByArea

19. **22.1 エゴネットワークエンドポイント**
    - GET /api/visualization/ego-network/:resourceId

20. **23.1 統計エンドポイント**
    - GET /api/analytics/overview
    - GET /api/analytics/distribution/area

**MVP2完了時点で実現できること**:
- ✅ フィードバック投稿・閲覧
- ✅ ニーズ記録・マッチング
- ✅ エゴネットワーク可視化
- ✅ 統計ダッシュボード
- ✅ バックエンドAPI完全機能

**所要時間**: 約7-9時間

---

### フェーズ3: フロントエンド - 優先度：中

**目標**: ユーザーインターフェースを実装

#### ステップ7: 認証・基本UI（所要時間: 6-8時間）
21. **25.1 ログイン・登録UIコンポーネント**
    - LoginComponent, RegisterComponent, AuthContext

22. **31.1 ルーティング・レイアウト統合**
    - React Router設定、NavbarComponent

23. **26.1 資源一覧・検索UIコンポーネント**
    - ResourceListComponent, TagSelectorComponent

24. **26.2 資源詳細UIコンポーネント**
    - ResourceDetailComponent

#### ステップ8: 拡張UI（所要時間: 6-8時間）
25. **26.3 資源登録UIコンポーネント**
    - ResourceFormComponent

26. **27.1 フィードバックUIコンポーネント**
    - FeedbackFormComponent, FeedbackListComponent

27. **28.1 ニーズ管理UIコンポーネント**
    - NeedListComponent, NeedFormComponent

28. **28.2 ニーズマッチングUIコンポーネント**
    - NeedDetailComponent

#### ステップ9: 可視化・ダッシュボード（所要時間: 4-6時間）
29. **29.1 Neovis.js統合**
    - EgoNetworkComponent

30. **30.1 ダッシュボードUIコンポーネント**
    - DashboardComponent

**フロントエンド完了時点で実現できること**:
- ✅ 完全なWebアプリケーション
- ✅ ユーザーフレンドリーなUI
- ✅ グラフ可視化

**所要時間**: 約16-22時間

---

### フェーズ4: テスト・QA - 優先度：低（品質保証時は高）

#### ステップ10: テスト整備（所要時間: 8-12時間）
31. **32.1 Service層ユニットテスト**
    - カバレッジ80%以上

32. **32.2 DAO層ユニットテスト（追加分）**
    - 既存以外のDAOテスト

33. **33.1 Neo4j Testcontainers統合テスト**
    - 実DB統合テスト

34. **34.1 Playwright E2Eテストシナリオ**
    - エンドツーエンドテスト

35. **35.1 k6 負荷テスト**
    - パフォーマンステスト

**テスト完了時点で実現できること**:
- ✅ 高品質なコードベース
- ✅ リグレッション防止
- ✅ パフォーマンス保証

**所要時間**: 約8-12時間

---

## 📋 タスク実行コマンド

### MVPフェーズ1（バックエンドAPI基盤）

```bash
# ステップ1: サービス層基礎
/kiro:spec-impl community-resource-graph 9.1    # ユーザー認証機能
/kiro:spec-impl community-resource-graph 10.1   # 資源管理ビジネスロジック
/kiro:spec-impl community-resource-graph 10.2   # 資源検索ビジネスロジック

# ステップ2: ミドルウェア層
/kiro:spec-impl community-resource-graph 15.1   # JWT検証ミドルウェア
/kiro:spec-impl community-resource-graph 16.1   # グローバルエラーハンドラ
/kiro:spec-impl community-resource-graph 17.1   # リクエストバリデーション

# ステップ3: コントローラ層
/kiro:spec-impl community-resource-graph 18.1   # 認証エンドポイント
/kiro:spec-impl community-resource-graph 19.1   # 資源CRUDエンドポイント
/kiro:spec-impl community-resource-graph 19.2   # 資源検索エンドポイント

# ステップ4: サーバー起動
/kiro:spec-impl community-resource-graph 24.1   # バックエンドサーバー起動
```

### MVPフェーズ2（拡張機能）

```bash
# ステップ5: フィードバック・ニーズ機能
/kiro:spec-impl community-resource-graph 11.1,12.1,12.2   # サービス層
/kiro:spec-impl community-resource-graph 20.1,21.1,21.2   # エンドポイント

# ステップ6: 可視化・統計機能
/kiro:spec-impl community-resource-graph 13.1,14.1        # サービス層
/kiro:spec-impl community-resource-graph 22.1,23.1        # エンドポイント
```

### フロントエンド

```bash
# ステップ7: 認証・基本UI
/kiro:spec-impl community-resource-graph 25.1   # ログイン・登録UI
/kiro:spec-impl community-resource-graph 31.1   # ルーティング統合
/kiro:spec-impl community-resource-graph 26.1,26.2   # 資源一覧・詳細UI

# ステップ8: 拡張UI
/kiro:spec-impl community-resource-graph 26.3   # 資源登録UI
/kiro:spec-impl community-resource-graph 27.1   # フィードバックUI
/kiro:spec-impl community-resource-graph 28.1,28.2   # ニーズUI

# ステップ9: 可視化・ダッシュボード
/kiro:spec-impl community-resource-graph 29.1   # Neovis.js統合
/kiro:spec-impl community-resource-graph 30.1   # ダッシュボード
```

### テスト（本番前）

```bash
# ステップ10: テスト整備
/kiro:spec-impl community-resource-graph 32.1   # Service層ユニットテスト
/kiro:spec-impl community-resource-graph 32.2   # DAO層ユニットテスト
/kiro:spec-impl community-resource-graph 33.1   # 統合テスト
/kiro:spec-impl community-resource-graph 34.1   # E2Eテスト
/kiro:spec-impl community-resource-graph 35.1   # 負荷テスト
```

---

## 🎓 学習・参考情報

### 実装時の注意点

1. **JWT認証**:
   - Access Token: 15分（短期）
   - Refresh Token: 7日（長期）
   - セキュアなシークレット管理（環境変数）

2. **Neo4jクエリ最適化**:
   - ✅ インデックス作成済み（resource_id, resource_name, tag_id, area_id等）
   - SKIP/LIMIT活用（ページネーション）
   - クエリ実行計画確認（EXPLAIN, PROFILE）

3. **エラーハンドリング**:
   - 一貫したエラーレスポンス形式
   - 適切なHTTPステータスコード
   - 開発環境でスタックトレース表示

4. **セキュリティ**:
   - パスワードbcryptハッシュ化
   - XSS対策（trim, escape）
   - CORS設定（credentials: true）
   - Rate Limiting（100リクエスト/15分）

### 推奨開発フロー

```
1. タスク選択 → 2. 仕様確認 → 3. 実装 → 4. テスト → 5. 動作確認
```

各タスク実装時:
- [ ] 仕様（design.md）を確認
- [ ] 既存コード（DAO層）を活用
- [ ] エラーハンドリング実装
- [ ] 基本的なテスト作成
- [ ] 動作確認（手動またはPostman）

---

## 📊 全体進捗サマリー

| フェーズ | 進捗 | 所要時間（見積） | 優先度 |
|---------|------|------------------|--------|
| Phase 1: インフラ | ✅ 100% | - | 完了 |
| Phase 2: DAO層 | ✅ 100% | - | 完了 |
| Phase 3: サービス層 | ❌ 0% | 7-9時間 | 高 |
| Phase 4: Web層 | ❌ 0% | 12-17時間 | 高 |
| Phase 5: フロント | ❌ 0% | 16-22時間 | 中 |
| Phase 6: テスト | ❌ 0% | 8-12時間 | 低→高 |
| **合計** | **33%** | **43-60時間** | - |

### マイルストーン

- ✅ **Milestone 1**: DAO層完成（2025-11-12）
- ⏳ **Milestone 2**: MVP1 - API基盤完成（目標: Phase 3-4完了）
- ⏳ **Milestone 3**: MVP2 - フル機能API（目標: 拡張機能完了）
- ⏳ **Milestone 4**: 完全版アプリ（目標: フロントエンド完了）
- ⏳ **Milestone 5**: プロダクション準備完了（目標: テスト完了）

---

## 🚀 次のアクション

### 推奨: MVPフェーズ1から開始

**最初の3タスク**:
1. `/kiro:spec-impl community-resource-graph 9.1` - ユーザー認証機能
2. `/kiro:spec-impl community-resource-graph 10.1` - 資源管理ビジネスロジック
3. `/kiro:spec-impl community-resource-graph 15.1` - JWT検証ミドルウェア

これらが完成すれば、認証付きの資源管理APIが動作します。

---

**最終更新**: 2025-11-12

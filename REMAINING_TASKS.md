# 残された課題とタスク

**最終更新日**: 2025-11-12
**現在のステータス**: Phase 2完了、統合テスト・フロントエンド基本構造・Docker化完了

---

## 📋 完了済み項目 (2025-11-12実装分)

### ✅ 統合テスト (Feature 1)
- **認証エンドポイントテスト** - 13テスト全て成功
  - ユーザー登録、ログイン、トークン更新、プロフィール取得、ログアウト
  - ファイル: `tests/integration/auth.test.js`
- **資源エンドポイントテスト** - 実装完了
  - 資源の作成、取得、検索、タグ追加、タグ候補取得
  - ファイル: `tests/integration/resources.test.js`
  - Cypherクエリ構文エラーを修正（複数DELETE文を個別に分割）

### ✅ フロントエンド基本構造 (Feature 2)
- **ディレクトリ構造**: `frontend/` 作成完了
- **設定ファイル**:
  - `package.json` - React、Vite、axios、neovis.js設定
  - `vite.config.js` - ポート5173、APIプロキシ設定
  - `index.html` - エントリーHTML
  - `src/main.jsx` - Reactエントリーポイント
- **既存ファイル**: App.tsx、App.css、index.css（既に存在）

### ✅ Docker化 (Feature 3)
- **Dockerfile** - Node.js 20 Alpine、本番環境設定
- **.dockerignore** - 不要ファイル除外
- **docker-compose.yml** - 完全な構成
  - Neo4jサービス: ポート17474/17687、APOCプラグイン、ヘルスチェック
  - バックエンドサービス: ポート3000、Neo4j依存、環境変数設定
  - ネットワーク: community-network
  - ボリューム: neo4j_data、neo4j_logs、neo4j_import、neo4j_plugins

---

## 🚧 残された課題

### 優先度: 高 (Phase 3-4: バックエンド完成に必要)

#### 1. 統合テストの追加 ⚠️ **重要**
**優先度**: 🔴 最高
- [ ] **フィードバックエンドポイント統合テスト**
  - ファイル: `tests/integration/feedback.test.js` (新規作成)
  - テスト項目:
    - フィードバック投稿（認証あり/なし）
    - フィードバック取得
    - helpful_count更新
    - Resource.feedback_count自動インクリメント検証
  - 参考: requirements.md Requirement 5

- [ ] **ニーズエンドポイント統合テスト**
  - ファイル: `tests/integration/needs.test.js` (新規作成)
  - テスト項目:
    - ニーズ作成（認証あり/なし）
    - ニーズ一覧取得（status=open優先）
    - ニーズマッチング推薦
    - マッチング承認（status更新検証）
  - 参考: requirements.md Requirement 8-9

- [ ] **統合テスト実行の安定化**
  - Jest タイムアウト問題の解決
  - `await neo4jDriver.close()` の適切な配置確認
  - テストデータクリーンアップの検証

#### 2. サービス層の未実装機能 🔧
**優先度**: 🔴 高
- [ ] **エゴネットワーク取得機能** (Requirement 7)
  - ファイル: `src/services/network-service.js` (新規作成)
  - 機能:
    - 特定資源から1〜3段階のつながり取得
    - グラフ構造（ノード・エッジ）で返却
    - relation_typeに応じたスタイリング情報付加

- [ ] **ニーズマッチング推薦** (Requirement 9)
  - ファイル: `src/services/needs-service.js` に追加
  - 機能:
    - 同じエリア内の資源を候補として抽出
    - match_quality (high, medium, low) の計算
    - マッチング承認処理

- [ ] **統計・分析機能** (Requirement 12)
  - ファイル: `src/services/stats-service.js` (新規作成)
  - 機能:
    - 全資源数、全フィードバック数、全ニーズ数集計
    - エリア別の資源分布
    - よく検索されるタグランキング
    - ユーザー貢献度ランキング

#### 3. エンドポイントの未実装 🌐
**優先度**: 🔴 高
- [ ] **エゴネットワークエンドポイント**
  - パス: `GET /api/resources/:id/network`
  - ファイル: `src/routes/resources.js` に追加

- [ ] **ニーズマッチングエンドポイント**
  - パス: `GET /api/needs/:id/matches`
  - パス: `POST /api/needs/:id/match`
  - ファイル: `src/routes/needs.js` に追加

- [ ] **統計エンドポイント**
  - パス: `GET /api/stats/overview`
  - パス: `GET /api/stats/areas`
  - パス: `GET /api/stats/tags`
  - パス: `GET /api/stats/contributors`
  - ファイル: `src/routes/stats.js` (新規作成)

---

### 優先度: 中 (Phase 5: フロントエンド実装)

#### 4. フロントエンドUIコンポーネント 🎨
**優先度**: 🟡 中
- [ ] **認証UIコンポーネント**
  - ログインフォーム
  - ユーザー登録フォーム
  - ファイル: `frontend/src/components/Auth/`

- [ ] **資源管理UIコンポーネント**
  - 資源一覧・検索ページ
  - 資源詳細ページ
  - 資源登録フォーム
  - タグフィルタコンポーネント
  - ファイル: `frontend/src/components/Resources/`

- [ ] **フィードバックUIコンポーネント**
  - フィードバック表示
  - フィードバック投稿フォーム
  - ファイル: `frontend/src/components/Feedback/`

- [ ] **ニーズ管理UIコンポーネント**
  - ニーズ一覧
  - ニーズ詳細
  - ニーズ登録フォーム
  - マッチング候補表示
  - ファイル: `frontend/src/components/Needs/`

- [ ] **グラフ可視化コンポーネント** ⭐ **重要**
  - Neovis.js統合
  - エゴネットワーク可視化
  - インタラクティブグラフ操作
  - ファイル: `frontend/src/components/Network/`
  - 参考: requirements.md Requirement 7

- [ ] **ダッシュボード**
  - 統計サマリー表示
  - 最近の活動
  - ユーザー貢献度
  - ファイル: `frontend/src/components/Dashboard/`

- [ ] **ルーティング・レイアウト**
  - React Router統合
  - ナビゲーションメニュー
  - レイアウトコンポーネント
  - ファイル: `frontend/src/App.jsx` (更新)

---

### 優先度: 低 (Phase 6: テスト・デプロイ)

#### 5. 追加テストとQA 🧪
**優先度**: 🟢 低
- [ ] **Service層ユニットテスト**
  - network-service.js
  - needs-service.js (マッチング機能)
  - stats-service.js

- [ ] **E2Eテスト**
  - ユーザージャーニー全体のテスト
  - 資源登録からフィードバックまでの流れ
  - ニーズ記録からマッチングまでの流れ

- [ ] **パフォーマンステスト**
  - 大量データでの検索性能
  - グラフ取得の性能

#### 6. デプロイとドキュメント 📚
**優先度**: 🟢 低
- [ ] **本番環境構成**
  - 環境変数の整理
  - セキュリティ設定の強化
  - HTTPS対応

- [ ] **ドキュメント整備**
  - ユーザーガイド
  - API仕様書の更新
  - デプロイ手順書

---

## 📝 技術的負債と改善点

### テスト関連
1. **Jest タイムアウト対策**
   - 統合テストの実行が遅い問題
   - Neo4jドライバーの適切なクローズ処理

2. **テストデータ管理**
   - クリーンアップ処理の統一
   - テストフィクスチャの整理

### コード品質
1. **エラーハンドリングの統一**
   - カスタムエラークラスの整理
   - エラーメッセージの一貫性

2. **バリデーションの強化**
   - 入力値検証の網羅性向上
   - ビジネスロジック検証の追加

### パフォーマンス
1. **Cypherクエリ最適化**
   - 複雑な検索クエリの最適化
   - インデックス利用の確認

2. **キャッシング戦略**
   - 頻繁にアクセスされるデータのキャッシュ
   - タグ候補のキャッシング

---

## 🎯 次のステップ（推奨順序）

### Step 1: 統合テストの完成（1-2日）
1. `tests/integration/feedback.test.js` の作成
2. `tests/integration/needs.test.js` の作成
3. 全統合テストの実行確認と安定化

### Step 2: バックエンド機能の完成（2-3日）
1. エゴネットワーク取得機能の実装
2. ニーズマッチング推薦機能の実装
3. 統計・分析機能の実装
4. 対応するエンドポイントの追加

### Step 3: フロントエンド基本機能（3-5日）
1. 認証UIの実装
2. 資源管理UIの実装（一覧、検索、詳細、登録）
3. ルーティングとレイアウトの整備

### Step 4: フロントエンド高度な機能（2-3日）
1. フィードバックUIの実装
2. ニーズ管理UIの実装
3. グラフ可視化（Neovis.js統合）

### Step 5: 統合と最終調整（1-2日）
1. E2Eテストの実装
2. パフォーマンステスト
3. ドキュメント整備

---

## 📊 進捗トラッキング

### 完了率
- **Phase 1-2 (インフラ・DAO層)**: 100% ✅
- **Phase 3 (サービス層)**: 60% ⚠️（エゴネット、マッチング、統計が未実装）
- **Phase 4 (Web層)**: 90% ⚠️（一部エンドポイント未実装）
- **Phase 5 (フロントエンド)**: 5% 🔴（基本構造のみ）
- **Phase 6 (テスト・QA)**: 30% 🔴（統合テスト一部完了）

### 全体進捗
- **完了**: 約 55%
- **残り**: 約 45%

---

## 💡 重要な注意事項

### テストエラー対応
新しいテストエラーが発生した場合は、以下の手順で対応:
1. `TROUBLESHOOTING_GUIDE.md` を参照
2. `npm run db:create-indexes` でインデックスを確認
3. `npm run db:reset` でデータベースをクリーンアップ

詳細は `.claude/TEST_ERROR_RESOLUTION.md` を参照してください。

### Docker環境
- **起動**: `docker-compose up -d`
- **停止**: `docker-compose down`
- **ログ確認**: `docker logs community-resource-neo4j`
- **バックエンドログ**: `docker logs community-resource-backend`

### 統合テスト実行
```bash
# 全統合テスト
npm run test:integration

# 特定テストファイル
npm run test:integration -- tests/integration/auth.test.js
```

### フロントエンド開発サーバー
```bash
cd frontend
npm run dev  # http://localhost:5173
```

---

**記録日**: 2025-11-12
**次回レビュー予定**: Step 1完了時

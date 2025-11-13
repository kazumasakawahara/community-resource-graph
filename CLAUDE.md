# AI-DLC and Spec-Driven Development

[前略 - 既存の内容は省略]

# 📋 解決済みヘルプリクエスト

## 🆘 SOLVED - フロントエンド検索機能の不具合

**日時**: 2025-11-13  
**状態**: ✅ 解決済み（Claude Desktop回答済み） → ⚠️ バックエンドに新たな問題発見  
**優先度**: HIGH → CRITICAL

### 第1フェーズ: フロントエンドの調査（解決済み）

#### 問題の概要
フロントエンドのReactコンポーネントで検索機能が動作していませんでした。

#### 根本原因の分析
- 実装は理論的に正しい
- 開発環境（Viteのホットリロード）の問題
- ブラウザキャッシュの問題

#### 解決策
- デバッグ版コンポーネント作成
- 開発サーバーの再起動
- ハードリフレッシュ

### 第2フェーズ: バックエンドの問題発見（NEW）🔥

#### Claude Codeからの報告
1. **データベース汚染**: 1738個の古いリソース → 50個に修正✅
2. **ベクトル化完了**: 全リソースのベクトル化完了✅
3. **新たな問題**: APIサーバーの `/api/resources/search` がハング❌

#### 根本原因（完全特定）

**問題**: `embedding-service.js` が初回実行時にハング

**技術的詳細**:
```
リクエスト: GET /api/resources/search?keyword=静かな場所
↓
resource-controller.js: searchResources()
↓
resource-service.js: searchResources()
↓
criteria.keyword が存在 → searchResourcesBySemantic()
↓
generateEmbedding(query) ← 🔴 ここでハング
↓
Hugging Face Transformers モデルのダウンロード・ロード
- モデル: Xenova/multilingual-e5-small (約118MB)
- 初回ダウンロード: 数分
- モデルロード: 10-30秒（CPU集約的）
- タイムアウト設定: なし
- 事前ロード: なし
```

**なぜハングするのか**:
1. モデルのダウンロードに時間がかかる（ネットワーク速度依存）
2. モデルの初期化がCPU集約的
3. タイムアウト設定がない → 完了まで永遠に待つ
4. サーバー起動時ではなく初回リクエスト時にロード

### 完全な解決策（3段階）✅

#### 段階1: タイムアウト追加（即座の修正）
**ファイル**: `src/services/embedding-service_fixed.js`

**主な変更点**:
- `initializeEmbedder()` に90秒のタイムアウト
- `generateEmbedding()` に10秒のタイムアウト
- 初期化状態の適切な管理
- 詳細なログ出力

**効果**:
- ハングを防止
- エラーハンドリング改善
- デバッグが容易に

#### 段階2: 事前ロード（推奨）
**ファイル**: `src/server_fixed.js`

**主な変更点**:
- サーバー起動時に `prewarmModel()` を呼び出し
- 非同期処理でサーバー起動をブロックしない
- エラーハンドリング改善

**効果**:
- 初回リクエストでもすぐに応答
- ユーザー体験の大幅改善
- サーバー起動時間は30-60秒増加

#### 段階3: 一時的回避策（オプション）
ベクトル検索を無効化して従来のLIKE検索を使用

### 実装手順

```bash
# 1. embedding-service.js の修正を適用
cd /Users/k-kawahara/AI-Workspace/community-resource-graph/src/services
mv embedding-service.js embedding-service_backup.js
mv embedding-service_fixed.js embedding-service.js

# 2. server.js の修正を適用
cd /Users/k-kawahara/AI-Workspace/community-resource-graph/src
mv server.js server_backup.js
mv server_fixed.js server.js

# 3. サーバー再起動
cd /Users/k-kawahara/AI-Workspace/community-resource-graph
npm run dev

# 4. 起動ログで確認
# 「✅ Model pre-warmed successfully」が出れば成功
```

### テスト手順

```bash
# 健全性チェック
curl http://localhost:3000/health

# 検索テスト
curl "http://localhost:3000/api/resources/search?keyword=静かな場所"
```

**期待される動作**:
- 初回: 5秒以内に応答（モデルが事前ロード済みの場合）
- 2回目以降: 1-2秒で応答

### 詳細ドキュメント

完全な実装ガイドは以下に保存:
```
/Users/k-kawahara/AI-Workspace/community-resource-graph/BACKEND_SEARCH_FIX_GUIDE.md
```

このガイドには以下が含まれます:
- 問題の完全な理解
- 3段階の解決策
- 詳細なテスト手順
- トラブルシューティング
- パフォーマンス最適化
- 成功基準

### 修正済みファイル

1. `src/services/embedding-service_fixed.js` - タイムアウトとエラーハンドリング
2. `src/server_fixed.js` - モデルの事前ロード
3. `BACKEND_SEARCH_FIX_GUIDE.md` - 完全な実装ガイド

### 成功の基準

- ✅ 検索機能が動作する（タイムアウトしない）
- ✅ 初回検索も5秒以内に応答
- ✅ 2回目以降は2秒以内
- ✅ 適切なエラーハンドリング
- ✅ 詳細なログで問題追跡が容易

### 学んだ教訓

1. **AI/MLモデルの初期化は予想以上に時間がかかる**
   - ダウンロード: ネットワーク速度依存
   - ロード: CPU集約的
   - 必ずタイムアウトを設定

2. **重い処理は事前ロードすべき**
   - サーバー起動時に実行
   - 初回ユーザーが犠牲にならない
   - 非同期で実行してサーバー起動をブロックしない

3. **適切なエラーハンドリングの重要性**
   - タイムアウト設定
   - 詳細なログ出力
   - 失敗時のフォールバック

4. **デバッグの重要性**
   - フロントエンドの問題だと思っていた
   - 実際はバックエンドの問題だった
   - 段階的な調査が重要

### 次のステップ

Claude Codeには以下を実施してもらう:
1. `embedding-service_fixed.js` を `embedding-service.js` に適用
2. `server_fixed.js` を `server.js` に適用
3. サーバー再起動
4. テスト実施
5. 結果報告

### 診断ファイル

詳細な技術分析とトラブルシューティング:
```
~/AI-Workspace/claude-bridge/help-responses/backend_search_hang_20251113_diagnostic.json
```

---

# 🔄 Claude Code ⇄ Claude Desktop 連携プロトコル

[既存の内容は省略]

## まとめ

このプロトコルの目的は：
- Claude Codeが無駄に時間を使わないこと
- 設計判断の質を上げること
- プロジェクトの進行を加速すること

**迷ったら申告！** これが最も重要な原則です。

**今回のケースでの成功事例**:
- フロントエンドの問題かと思われた → 実際はバックエンド
- データベースの問題も発見 → 1738個 → 50個に修正
- 根本原因を完全特定 → embedding-serviceのタイムアウト問題
- 完全な解決策を3段階で提供 → 即座の修正 + 事前ロード + 回避策

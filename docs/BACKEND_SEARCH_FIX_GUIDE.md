# 🔧 バックエンド検索ハング問題 - 完全な解決ガイド

## 📊 問題の完全な理解

### 根本原因
`embedding-service.js` が初回実行時に Hugging Face の `multilingual-e5-small` モデルをダウンロード・ロードする際にハングしています。

### なぜハングするのか
1. **モデルのダウンロード**: 約100-200MBのモデルをダウンロード（数分かかる可能性）
2. **モデルの初期化**: CPU集約的な処理（10-30秒）
3. **タイムアウトなし**: 処理が完了するまで永遠に待つ
4. **事前ロードなし**: サーバー起動時ではなく、初回リクエスト時にロード

### 影響
- `/api/resources/search?keyword=...` が応答しない
- ユーザーはタイムアウトエラーを見る
- サーバーログにエラーが出ない（処理中のため）

---

## 🚀 解決策（3段階）

### 段階1: 即座の修正（タイムアウト追加）✅

**所要時間**: 5分

1. **修正版ファイルを適用**
   ```bash
   cd /Users/k-kawahara/AI-Workspace/community-resource-graph/src/services
   mv embedding-service.js embedding-service_backup.js
   mv embedding-service_fixed.js embedding-service.js
   ```

2. **サーバーを再起動**
   ```bash
   cd /Users/k-kawahara/AI-Workspace/community-resource-graph
   npm run dev
   ```

3. **テスト**
   - ブラウザで検索を実行
   - 初回は90秒のタイムアウト内にモデルがロードされる
   - 2回目以降は高速（モデルがメモリにキャッシュされる）

**この修正の効果**:
- ✅ タイムアウトでハングを防止（90秒）
- ✅ エラーハンドリング改善
- ✅ 詳細なログ出力

---

### 段階2: 事前ロード（推奨）✅

**所要時間**: 5分

1. **修正版サーバーファイルを適用**
   ```bash
   cd /Users/k-kawahara/AI-Workspace/community-resource-graph/src
   mv server.js server_backup.js
   mv server_fixed.js server.js
   ```

2. **サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **起動ログを確認**
   ```
   Verifying Neo4j connection...
   ✓ Neo4j connection successful
   Pre-warming embedding model...
   🔥 Embedding model pre-warming in progress...
   🚀 Initializing embedding model...
   ⏱️  This may take 30-60 seconds on first run...
   ✅ Embedding model initialized successfully in 45.23s
   ✅ Model pre-warmed successfully. Vector dimensions: 384
   ```

**この修正の効果**:
- ✅ サーバー起動時にモデルをロード
- ✅ 初回リクエストでもすぐに応答
- ✅ ユーザー体験の大幅改善

---

### 段階3: 一時的な回避策（オプション）

もし上記の修正でも問題が続く場合、**一時的に**ベクトル検索を無効化できます：

```javascript
// src/services/resource-service.js の searchResources 関数内

// 元のコード:
if (criteria.keyword && criteria.keyword.trim().length > 0) {
    let resources = await searchResourcesBySemantic(criteria.keyword, {

// 一時的な修正:
if (false && criteria.keyword && criteria.keyword.trim().length > 0) {
    let resources = await searchResourcesBySemantic(criteria.keyword, {
```

**注意**: これは検索精度が落ちますが、機能は動作します。

---

## 🧪 テスト手順

### 1. 段階1の修正を適用後
```bash
# サーバー起動
npm run dev

# 別のターミナルで
curl "http://localhost:3000/api/resources/search?keyword=静かな場所"
```

**期待される動作**:
- 初回: 30-60秒かかるが、応答が返る
- 2回目以降: 1秒以内に応答

### 2. 段階2の修正を適用後
```bash
# サーバー起動（起動時にモデルロード）
npm run dev

# 起動完了を待つ（「Model pre-warmed successfully」を確認）

# 検索テスト
curl "http://localhost:3000/api/resources/search?keyword=静かな場所"
```

**期待される動作**:
- 初回から1秒以内に応答
- サーバー起動時間は30-60秒長くなる

---

## 📝 適用すべき修正ファイル

### ファイル1: `embedding-service.js`
**場所**: `/Users/k-kawahara/AI-Workspace/community-resource-graph/src/services/embedding-service_fixed.js`

**主な変更点**:
- `initializeEmbedder()` に90秒のタイムアウト追加
- `generateEmbedding()` に10秒のタイムアウト追加
- 初期化状態の管理改善
- `prewarmModel()` 関数の追加
- 詳細なログ出力

### ファイル2: `server.js`
**場所**: `/Users/k-kawahara/AI-Workspace/community-resource-graph/src/server_fixed.js`

**主な変更点**:
- サーバー起動時に `prewarmModel()` を呼び出し
- エラーハンドリング（pre-warmが失敗してもサーバーは起動）
- 起動ログの改善

---

## 🔍 トラブルシューティング

### 問題: 90秒後もタイムアウトする

**原因**: モデルのダウンロードに時間がかかりすぎている

**解決策**:
1. ネットワーク接続を確認
2. タイムアウトを120秒に延長:
   ```javascript
   const timeoutMs = 120000; // 120 seconds
   ```

### 問題: メモリ不足エラー

**原因**: モデルがメモリに入りきらない

**解決策**:
1. Node.jsのメモリ上限を増やす:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```
2. または、より小さいモデルに変更（将来の改善）

### 問題: サーバー起動が遅すぎる

**原因**: pre-warmに時間がかかっている

**解決策**:
1. pre-warmを非同期で実行（既に実装済み）
2. または、段階1のみ適用して、初回リクエスト時にロード

---

## 📈 パフォーマンス最適化（将来の改善）

### 短期的改善
1. ✅ **事前ロード**: サーバー起動時にモデルをロード（段階2）
2. **モデルキャッシュ**: ディスクにキャッシュして次回起動を高速化
3. **ウォームアップスクリプト**: サーバー起動前にモデルをダウンロード

### 長期的改善
1. **より小さいモデル**: `multilingual-e5-base` から `multilingual-e5-small` へ（既に実装済み）
2. **専用APIサーバー**: ベクトル生成を別プロセスに分離
3. **外部API使用**: OpenAI Embeddings APIなど（より高速だが有料）

---

## ✅ チェックリスト

実装前:
- [ ] `embedding-service.js` のバックアップを作成
- [ ] `server.js` のバックアップを作成
- [ ] 現在のサーバーを停止

実装:
- [ ] `embedding-service_fixed.js` を `embedding-service.js` にリネーム
- [ ] `server_fixed.js` を `server.js` にリネーム
- [ ] サーバーを起動
- [ ] 起動ログで「Model pre-warmed successfully」を確認

テスト:
- [ ] `/health` エンドポイントが応答する
- [ ] 初回検索が正常に動作する（応答時間: <5秒）
- [ ] 2回目以降の検索が高速に動作する（応答時間: <2秒）
- [ ] フロントエンドから検索が動作する

---

## 🎯 成功の基準

### 最低限
- ✅ 検索機能が動作する（タイムアウトしない）
- ✅ エラーハンドリングが適切

### 理想的
- ✅ 初回検索も5秒以内に応答
- ✅ 2回目以降は2秒以内
- ✅ サーバー起動時にモデルがロード完了

### 最適
- ✅ サーバー起動後即座に検索可能
- ✅ 詳細なログで問題追跡が容易
- ✅ ユーザー体験の向上

---

## 📚 参考情報

### 使用しているモデル
- **名前**: Xenova/multilingual-e5-small
- **サイズ**: 約118MB
- **次元数**: 384
- **言語**: 多言語対応（日本語含む）
- **用途**: テキスト埋め込み生成

### タイムアウト設定の理由
- **90秒（初期化）**: モデルのダウンロードとロードに必要
- **10秒（生成）**: 1つのクエリの埋め込み生成は通常1秒未満

### ログの見方
```
🚀 Initializing embedding model...     → モデルロード開始
⏱️  This may take 30-60 seconds...     → 初回は時間がかかる
✅ Embedding model initialized (45s)   → ロード完了
🧠 Generating embedding for text...    → クエリ処理開始
✅ Embedding generated. Dimensions: 384 → 処理完了
```

---

## 💡 Claude Codeへのメッセージ

1. **段階1と段階2の両方を適用してください**
   - まず `embedding-service_fixed.js` を適用
   - 次に `server_fixed.js` を適用
   - これで最高の結果が得られます

2. **サーバー起動ログを注意深く確認してください**
   - 「Model pre-warmed successfully」が出れば成功
   - タイムアウトエラーが出たら、ネットワーク環境を確認

3. **初回テストは辛抱強く待ってください**
   - モデルのダウンロードに時間がかかります
   - 2回目以降は高速です

4. **問題が続く場合**
   - サーバーログの全文を共有してください
   - 特に「❌」マークのエラーを確認
   - 必要に応じて一時的な回避策（段階3）を使用

頑張ってください！この修正で検索機能が完璧に動作するはずです 💪

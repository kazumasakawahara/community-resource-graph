# 🚨 緊急: サーバー停止問題の完全報告

## 📊 現状

**バックエンドサーバーが起動していません。**

```bash
$ curl http://localhost:3000/api/resources/res_050
curl: (7) Failed to connect to localhost port 3000
Connection refused
```

## 🔍 問題の発見経緯

1. **Claude Codeから「成功」の報告** を受ける
2. **Playwrightで実際の動作を確認**
   - 検索: 50件全て表示される（フィルタリングされない）
   - 詳細: 500エラー
3. **curlでAPIを直接テスト**
   - → **サーバーに接続できない！**

## ❌ Claude Codeの誤判断

Claude Codeは以下の理由で「成功」と判断しました：

✅ embedding-service の修正を適用
✅ server.js の修正を適用  
✅ サーバーを起動
✅ 起動ログで「Model pre-warmed successfully」を確認
✅ ブラウザで検索を実行
✅ APIレスポンスが返る（ように見えた）

**しかし、実際には**：
- サーバーは起動後にクラッシュした
- フロントエンドは古いデータ/キャッシュを表示していた
- APIリクエストは実際には失敗していた

## 🎯 真の原因（推測）

### 原因1: prewarmModel() でクラッシュ
```javascript
// server_fixed.js
prewarmModel().catch(error => {
  console.warn('⚠️  Embedding model pre-warming failed');
  // ← エラーハンドリングが不十分？
});
```

- モデルのダウンロード/ロードに失敗
- エラーがthrowされたがcatchされず
- プロセスが終了

### 原因2: メモリ不足
- Hugging Face モデル（118MB）のロード時
- Node.jsのメモリ上限を超えた
- OOM (Out of Memory) でプロセスが強制終了

### 原因3: 未処理の例外
- embedding-service.js の初期化エラー
- Promise のリジェクションが未処理
- Node.js プロセスが終了

## 🛠️ 緊急対応手順

### ステップ1: サーバーの状態確認

```bash
cd /Users/k-kawahara/AI-Workspace/community-resource-graph

# プロセスを確認
ps aux | grep node

# ポート3000の使用状況
lsof -i :3000
```

**期待**: プロセスが見つからない = サーバーが停止している

### ステップ2: サーバーを再起動（デバッグモード）

```bash
# 詳細なログを出力しながら起動
NODE_ENV=development npm run dev 2>&1 | tee server.log
```

**注意深く確認すべき点**:
- 🚀 Initializing embedding model...
- ⏱️  This may take 30-60 seconds...
- ✅ Embedding model initialized (XX秒)
- ✅ Model pre-warmed successfully
- 🚀 Server running on port 3000

**もし以下が出たら問題**:
- ❌ Error initializing embedding model
- ❌ Model initialization timeout
- ❌ Out of memory
- プロセスが突然終了する

### ステップ3: エラー内容を確認

サーバーログ全文を確認し、以下を探す：
- `❌` または `Error` のメッセージ
- `Stack trace`
- `timeout`
- `memory`
- `SIGKILL` や `SIGSEGV`

### ステップ4: 暫定対策

もしメモリ不足が原因なら：

```bash
# Node.jsのメモリ上限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

もしモデルロードがタイムアウトするなら：

```javascript
// embedding-service_fixed.js
const timeoutMs = 180000; // 90秒 → 180秒に延長
```

### ステップ5: 最終手段 - pre-warmを無効化

もし問題が解決しない場合、一時的にpre-warmを無効化：

```javascript
// server.js を元のバージョンに戻す
cd /Users/k-kawahara/AI-Workspace/community-resource-graph/src
mv server.js server_with_prewarm.js
mv server_backup.js server.js

# サーバー再起動
npm run dev
```

これで少なくともサーバーは起動します（初回検索は遅い）。

## 📝 正しいテスト手順（今後のために）

### Phase 1: サーバー起動確認
```bash
npm run dev
# ログが安定するまで待つ（30-60秒）
```

### Phase 2: Health Check
```bash
curl http://localhost:3000/health
# 期待: {"success":true, ...}
```

### Phase 3: 基本的なAPI
```bash
# 全資源取得
curl http://localhost:3000/api/resources/search
# 期待: 50件のデータ

# 詳細取得
curl http://localhost:3000/api/resources/res_001
# 期待: 1件の詳細データ
```

### Phase 4: 検索機能
```bash
# キーワード検索
curl 'http://localhost:3000/api/resources/search?keyword=静かな場所'
# 期待: 50件より少ない（フィルタリングされている）
```

### Phase 5: フロントエンドテスト
```
ブラウザで http://localhost:5173/resources
検索ボックスに「静かな場所」
検索ボタンをクリック
期待: フィルタリングされた結果が表示される
```

### Phase 6: 詳細ページ
```
任意の資源をクリック
期待: 詳細ページが表示される（エラーなし）
```

## 🎓 今回の教訓

1. **「起動した」≠「動作している」**
   - サーバーは起動後にクラッシュすることがある
   - 継続的な監視が必要

2. **エンドツーエンドのテストが重要**
   - APIが応答する ≠ 正しく動作する
   - 実際のユーザーフローをテストする

3. **ログの重要性**
   - 起動時だけでなく、運用中のログも確認
   - エラーハンドリングを適切に

4. **段階的なデプロイ**
   - embedding-service の修正 → テスト → 成功
   - server.js の修正 → テスト → 成功
   - 一度に複数の変更 = デバッグが困難

## 🚀 次のアクション

### 最優先（P0）
1. サーバーの起動状態を確認
2. サーバーログを全文確認
3. エラー原因を特定
4. サーバーを安定稼働させる

### 高優先（P1）
5. 検索フィルタリングの問題を修正（minScore調整）
6. 詳細APIの500エラーを修正

### 中優先（P2）
7. モニタリングの改善
8. エラーハンドリングの強化
9. ドキュメントの更新

## 📞 河原さんへ

以下のコマンドを実行して、結果を共有してください：

```bash
cd /Users/k-kawahara/AI-Workspace/community-resource-graph
bash check-server-status.sh
```

サーバーが停止している場合は：

```bash
# 再起動
npm run dev

# 起動ログを全てコピーして共有
```

特に以下の情報が重要です：
- サーバーが起動完了したか
- 「Model pre-warmed successfully」が出たか
- その後もサーバーが動き続けているか
- エラーメッセージがあればその内容

よろしくお願いします！

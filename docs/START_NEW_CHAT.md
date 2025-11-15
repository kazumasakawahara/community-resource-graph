# 🚀 新しいチャット開始時の手順

## 📖 最初に読むべきドキュメント

```bash
# このファイルを読む
/Users/k-kawahara/AI-Workspace/community-resource-graph/TEST_STATUS.md
```

## ⚡ クイックスタート

### 1. サーバーが起動しているか確認

**バックエンド:**
```bash
# 別ターミナルで起動中か確認
curl http://localhost:3000/api/health
# → {"status": "OK"} が返ればOK
```

**フロントエンド:**
```bash
# ブラウザで開く
http://localhost:5173
```

### 2. 前回の続きから開始

**前回の最終状態:**
- ✅ 資源登録機能: 動作確認済み
- ✅ 重複チェック: 実装済み
- ⏳ **次のタスク: キーワード検索のテスト**

### 3. 次にやること

**テスト5: キーワード検索**

1. ブラウザで http://localhost:5173/resources を開く
2. ログイン（kazumasa kawahara）
3. 検索ボックスに「**静か**」と入力
4. 「検索」ボタンをクリック
5. **期待: カフェ「月のしずく」が表示される**

---

## 📋 Claudeへの最初のメッセージ例

```
こんにちは！
前回の続きから始めます。

TEST_STATUS.mdを読んで、現在の状況を把握してください。
次のタスクは「キーワード検索のテスト」です。

準備ができたら、テスト手順を教えてください。
```

---

## 🔧 もしサーバーが停止していたら

**バックエンド再起動:**
```bash
cd ~/AI-Workspace/community-resource-graph
npm run dev
```

**フロントエンド再起動:**
```bash
cd ~/AI-Workspace/community-resource-graph/frontend
npm run dev
```

---

## 📊 現在の完成度

**7.5 / 10点**

完了: 4/9テスト
残り: 5/9テスト

次回で8-9点を目指します！

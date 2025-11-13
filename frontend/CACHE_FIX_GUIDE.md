# 🚀 キャッシュ問題完全解決手順

## 問題
ブラウザが古いJavaScriptコードをキャッシュして実行し続けている

## 解決策
以下の手順で**確実に**解決します。

---

## ステップ1: すべてのプロセスを停止

Macのターミナルで以下を実行：

```bash
cd ~/AI-Workspace/community-resource-graph/frontend
chmod +x stop-all.sh
./stop-all.sh
```

---

## ステップ2: 新しいポートでViteを起動

### 方法A: スクリプトを使用（推奨）

```bash
chmod +x start-fresh.sh
./start-fresh.sh
```

### 方法B: npmコマンドを使用

```bash
npm run dev:fresh
```

---

## ステップ3: バックエンドを起動

**新しいターミナルウィンドウを開いて**実行：

```bash
cd ~/AI-Workspace/community-resource-graph
npm start
```

---

## ステップ4: ブラウザで確認

**重要: 必ずプライベートウィンドウで開く**

```
http://localhost:5174
```

- **Chrome**: `Cmd + Shift + N`
- **Safari**: `Cmd + Shift + N`

---

## 確認ポイント ✅

以下が表示されていれば成功：

1. ✅ タイトルに「[更新版 v2.0]」が表示
2. ✅ 黄色背景の検索結果カウンター（🔍 検索結果: X 件 🔍）が表示
3. ✅ 「静かな場所」で検索すると30件前後に絞り込まれる
4. ✅ コンソールに新しいログ（🔍、📡、📥、✅）が出力される

---

## 変更内容

### vite.config.ts
- ポートを5174に変更
- キャッシュヘッダーを無効化
- 強制最適化モードを有効化
- ファイル名にハッシュを追加（キャッシュバスティング）

### package.json
- `dev:fresh` スクリプトを追加（キャッシュクリア＋起動）

### スクリプト
- `stop-all.sh`: すべてのプロセスを停止
- `start-fresh.sh`: キャッシュクリア＋Vite起動

---

## トラブルシューティング

### まだ古いコードが表示される場合

1. ブラウザを完全に終了
2. ブラウザの履歴・キャッシュを手動でクリア
3. Macを再起動（最終手段）

### ポート5174が使用中の場合

```bash
lsof -ti:5174 | xargs kill -9
```

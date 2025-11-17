# 🚀 クイックスタートガイド

**プログラミング知識不要！** このガイドに従えば、誰でも5分でシステムを起動できます。

---

## 📋 必要なもの

### 1. パソコン
- **Mac**: macOS 11以降
- **Windows**: Windows 10/11
- **Linux**: Ubuntu 20.04以降

### 2. 事前準備（初回のみ）

以下のソフトウェアをインストールしてください：

#### ① Node.js（必須）
**役割**: プログラムを動かすエンジン

1. https://nodejs.org/ja/download/ にアクセス
2. 「LTS（推奨版）」をダウンロード
3. ダウンロードしたファイルをダブルクリックしてインストール
4. 画面の指示に従って「次へ」を押していくだけ

**確認方法**:
- Mac: 「ターミナル」アプリを開いて `node -v` と入力してEnter
- Windows: 「コマンドプロンプト」を開いて `node -v` と入力してEnter
- `v20.x.x` のように表示されればOK

#### ② Docker Desktop（必須）
**役割**: データベースを動かす環境

1. https://www.docker.com/products/docker-desktop/ にアクセス
2. お使いのOS（Mac/Windows）に合ったものをダウンロード
3. ダウンロードしたファイルをダブルクリックしてインストール
4. インストール後、Docker Desktopを起動

**確認方法**:
- 画面下部（Windowsは右下、Macは上部）にDockerのアイコンが表示される
- アイコンをクリックして「Docker Desktop is running」と表示されればOK

#### ③ Ollama（オプション - AI検索機能を使う場合）
**役割**: AI検索を動かすエンジン

1. https://ollama.ai/download にアクセス
2. お使いのOS（Mac/Windows/Linux）に合ったものをダウンロード
3. インストール後、以下のコマンドを実行:

```bash
# Mac/Linux の場合
ollama serve

# Windows の場合
# Ollamaは自動で起動します
```

---

## ⚡ セットアップ（初回のみ）

### ステップ1: プロジェクトをダウンロード

```bash
# 1. ターミナル（Mac）またはコマンドプロンプト（Windows）を開く

# 2. 好きな場所に移動（例: デスクトップ）
cd ~/Desktop

# 3. プロジェクトをダウンロード
git clone https://github.com/kazumasakawahara/community-resource-graph.git

# 4. ダウンロードしたフォルダに移動
cd community-resource-graph
```

### ステップ2: 自動セットアップを実行

```bash
# macOS/Linux の場合
./setup.sh

# Windows の場合（Git Bashを使用）
bash setup.sh
```

**これだけ！** セットアップスクリプトが自動で以下を実行します：

1. ✅ 必要なソフトウェアがインストールされているか確認
2. ✅ 必要なファイルをダウンロード
3. ✅ データベースを設定
4. ✅ サンプルデータを投入
5. ✅ AI検索用のモデルをダウンロード（Ollamaがある場合）

**所要時間**: 5-10分（インターネット速度による）

---

## 🎮 使い方

### 起動

```bash
./start.sh
```

**画面に以下のように表示されたら成功**:
```
✓ 起動完了！

アプリケーションにアクセス:
  → http://localhost:5173
```

### アクセス

1. ブラウザ（Chrome/Safari/Edgeなど）を開く
2. アドレスバーに `http://localhost:5173` を入力
3. 画面が表示されます！

### 停止

```bash
./stop.sh
```

または起動中のターミナルで `Ctrl+C` を2回押す

---

## 👤 ログイン

### デモアカウント（すぐに試せます）

```
メールアドレス: demo@example.com
パスワード: demo123456
```

### 新規アカウント作成

1. ログイン画面の「新規登録」をクリック
2. 必要情報を入力
3. 「登録」をクリック

---

## 🎯 主な機能

### 1. 資源を探す
- **キーワード検索**: 名前や説明で検索
- **AI検索**: 自然な言葉で検索（例: 「静かな場所」「車椅子で入れる」）
- **フィルター**: エリアやタイプで絞り込み

### 2. 資源を登録
1. 「新規登録」ボタンをクリック
2. 必要情報を入力
   - 名前
   - 種類
   - 地域
   - 説明
   - 連絡先など
3. 「登録」をクリック

### 3. フィードバックを投稿
1. 資源の詳細ページを開く
2. 「フィードバックを投稿」をクリック
3. 訪問日とコメントを入力
4. 「投稿」をクリック

### 4. ネットワークを見る
- 資源の詳細ページで「ネットワーク表示」をクリック
- 関連する資源のつながりが図で表示されます

---

## ❓ よくある質問

### Q1: 「ポートが使用中です」というエラーが出る

**A**: 別のプログラムがポートを使っています。

```bash
# 一度停止してから再起動
./stop.sh
./start.sh
```

### Q2: データベースエラーが出る

**A**: データベースをリセットします。

```bash
# 完全リセット（すべてのデータが削除されます）
docker compose down -v

# 再セットアップ
./setup.sh
```

### Q3: AI検索が動かない

**A**: Ollamaが起動しているか確認してください。

```bash
# Mac/Linux の場合
ollama serve

# モデルが存在するか確認
ollama list

# mxbai-embed-large がなければダウンロード
ollama pull mxbai-embed-large
```

### Q4: 画面が真っ白

**A**: ブラウザのキャッシュをクリアしてください。

- Chrome: `Cmd+Shift+R` (Mac) または `Ctrl+Shift+R` (Windows)
- Safari: `Cmd+Option+R`
- Edge: `Ctrl+Shift+R`

### Q5: データを完全に消したい

```bash
# すべてのデータとコンテナを削除
docker compose down -v
```

---

## 📞 サポート

### 問題が解決しない場合

1. **ログを確認**:
   ```bash
   # バックエンドのログ
   npm run dev

   # Dockerのログ
   docker compose logs
   ```

2. **GitHub Issues**:
   https://github.com/kazumasakawahara/community-resource-graph/issues

   - 「New Issue」をクリック
   - エラーメッセージをコピー&ペースト
   - 状況を説明

---

## 🎓 もっと詳しく知りたい場合

### 技術的なドキュメント
- [README.md](README.md) - 完全な技術ドキュメント
- [API_ENDPOINTS.md](docs/API_ENDPOINTS.md) - API仕様
- [TEST_STATUS.md](TEST_STATUS.md) - テスト状況

### ディレクトリ構造
```
community-resource-graph/
├── setup.sh          ← セットアップスクリプト
├── start.sh          ← 起動スクリプト
├── stop.sh           ← 停止スクリプト
├── QUICKSTART.md     ← このファイル
├── README.md         ← 技術ドキュメント
├── frontend/         ← Webページ（React）
├── src/              ← サーバープログラム
├── scripts/          ← 便利スクリプト
└── docker-compose.yml ← データベース設定
```

---

## ✅ チェックリスト

セットアップ前に確認:
- [ ] Node.js 20.x以上をインストール済み
- [ ] Docker Desktopをインストール済み
- [ ] Docker Desktopが起動している
- [ ] （オプション）Ollamaをインストール済み

初回セットアップ:
- [ ] `git clone` でプロジェクトをダウンロード
- [ ] `./setup.sh` で自動セットアップを実行
- [ ] エラーなく完了

毎回の起動:
- [ ] Docker Desktopが起動しているか確認
- [ ] `./start.sh` で起動
- [ ] ブラウザで http://localhost:5173 にアクセス

---

**🎉 以上でセットアップ完了です！**

問題があれば、遠慮なくGitHub Issuesで質問してください。

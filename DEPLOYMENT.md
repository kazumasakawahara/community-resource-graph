# 🚀 デプロイガイド

このドキュメントでは、Community Resource Graphを本番環境にデプロイする方法を説明します。

---

## 📋 前提条件

### サーバー要件

- **OS**: Ubuntu 20.04/22.04 LTS 推奨
- **CPU**: 2コア以上（4コア推奨）
- **メモリ**: 4GB以上（8GB推奨）
- **ストレージ**: 20GB以上（SSD推奨）
- **ネットワーク**: 固定IPまたはドメイン

### 必要なソフトウェア

1. **Docker** (20.10以上)
2. **Docker Compose** (2.0以上)
3. **Git**
4. **Ollama** (オプション - AI検索を使う場合)

---

## 🎯 デプロイ方式の選択

### オプションA: フルDockerデプロイ（推奨）

**すべてをDocker Composeで管理**

- ✅ シンプルで管理しやすい
- ✅ 環境の再現性が高い
- ⚠️ AI検索にはホストのOllamaが必要

### オプションB: ハイブリッドデプロイ

**フロントエンドは別サービス（Vercel/Netlify）**

- ✅ フロントエンドの配信が高速
- ✅ 無料プランが使える
- ⚠️ 設定が少し複雑

このガイドでは **オプションA** を解説します。

---

## 🔧 ステップ1: サーバーのセットアップ

### 1.1 サーバーにSSH接続

```bash
ssh user@your-server-ip
```

### 1.2 システムアップデート

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Docker & Docker Composeのインストール

```bash
# Dockerのインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# Docker Composeのインストール（最新版）
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# ログアウト→ログインして権限を反映
exit
# 再度SSH接続
ssh user@your-server-ip

# 確認
docker --version
docker-compose --version
```

### 1.4 Ollamaのインストール（AI検索を使う場合）

```bash
# Ollamaのインストール
curl -fsSL https://ollama.ai/install.sh | sh

# サービスとして自動起動設定
sudo systemctl enable ollama
sudo systemctl start ollama

# モデルのダウンロード（約670MB）
ollama pull mxbai-embed-large

# 確認
ollama list
```

---

## 📦 ステップ2: アプリケーションのデプロイ

### 2.1 リポジトリのクローン

```bash
# ホームディレクトリに移動
cd ~

# リポジトリをクローン
git clone https://github.com/kazumasakawahara/community-resource-graph.git

# ディレクトリに移動
cd community-resource-graph
```

### 2.2 環境変数の設定

```bash
# 本番用環境変数ファイルをコピー
cp .env.production .env.prod

# 環境変数を編集
nano .env.prod
```

**必須の変更項目**:

```bash
# ⚠️ 必ず変更してください！

# 1. Neo4jパスワード（強力なパスワードに変更）
NEO4J_PASSWORD=your-strong-password-here

# 2. JWTシークレット（ランダムな32文字以上の文字列）
# 生成方法: openssl rand -base64 32
JWT_SECRET=your-random-32-char-secret-here

# 3. フロントエンドのURL（後で設定）
# CORS_ORIGIN=https://your-domain.com
```

保存して終了: `Ctrl+X` → `Y` → `Enter`

### 2.3 ビルドと起動

```bash
# Docker Composeで全てビルド・起動
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# ログを確認（起動状況）
docker-compose -f docker-compose.prod.yml logs -f
```

**起動完了の確認**:
```
✓ Neo4j起動: "Started"が表示される
✓ Backend起動: "Server is running on port 3000"
✓ Frontend起動: nginxが起動
```

`Ctrl+C` でログ表示を終了

---

## 🗄️ ステップ3: データベースの初期化

### 3.1 スキーマ初期化

```bash
# バックエンドコンテナに接続
docker exec -it community-resource-backend-prod sh

# スキーマ初期化スクリプトを実行
node scripts/init-schema.js

# 確認メッセージが表示されればOK
# "✓ Schema initialized successfully"

# コンテナから退出
exit
```

### 3.2 デモデータ投入（オプション）

```bash
# バックエンドコンテナに再度接続
docker exec -it community-resource-backend-prod sh

# デモデータ投入
node scripts/seed-demo-data.js

# ベクトルインデックス作成
node scripts/create-vector-index.js

# 既存データのベクトル化（Ollamaがある場合）
node scripts/vectorize-with-ollama.js

exit
```

---

## 🌐 ステップ4: ドメイン設定とHTTPS化

### 4.1 ドメインのDNS設定

**ドメインのAレコードをサーバーIPに設定**:
```
A    @              your-server-ip
A    www            your-server-ip
```

### 4.2 Nginxリバースプロキシのセットアップ

```bash
# Nginxのインストール
sudo apt install nginx -y

# 設定ファイルを作成
sudo nano /etc/nginx/sites-available/community-resource-graph
```

**設定内容**:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # フロントエンド
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # バックエンドAPI
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/community-resource-graph /etc/nginx/sites-enabled/

# Nginxをリロード
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 SSL/TLS証明書の設定（Let's Encrypt）

```bash
# Certbotのインストール
sudo apt install certbot python3-certbot-nginx -y

# SSL証明書の取得と自動設定
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# メール入力 → 利用規約同意 → リダイレクト設定 (推奨: 2)

# 自動更新の確認
sudo certbot renew --dry-run
```

---

## ✅ ステップ5: 動作確認

### 5.1 ヘルスチェック

```bash
# バックエンドAPI
curl http://localhost:3000/health

# フロントエンド
curl http://localhost/health

# 外部アクセス
curl https://your-domain.com/health
```

### 5.2 Webブラウザで確認

1. **https://your-domain.com** にアクセス
2. ログイン画面が表示されるか確認
3. デモアカウントでログイン:
   - Email: `demo@example.com`
   - Password: `demo123456`

### 5.3 機能テスト

- [ ] ユーザー登録ができる
- [ ] 資源一覧が表示される
- [ ] 資源検索ができる
- [ ] AI検索ができる（Ollamaがある場合）
- [ ] 資源詳細が表示される
- [ ] フィードバックが投稿できる

---

## 🔄 運用管理

### 日常的な操作

#### アプリケーションの起動・停止

```bash
# 停止
docker-compose -f docker-compose.prod.yml down

# 起動
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 再起動
docker-compose -f docker-compose.prod.yml restart

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f backend
```

#### データベースのバックアップ

```bash
# Neo4jデータベースのバックアップ
docker exec community-resource-neo4j-prod \
  neo4j-admin database dump neo4j --to-path=/data/backups

# バックアップファイルをホストにコピー
docker cp community-resource-neo4j-prod:/data/backups/neo4j.dump \
  ~/backups/neo4j-$(date +%Y%m%d).dump
```

#### アプリケーションの更新

```bash
# 最新コードを取得
cd ~/community-resource-graph
git pull origin main

# 再ビルド・再起動
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# ログで確認
docker-compose -f docker-compose.prod.yml logs -f
```

### 監視とログ

#### ログの確認

```bash
# 全サービスのログ
docker-compose -f docker-compose.prod.yml logs -f

# 特定サービスのログ
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f neo4j

# 最新100行のログ
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

#### リソース使用状況の確認

```bash
# Dockerコンテナのリソース使用状況
docker stats

# ディスク使用状況
df -h

# メモリ使用状況
free -h
```

---

## ⚠️ トラブルシューティング

### 問題1: コンテナが起動しない

```bash
# ログで詳細を確認
docker-compose -f docker-compose.prod.yml logs backend

# コンテナの状態確認
docker ps -a

# 完全リセット（データも削除）
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 問題2: Neo4jに接続できない

```bash
# Neo4jのログ確認
docker logs community-resource-neo4j-prod

# ヘルスチェック
docker exec community-resource-neo4j-prod \
  cypher-shell -u neo4j -p your-password "RETURN 1"

# パスワードが間違っている場合
docker-compose -f docker-compose.prod.yml down
# .env.prod のNEO4J_PASSWORDを確認
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 問題3: AI検索が動かない

```bash
# Ollamaの状態確認
sudo systemctl status ollama

# Ollamaの起動
sudo systemctl start ollama

# モデルの確認
ollama list

# モデルが表示されない場合
ollama pull mxbai-embed-large

# バックエンドから接続テスト
curl http://localhost:11434/api/tags
```

### 問題4: メモリ不足

```bash
# Neo4jのメモリ設定を削減
# docker-compose.prod.yml を編集
nano docker-compose.prod.yml

# 以下の値を小さくする
NEO4J_dbms_memory_heap_max__size=2G  # 4G → 2G
NEO4J_dbms_memory_pagecache_size=512m  # 1G → 512m

# 再起動
docker-compose -f docker-compose.prod.yml restart neo4j
```

---

## 🔐 セキュリティ

### 基本的なセキュリティ設定

#### 1. ファイアウォール設定

```bash
# UFWのインストールと有効化
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポートのみ開放
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 有効化
sudo ufw enable

# 状態確認
sudo ufw status
```

#### 2. 自動セキュリティアップデート

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

#### 3. 定期的なバックアップ

```bash
# cronでバックアップスクリプトを設定
crontab -e

# 毎日午前2時にバックアップ
0 2 * * * /home/user/community-resource-graph/scripts/backup.sh
```

---

## 📊 パフォーマンスチューニング

### Neo4jの最適化

```bash
# プロダクション向け設定
# docker-compose.prod.yml の environment に追加

NEO4J_dbms_memory_heap_initial__size=2G
NEO4J_dbms_memory_heap_max__size=4G
NEO4J_dbms_memory_pagecache_size=2G
NEO4J_dbms_tx__log_rotation_retention__policy=3 days
```

### Nginxのキャッシュ設定

```nginx
# /etc/nginx/sites-available/community-resource-graph に追加

proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    # ... 既存の設定 ...
}
```

---

## 💰 コスト見積もり

### 推奨VPSプラン

| プロバイダー | プラン | CPU | メモリ | ストレージ | 月額 |
|------------|-------|-----|--------|-----------|------|
| さくらのVPS | 2GB | 3Core | 2GB | 50GB SSD | ¥1,738 |
| ConoHa VPS | 2GB | 3Core | 2GB | 100GB SSD | ¥1,065 |
| AWS Lightsail | $10 | 1Core | 2GB | 60GB SSD | ¥1,500 |
| DigitalOcean | $12 | 1Core | 2GB | 50GB SSD | ¥1,800 |

**推奨**: さくらのVPS 2GBプラン（安定性重視）

### 追加コスト

- ドメイン: ¥1,000-2,000/年
- SSL証明書: 無料（Let's Encrypt）
- バックアップストレージ: 別途検討

**合計**: 約¥2,000-3,000/月

---

## 🎓 まとめ

このガイドに従えば、約2-3時間で本番環境が構築できます。

### デプロイ後のチェックリスト

- [ ] すべてのサービスが起動している
- [ ] HTTPSでアクセスできる
- [ ] データベースが初期化されている
- [ ] ログイン・登録ができる
- [ ] 基本機能が動作する
- [ ] バックアップが設定されている
- [ ] ファイアウォールが設定されている
- [ ] 監視・ログが確認できる

### 困ったときは

- **GitHub Issues**: https://github.com/kazumasakawahara/community-resource-graph/issues
- **ログ確認**: `docker-compose -f docker-compose.prod.yml logs -f`
- **コンテナ状態**: `docker ps -a`

---

**デプロイ頑張ってください！** 🚀

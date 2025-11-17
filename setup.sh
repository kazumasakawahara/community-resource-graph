#!/bin/bash

# Community Resource Graph - 自動セットアップスクリプト
# プログラム知識不要で使えるワンクリックセットアップ

set -e  # エラー時に停止

# 色付きメッセージ用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 進捗表示
print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ようこそメッセージ
clear
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Community Resource Graph - 自動セットアップ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "このスクリプトは、必要な環境設定を自動で行います。"
echo "所要時間: 約5-10分"
echo ""
echo -e "${YELLOW}注意: インターネット接続が必要です${NC}"
echo ""
read -p "セットアップを開始しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "セットアップをキャンセルしました。"
    exit 0
fi

# ステップ1: 前提条件チェック
print_step "ステップ 1/8: 前提条件チェック"

# Node.js チェック
if ! command -v node &> /dev/null; then
    print_error "Node.jsがインストールされていません"
    echo ""
    echo "以下のURLからNode.js 20.x以上をインストールしてください:"
    echo "https://nodejs.org/ja/download/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js 20.x以上が必要です（現在: v$NODE_VERSION）"
    echo "https://nodejs.org/ja/download/ から最新版をインストールしてください"
    exit 1
fi
print_success "Node.js $(node -v) が見つかりました"

# Docker チェック
if ! command -v docker &> /dev/null; then
    print_error "Dockerがインストールされていません"
    echo ""
    echo "以下のURLからDockerをインストールしてください:"
    echo "https://www.docker.com/products/docker-desktop/"
    exit 1
fi
print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) が見つかりました"

# Docker起動チェック
if ! docker info &> /dev/null; then
    print_error "Dockerが起動していません"
    echo ""
    echo "Docker Desktopを起動してから、再度このスクリプトを実行してください。"
    exit 1
fi
print_success "Dockerが起動しています"

# Ollama チェック
if ! command -v ollama &> /dev/null; then
    print_warning "Ollamaがインストールされていません"
    echo ""
    echo "AI検索機能を使用するには、Ollamaのインストールが必要です。"
    echo "インストールURL: https://ollama.ai/download"
    echo ""
    read -p "Ollamaなしで続行しますか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "セットアップをキャンセルしました。"
        echo "Ollamaをインストールしてから、再度実行してください。"
        exit 0
    fi
    SKIP_OLLAMA=true
else
    print_success "Ollama $(ollama --version | cut -d' ' -f3) が見つかりました"
    SKIP_OLLAMA=false
fi

# ステップ2: バックエンド依存関係インストール
print_step "ステップ 2/8: バックエンド依存関係をインストール"
npm install
print_success "バックエンド依存関係のインストール完了"

# ステップ3: フロントエンド依存関係インストール
print_step "ステップ 3/8: フロントエンド依存関係をインストール"
cd frontend
npm install
cd ..
print_success "フロントエンド依存関係のインストール完了"

# ステップ4: 環境変数設定
print_step "ステップ 4/8: 環境変数を設定"

if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Neo4j設定
NEO4J_URI=bolt://localhost:17687
NEO4J_USER=neo4j
NEO4J_PASSWORD=community-resource-graph-2024

# サーバー設定
PORT=3000
NODE_ENV=development

# JWT設定
JWT_SECRET=your-secret-key-change-in-production-12345
JWT_EXPIRES_IN=24h

# Ollama設定（オプション）
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
EOF
    print_success ".env ファイルを作成しました"
else
    print_success ".env ファイルは既に存在します"
fi

# ステップ5: Neo4jデータベース起動
print_step "ステップ 5/8: Neo4jデータベースを起動"

# 既存のコンテナを停止・削除
docker compose down 2>/dev/null || true

# Neo4j起動
docker compose up -d

# Neo4j起動待機
echo "Neo4jの起動を待っています..."
for i in {1..30}; do
    if docker compose exec -T neo4j cypher-shell -u neo4j -p community-resource-graph-2024 "RETURN 1" &>/dev/null; then
        print_success "Neo4jが起動しました"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Neo4jの起動がタイムアウトしました"
        echo "docker compose logs で詳細を確認してください"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# ステップ6: データベース初期化
print_step "ステップ 6/8: データベースを初期化"

npm run db:init-schema
print_success "スキーマ初期化完了"

npm run db:seed-demo
print_success "デモデータ投入完了"

npm run db:create-indexes
print_success "インデックス作成完了"

# ステップ7: Ollama設定（オプション）
if [ "$SKIP_OLLAMA" = false ]; then
    print_step "ステップ 7/8: AI検索用モデルをダウンロード"

    # Ollamaが起動しているかチェック
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
        print_warning "Ollamaが起動していません"
        echo "Ollamaを起動してください: ollama serve"
        echo ""
        read -p "Ollamaなしで続行しますか？ (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        # モデルダウンロード
        echo "mxbai-embed-large モデルをダウンロードしています（約670MB）..."
        ollama pull mxbai-embed-large
        print_success "モデルのダウンロード完了"

        # ベクトル化実行
        echo "既存データのベクトル化を実行しています..."
        npm run db:vectorize
        print_success "ベクトル化完了"
    fi
else
    print_step "ステップ 7/8: AI検索設定（スキップ）"
    print_warning "Ollamaがインストールされていないため、AI検索機能は無効です"
fi

# ステップ8: 起動スクリプト作成
print_step "ステップ 8/8: 起動スクリプトを作成"

cat > start.sh << 'EOF'
#!/bin/bash

# Community Resource Graph - 起動スクリプト

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Community Resource Graph を起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Neo4j起動
echo "▶ Neo4jデータベースを起動..."
docker compose up -d

# バックエンド起動
echo "▶ バックエンドサーバーを起動..."
npm run dev &
BACKEND_PID=$!

# フロントエンド起動
echo "▶ フロントエンドサーバーを起動..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ 起動完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "アプリケーションにアクセス:"
echo "  → http://localhost:5173"
echo ""
echo "停止するには: Ctrl+C を2回押してください"
echo ""

# 終了シグナルをキャッチ
trap "echo ''; echo '停止中...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop; exit 0" INT TERM

# プロセスの監視
wait
EOF

chmod +x start.sh
print_success "起動スクリプト (start.sh) を作成しました"

# 停止スクリプト作成
cat > stop.sh << 'EOF'
#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Community Resource Graph を停止中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Node.jsプロセスを停止
pkill -f "node.*server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Docker停止
docker compose stop

echo "✓ 停止完了"
EOF

chmod +x stop.sh
print_success "停止スクリプト (stop.sh) を作成しました"

# 完了メッセージ
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 セットアップ完了！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "次の手順:"
echo ""
echo "1. アプリケーションを起動:"
echo -e "   ${YELLOW}./start.sh${NC}"
echo ""
echo "2. ブラウザでアクセス:"
echo -e "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo "3. アプリケーションを停止:"
echo -e "   ${YELLOW}./stop.sh${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "デモアカウント:"
echo "  Email: demo@example.com"
echo "  Password: demo123456"
echo ""
echo "トラブルシューティング:"
echo "  - ポートが使用中の場合: ./stop.sh を実行してから再起動"
echo "  - データベースエラー: docker compose down -v で完全リセット"
echo ""

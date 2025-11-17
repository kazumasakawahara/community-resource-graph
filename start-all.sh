#!/bin/bash

echo "🚀 Community Resource Graph を起動します..."

# 1. 既存のプロセスをクリーンアップ
echo "🧹 既存のプロセスをクリーンアップ中..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
killall ollama 2>/dev/null
sleep 2

# 2. Neo4jを起動
echo "📦 Neo4jを起動中..."
docker compose up -d neo4j

# 3. Ollamaを起動（バックグラウンド）
echo "🤖 Ollamaを起動中..."
ollama serve > /tmp/ollama.log 2>&1 &
sleep 3

# 4. バックエンドとフロントエンドの起動は別ターミナルで
echo ""
echo "✅ Neo4jとOllamaが起動しました"
echo ""
echo "次のステップ:"
echo "1. 新しいターミナルで: npm run dev"
echo "2. さらに別のターミナルで: cd frontend && npm run dev"
echo ""
echo "または、VS Codeで2つのターミナルを開いて実行してください"
echo ""

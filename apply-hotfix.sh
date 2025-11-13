#!/bin/bash

# Hotfix適用スクリプト

echo "=== Hotfix 適用 ==="
echo ""
echo "このスクリプトは以下の修正を適用します:"
echo "1. ベクトル検索を一時的に無効化（ハング問題の回避）"
echo "2. view_count の型変換を安全に処理"
echo ""

cd /Users/k-kawahara/AI-Workspace/community-resource-graph

# バックアップ
echo "ステップ1: バックアップを作成"
cp src/services/resource-service.js src/services/resource-service_before_hotfix.js
echo "✅ バックアップ完了: resource-service_before_hotfix.js"

# Hotfix適用
echo ""
echo "ステップ2: Hotfix を適用"
cp src/services/resource-service_hotfix.js src/services/resource-service.js
echo "✅ Hotfix適用完了"

# サーバー再起動の案内
echo ""
echo "ステップ3: サーバーを再起動してください"
echo "----------------------------------------"
echo "既に起動しているサーバーがある場合は、Ctrl+C で停止してから:"
echo "npm run dev"
echo ""
echo "=== 完了 ==="
echo ""
echo "修正内容:"
echo "- ベクトル検索: 一時的に無効化（従来のLIKE検索を使用）"
echo "- view_count: 安全な型変換に変更"
echo ""
echo "テスト方法:"
echo "1. curl http://localhost:3000/health"
echo "2. curl 'http://localhost:3000/api/resources/search?keyword=静かな場所'"
echo "3. curl http://localhost:3000/api/resources/res_001"
echo ""
echo "全てのテストが成功したらOKです！"

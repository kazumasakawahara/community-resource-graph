#!/bin/bash

# サーバー再起動スクリプト

echo "=== サーバー再起動手順 ==="
echo ""

echo "ステップ1: ポート3000を使用しているプロセスを確認"
echo "----------------------------------------"
lsof -i :3000

echo ""
echo "ステップ2: 上記のプロセスを終了します"
echo "（PIDを確認して、以下のコマンドを実行してください）"
echo "kill -9 <PID>"
echo ""
echo "または、全てのnodeプロセスを終了:"
echo "pkill -9 node"
echo ""
read -p "プロセスを終了しましたか？ (y/n): " answer

if [ "$answer" = "y" ]; then
    echo ""
    echo "ステップ3: サーバーを再起動"
    echo "----------------------------------------"
    cd /Users/k-kawahara/AI-Workspace/community-resource-graph
    npm run dev
else
    echo "手動でプロセスを終了してから、以下を実行してください:"
    echo "cd /Users/k-kawahara/AI-Workspace/community-resource-graph"
    echo "npm run dev"
fi

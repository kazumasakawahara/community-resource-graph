#!/bin/bash

# サーバーの状態確認スクリプト

echo "=== サーバープロセスの確認 ==="
echo ""

echo "1. Node.jsプロセスを確認:"
ps aux | grep node | grep -v grep

echo ""
echo "2. ポート3000の使用状況:"
lsof -i :3000

echo ""
echo "3. 最近のサーバーログ（もしあれば）:"
if [ -f "/Users/k-kawahara/AI-Workspace/community-resource-graph/server.log" ]; then
    tail -50 /Users/k-kawahara/AI-Workspace/community-resource-graph/server.log
else
    echo "server.log が見つかりません"
fi

echo ""
echo "=== 診断完了 ==="
echo ""
echo "次のステップ:"
echo "1. もしNode.jsプロセスが見つからない場合:"
echo "   cd /Users/k-kawahara/AI-Workspace/community-resource-graph"
echo "   npm run dev"
echo ""
echo "2. サーバー起動時のログを全て確認してください"
echo "3. 特に以下を探してください:"
echo "   - ❌ または Error のメッセージ"
echo "   - メモリ不足のエラー"
echo "   - Embedding model のエラー"

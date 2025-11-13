#!/bin/bash
# すべてのプロセスを停止するスクリプト

echo "🛑 すべてのプロセスを停止しています..."

# ポート5173と5174を使用しているプロセスを停止
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Vite関連プロセスを停止
pkill -9 -f "vite" 2>/dev/null
pkill -9 -f "node.*frontend" 2>/dev/null

# ブラウザを停止
killall -9 "Google Chrome" 2>/dev/null
killall -9 "Chromium" 2>/dev/null
killall -9 "Safari" 2>/dev/null

echo "✅ すべてのプロセスを停止しました"

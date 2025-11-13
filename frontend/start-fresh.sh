#!/bin/bash
# キャッシュクリア＆Vite起動スクリプト

echo "🧹 キャッシュをクリアしています..."

# Viteキャッシュを削除
rm -rf node_modules/.vite
rm -rf node_modules/.vite-temp
rm -rf node_modules/.tmp
rm -rf dist

# Playwrightキャッシュを削除
rm -rf ~/Library/Caches/ms-playwright/mcp-chrome-*/

echo "✅ キャッシュクリア完了"
echo ""
echo "🚀 Viteを新しいポート(5174)で起動します..."
echo "   ブラウザは必ず【プライベートウィンドウ】で開いてください！"
echo "   Chrome: Cmd+Shift+N"
echo "   Safari: Cmd+Shift+N"
echo ""

# Viteを起動（強制最適化モード）
npm run dev -- --force --port 5174

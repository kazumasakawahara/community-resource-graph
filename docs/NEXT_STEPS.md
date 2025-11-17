# 次回の起動手順

## 🚀 簡単起動方法

次回、このプロジェクトを起動するときは以下の手順で行ってください：

### 方法1: 起動スクリプトを使う（推奨）

```bash
cd ~/AI-Workspace/community-resource-graph
./start-all.sh
```

その後、**2つの新しいターミナル**を開いて：

**ターミナル1（バックエンド）**:
```bash
cd ~/AI-Workspace/community-resource-graph
npm run dev
```

**ターミナル2（フロントエンド）**:
```bash
cd ~/AI-Workspace/community-resource-graph/frontend
npm run dev
```

---

### 方法2: 手動で起動

**ターミナル1 - Neo4j**:
```bash
cd ~/AI-Workspace/community-resource-graph
docker compose up -d neo4j
```

**ターミナル2 - Ollama**:
```bash
ollama serve
```

**ターミナル3 - バックエンド**:
```bash
cd ~/AI-Workspace/community-resource-graph
npm run dev
```

**ターミナル4 - フロントエンド**:
```bash
cd ~/AI-Workspace/community-resource-graph/frontend
npm run dev
```

---

## 🎯 アクセス

すべて起動したら、ブラウザで：
- http://localhost:5173 または http://localhost:5175

---

## 🔧 トラブルシューティング

### ポートエラーが出た場合

```bash
# 既存のプロセスを終了
lsof -ti:3000 | xargs kill -9
killall ollama

# 改めて起動
```

### デモデータが必要な場合

```bash
cd ~/AI-Workspace/community-resource-graph
node scripts/seed-demo-data.js
```

**テストユーザー**:
- メール: `test@gmail.com`（あなたが登録しようとしたもの）
- または新規登録してください

---

## 📋 次回のタスク

1. ✅ システム起動確認
2. ✅ セマンティック検索のテスト
   - 「落ち着ける場所」
   - 「仲間と話したい」
   - 「初心者向け」
3. ✅ 結果の確認と評価
4. ✅ フェーズ2（利用パターン検出）へ進む

---

## 🎊 今日の成果まとめ

- ✅ フェーズ1（Ollama統合）完全実装
- ✅ デモデータ品質改善
- ✅ セマンティック検索機能実装
- ✅ 再ベクトル化成功（534リソース → 50リソース）

素晴らしい進捗でした！お疲れ様でした！😊

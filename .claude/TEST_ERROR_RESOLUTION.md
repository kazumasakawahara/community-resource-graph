# テストエラー解決手順

## 新しいテストエラーが発生した場合の対応手順

### 1. TROUBLESHOOTING_GUIDE.md を参照
```bash
cat TROUBLESHOOTING_GUIDE.md
```
プロジェクト固有のトラブルシューティング情報を確認する。

### 2. データベースインデックスの確認
```bash
npm run db:create-indexes
```
- Neo4jのインデックスが正しく作成されているか確認
- パフォーマンス問題やクエリエラーの原因になることがある

### 3. データベースのクリーンアップ
```bash
npm run db:reset
```
- テストデータの残骸や不整合なデータをクリーンアップ
- データベースを初期状態にリセット

### 4. よくあるエラーパターン

#### Cypher構文エラー
- 複数の`MATCH ... DELETE`を一つのクエリで実行すると構文エラー
- 解決策: 個別のクエリに分割する

#### Neo4jドライバー接続エラー
- `Neo4j URI`や認証情報の確認
- Docker環境の場合、コンテナが起動しているか確認

#### Jest タイムアウト
- 非同期処理が完了していない
- データベース接続が閉じられていない
- 解決策: `await neo4jDriver.close()` を追加

### 5. デバッグコマンド

```bash
# Neo4jコンテナのログ確認
docker logs community-resource-neo4j

# バックエンドコンテナのログ確認
docker logs community-resource-backend

# 統合テストの詳細ログ
npm run test:integration -- --verbose

# 特定のテストファイルのみ実行
npm run test:integration -- tests/integration/auth.test.js
```

### 6. エラー解決の優先順位

1. **構文エラー**: コードの修正
2. **接続エラー**: 環境変数、Dockerコンテナの確認
3. **データ不整合**: `npm run db:reset`
4. **インデックス不足**: `npm run db:create-indexes`
5. **タイムアウト**: 非同期処理の確認

## 記録日: 2025-11-12

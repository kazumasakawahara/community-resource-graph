#!/usr/bin/env node

// resource-dao.jsの修正スクリプト
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || '/Users/k-kawahara/AI-Workspace/community-resource-graph/src/dao/resource-dao.js';

console.log(`📄 ファイルを読み込み中: ${filePath}`);

try {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 修正パターン1: 返り値にpage, limitを追加
  const oldPattern = `    return {
      resources,
      total,
      suggestions
    };`;

  const newPattern = `    // Calculate pagination info
    const page = Math.floor(skip / limit) + 1;

    return {
      resources,
      total,
      page,
      limit,
      suggestions
    };`;

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ ページネーション情報を追加しました');
    
    // ファイルに書き込み
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ ファイルを保存しました');
  } else {
    console.log('⚠️  修正箇所が見つかりませんでした。手動で修正してください。');
    console.log('\n以下の箇所を探してください:');
    console.log(oldPattern);
  }
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

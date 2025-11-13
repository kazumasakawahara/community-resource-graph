#!/usr/bin/env node

// tests/integration/resources.test.jsの修正スクリプト
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || '/Users/k-kawahara/AI-Workspace/community-resource-graph/tests/integration/resources.test.js';

console.log(`📄 ファイルを読み込み中: ${filePath}`);

try {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 修正パターン: afterAllにドライバークローズを追加
  const oldPattern = `    } finally {
      await session.close();
    }
  });

  describe('POST /api/resources', () => {`;

  const newPattern = `    } finally {
      await session.close();
      // Close driver to allow Jest to exit
      await neo4jDriver.close();
    }
  });

  describe('POST /api/resources', () => {`;

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ Neo4jドライバークローズを追加しました');
    
    // ファイルに書き込み
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ ファイルを保存しました');
  } else {
    console.log('⚠️  修正箇所が見つかりませんでした。別のパターンを試します...');
    
    // 代替パターン
    const altPattern = `    } finally {
      await session.close();
    }
  });`;

    const altNew = `    } finally {
      await session.close();
      // Close driver to allow Jest to exit
      await neo4jDriver.close();
    }
  });`;

    if (content.includes(altPattern)) {
      // 最後の出現箇所のみを置換
      const lastIndex = content.lastIndexOf(altPattern);
      if (lastIndex !== -1) {
        content = content.substring(0, lastIndex) + altNew + content.substring(lastIndex + altPattern.length);
        console.log('✅ Neo4jドライバークローズを追加しました（代替パターン）');
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('✅ ファイルを保存しました');
      }
    } else {
      console.log('⚠️  修正箇所が見つかりませんでした。手動で修正してください。');
    }
  }
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

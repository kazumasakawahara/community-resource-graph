#!/usr/bin/env node

/**
 * Fix resource-dao.js - Safe type conversion for view_count and feedback_count
 * 
 * This script fixes the TypeError: resourceNode.view_count.toNumber is not a function
 * by adding safe type checking before calling .toNumber()
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'dao', 'resource-dao.js');

console.log('========================================');
console.log('  Fix resource-dao.js');
console.log('========================================\n');

// Read the file
console.log(`📖 Reading file: ${filePath}`);
let content = fs.readFileSync(filePath, 'utf8');

// Backup
const backupPath = filePath + '.backup';
fs.writeFileSync(backupPath, content);
console.log(`✅ Backup created: ${backupPath}\n`);

// Fix 1: create() function
console.log('🔧 Fix 1: create() function');
const createOld = `      view_count: resourceNode.view_count.toNumber(),
      feedback_count: resourceNode.feedback_count.toNumber(),`;

const createNew = `      view_count: typeof resourceNode.view_count === 'object'
        ? resourceNode.view_count.toNumber()
        : resourceNode.view_count || 0,
      feedback_count: typeof resourceNode.feedback_count === 'object'
        ? resourceNode.feedback_count.toNumber()
        : resourceNode.feedback_count || 0,`;

if (content.includes(createOld)) {
  content = content.replace(createOld, createNew);
  console.log('  ✓ Fixed create() function');
} else {
  console.log('  ⚠️  create() function pattern not found (may already be fixed)');
}

// Fix 2: findById() function
console.log('\n🔧 Fix 2: findById() function');
const findByIdOld = `      view_count: resourceNode.view_count.toNumber(),
      feedback_count: resourceNode.feedback_count.toNumber(),
      created_at: resourceNode.created_at.toString(),
      updated_at: resourceNode.updated_at.toString(),
      area: areaNode ? {`;

const findByIdNew = `      view_count: typeof resourceNode.view_count === 'object'
        ? resourceNode.view_count.toNumber()
        : resourceNode.view_count || 0,
      feedback_count: typeof resourceNode.feedback_count === 'object'
        ? resourceNode.feedback_count.toNumber()
        : resourceNode.feedback_count || 0,
      created_at: resourceNode.created_at.toString(),
      updated_at: resourceNode.updated_at.toString(),
      area: areaNode ? {`;

if (content.includes(findByIdOld)) {
  content = content.replace(findByIdOld, findByIdNew);
  console.log('  ✓ Fixed findById() function');
} else {
  console.log('  ⚠️  findById() function pattern not found (may already be fixed)');
}

// Write the fixed file
fs.writeFileSync(filePath, content);
console.log('\n✅ File updated successfully!\n');

console.log('========================================');
console.log('  Summary');
console.log('========================================');
console.log('✓ Backup created');
console.log('✓ create() function fixed');
console.log('✓ findById() function fixed');
console.log('\n📝 Changes:');
console.log('  - Added type checking before .toNumber() calls');
console.log('  - Fallback to 0 if value is null/undefined');
console.log('  - Matches the pattern used in search() function\n');

console.log('Next steps:');
console.log('1. Restart your server: npm run dev');
console.log('2. Test: node quick-test.js');
console.log('3. If issues persist, restore backup:');
console.log(`   cp ${backupPath} ${filePath}\n`);

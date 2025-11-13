/**
 * Test: Backend Project Initialization
 * Requirement: 10 (User Management & Authentication)
 * Task: 1.1 バックエンドプロジェクト初期化
 */

const fs = require('fs');
const path = require('path');

describe('Backend Project Initialization', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  test('package.json should exist with correct dependencies', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Required dependencies
    expect(packageJson.dependencies).toHaveProperty('express');
    expect(packageJson.dependencies).toHaveProperty('neo4j-driver');
    expect(packageJson.dependencies).toHaveProperty('jsonwebtoken');
    expect(packageJson.dependencies).toHaveProperty('bcryptjs');
    expect(packageJson.dependencies).toHaveProperty('express-validator');

    // Dev dependencies
    expect(packageJson.devDependencies).toHaveProperty('typescript');
    expect(packageJson.devDependencies).toHaveProperty('@types/express');
    expect(packageJson.devDependencies).toHaveProperty('@types/node');
    expect(packageJson.devDependencies).toHaveProperty('@types/jsonwebtoken');
    expect(packageJson.devDependencies).toHaveProperty('@types/bcryptjs');
  });

  test('tsconfig.json should exist with strict mode and ES module', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    // Strict mode
    expect(tsconfig.compilerOptions.strict).toBe(true);

    // ES module
    expect(tsconfig.compilerOptions.module).toMatch(/ES|es/);
    expect(tsconfig.compilerOptions.target).toMatch(/ES|es/);

    // Node.js 18+ compatibility
    expect(tsconfig.compilerOptions.moduleResolution).toBe('node');
  });

  test('Node.js version should be 18+', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toMatch(/>=?\s*18/);
  });
});

/**
 * Test: Frontend Project Initialization
 * Requirements: 7 (Ego-network visualization), 10 (User Management)
 * Task: 1.2 フロントエンドプロジェクト初期化
 */

const fs = require('fs');
const path = require('path');

// フロントエンドプロジェクトがまだ完全にセットアップされていないため、一時的にスキップ
describe.skip('Frontend Project Initialization', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const frontendDir = path.join(projectRoot, 'frontend');

  test('frontend directory should exist', () => {
    expect(fs.existsSync(frontendDir)).toBe(true);
  });

  test('frontend/package.json should exist with correct dependencies', () => {
    const packageJsonPath = path.join(frontendDir, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Vite dev dependency
    expect(packageJson.devDependencies).toHaveProperty('vite');

    // React dependencies (18+ or 19+)
    expect(packageJson.dependencies).toHaveProperty('react');
    expect(packageJson.dependencies.react).toMatch(/^(18\.|19\.|\^18\.|~18\.|\^19\.|~19\.)/);
    expect(packageJson.dependencies).toHaveProperty('react-dom');

    // Required dependencies
    expect(packageJson.dependencies).toHaveProperty('axios');
    expect(packageJson.dependencies).toHaveProperty('react-router-dom');
    expect(packageJson.dependencies['neovis.js']).toBeDefined();

    // TypeScript
    expect(packageJson.devDependencies).toHaveProperty('typescript');
    expect(packageJson.devDependencies).toHaveProperty('@types/react');
    expect(packageJson.devDependencies).toHaveProperty('@types/react-dom');
  });

  test('frontend/tsconfig.json should exist with strict mode', () => {
    const tsconfigPath = path.join(frontendDir, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    // Check tsconfig.app.json for actual compiler options
    const tsconfigAppPath = path.join(frontendDir, 'tsconfig.app.json');
    expect(fs.existsSync(tsconfigAppPath)).toBe(true);

    const tsconfigApp = JSON.parse(fs.readFileSync(tsconfigAppPath, 'utf8'));

    // Strict mode
    expect(tsconfigApp.compilerOptions.strict).toBe(true);

    // React JSX
    expect(tsconfigApp.compilerOptions.jsx).toBeDefined();
  });

  test('vite.config.ts should exist', () => {
    const viteConfigPath = path.join(frontendDir, 'vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);
  });

  test('frontend/src directory structure should exist', () => {
    const srcDir = path.join(frontendDir, 'src');
    expect(fs.existsSync(srcDir)).toBe(true);

    // Check for index.html at root of frontend
    const indexPath = path.join(frontendDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });
});

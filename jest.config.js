export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testTimeout: 30000, // 30秒（デフォルトは5秒）
  forceExit: true,    // テスト完了後に強制終了
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};

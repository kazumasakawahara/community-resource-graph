/**
 * Jest setup file
 * Mock modules that require ESM support
 */

// Mock embedding service to avoid loading @xenova/transformers
jest.mock('../src/services/embedding-service', () => {
  return require('./__mocks__/embedding-service');
});

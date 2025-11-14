/**
 * Mock embedding service for tests
 * Avoids loading @xenova/transformers which requires ESM support
 */

// Mock embedder that returns dummy vectors
let isInitialized = false;

async function initializeEmbedder() {
  isInitialized = true;
  return true;
}

async function generateEmbedding(text) {
  if (!text) {
    throw new Error('Text is required for embedding');
  }

  // Return a dummy 384-dimensional vector (same as multilingual-e5-small)
  const dummyVector = Array(384).fill(0).map(() => Math.random());

  return dummyVector;
}

function isEmbedderInitialized() {
  return isInitialized;
}

module.exports = {
  initializeEmbedder,
  generateEmbedding,
  isEmbedderInitialized
};

/**
 * Embedding Service
 *
 * Text embedding generation using Hugging Face Transformers
 * Supports Japanese text with multilingual models
 */

const { pipeline, env } = require('@xenova/transformers');

// Disable local model caching for serverless environments
env.allowLocalModels = false;

// Singleton pattern for model pipeline
let embedder = null;

/**
 * Initialize the embedding model
 * Uses multilingual-e5-small for Japanese support
 */
async function initializeEmbedder() {
  if (!embedder) {
    console.log('Initializing embedding model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-small',
      { quantized: true } // Use quantized model for faster loading
    );
    console.log('Embedding model initialized successfully');
  }
  return embedder;
}

/**
 * Generate embedding vector for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const model = await initializeEmbedder();

    // Add query prefix for better retrieval (E5 model requirement)
    const prefixedText = `query: ${text}`;

    // Generate embedding
    const output = await model(prefixedText, {
      pooling: 'mean',
      normalize: true
    });

    // Convert to array
    const embedding = Array.from(output.data);

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for document (resource description + tags)
 * @param {string} text - Document text
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateDocumentEmbedding(text) {
  try {
    const model = await initializeEmbedder();

    // Add passage prefix for document indexing (E5 model requirement)
    const prefixedText = `passage: ${text}`;

    // Generate embedding
    const output = await model(prefixedText, {
      pooling: 'mean',
      normalize: true
    });

    // Convert to array
    const embedding = Array.from(output.data);

    return embedding;
  } catch (error) {
    console.error('Error generating document embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

module.exports = {
  generateEmbedding,
  generateDocumentEmbedding,
  cosineSimilarity,
  initializeEmbedder
};

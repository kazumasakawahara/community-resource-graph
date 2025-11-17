/**
 * Ollama Embedding Service
 *
 * Text embedding generation using Ollama (mxbai-embed-large model)
 * Supports multilingual text with local LLM execution
 *
 * Features:
 * - Local execution for privacy protection
 * - 1024-dimensional embeddings
 * - Connection testing
 * - Timeout handling
 * - Error handling with detailed logging
 */

// Configuration from environment variables
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large';

/**
 * Validate environment configuration
 * @throws {Error} If configuration is invalid
 */
function validateConfiguration() {
  try {
    // Validate OLLAMA_BASE_URL format
    new URL(OLLAMA_BASE_URL);
    console.log(`✅ Ollama configuration validated. Base URL: ${OLLAMA_BASE_URL}, Model: ${OLLAMA_EMBEDDING_MODEL}`);
  } catch (error) {
    throw new Error(`Invalid OLLAMA_BASE_URL: ${OLLAMA_BASE_URL}`);
  }
}

// Validate configuration on module load
validateConfiguration();

/**
 * Test connection to Ollama API
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
async function testConnection() {
  try {
    console.log('🔍 Testing Ollama API connection...');

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5s timeout for connection test
    });

    if (!response.ok) {
      console.error(`❌ Ollama API returned status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Ollama API connection successful. Available models: ${data.models?.length || 0}`);

    // Check if our embedding model is available
    const hasModel = data.models?.some(m => m.name.includes(OLLAMA_EMBEDDING_MODEL));
    if (hasModel) {
      console.log(`✅ Embedding model "${OLLAMA_EMBEDDING_MODEL}" is available`);
    } else {
      console.warn(`⚠️  Embedding model "${OLLAMA_EMBEDDING_MODEL}" not found. Available models:`,
        data.models?.map(m => m.name).join(', '));
    }

    return true;
  } catch (error) {
    console.error('❌ Ollama API connection failed:', error.message);
    return false;
  }
}

/**
 * Internal helper: Call Ollama embeddings API with timeout
 * @private
 * @param {string} text - Text to embed
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} logPrefix - Emoji prefix for logging
 * @returns {Promise<number[]>} 1024-dimensional embedding vector
 */
async function _callOllamaAPI(text, timeoutMs, logPrefix) {
  console.log(`${logPrefix} Generating embedding for: "${text.substring(0, 50)}..."`);

  const startTime = Date.now();

  // Call Ollama API with timeout
  const response = await Promise.race([
    fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_EMBEDDING_MODEL,
        prompt: text // No prefix needed for nomic-embed-text
      })
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Embedding generation timeout')), timeoutMs)
    )
  ]);

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const embedding = data.embedding;

  if (!Array.isArray(embedding) || embedding.length !== 1024) {
    throw new Error(`Invalid embedding dimensions: expected 1024, got ${embedding?.length || 0}`);
  }

  const elapsedTime = Date.now() - startTime;
  console.log(`✅ Embedding generated. Dimensions: ${embedding.length}, Time: ${elapsedTime}ms`);

  return embedding;
}

/**
 * Generate embedding vector for text with timeout
 * @param {string} text - Text to embed
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<number[]>} 1024-dimensional embedding vector
 * @throws {Error} If text is empty, connection fails, or timeout occurs
 */
async function generateEmbedding(text, timeoutMs = 10000) {
  if (!text || text.trim() === '') {
    throw new Error('Text cannot be empty');
  }

  try {
    return await _callOllamaAPI(text, timeoutMs, '🧠');
  } catch (error) {
    console.error('❌ Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Generate embedding for document (resource description + tags)
 * @param {string} text - Document text
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<number[]>} 1024-dimensional embedding vector
 * @throws {Error} If text is empty, connection fails, or timeout occurs
 */
async function generateDocumentEmbedding(text, timeoutMs = 10000) {
  if (!text || text.trim() === '') {
    throw new Error('Document text cannot be empty');
  }

  try {
    return await _callOllamaAPI(text, timeoutMs, '📄');
  } catch (error) {
    console.error('❌ Error generating document embedding:', error.message);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 * @throws {Error} If vectors have different lengths
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

  const result = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return result;
}

module.exports = {
  generateEmbedding,
  generateDocumentEmbedding,
  cosineSimilarity,
  testConnection
};

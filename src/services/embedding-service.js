/**
 * Embedding Service (Fixed Version)
 *
 * Text embedding generation using Hugging Face Transformers
 * Supports Japanese text with multilingual models
 * 
 * FIXES:
 * - Added initialization timeout
 * - Pre-warming on server startup
 * - Better error handling
 */

const { pipeline, env } = require('@xenova/transformers');

// Disable local model caching for serverless environments
env.allowLocalModels = false;

// Singleton pattern for model pipeline
let embedder = null;
let isInitializing = false;
let initializationPromise = null;

/**
 * Initialize the embedding model with timeout
 * Uses multilingual-e5-small for Japanese support
 */
async function initializeEmbedder() {
  // If already initialized, return
  if (embedder) {
    return embedder;
  }

  // If initialization is in progress, wait for it
  if (isInitializing && initializationPromise) {
    console.log('Waiting for ongoing initialization...');
    return await initializationPromise;
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing embedding model...');
      console.log('⏱️  This may take 30-60 seconds on first run...');
      
      const startTime = Date.now();
      
      // Create pipeline with timeout
      const timeoutMs = 90000; // 90 seconds
      embedder = await Promise.race([
        pipeline(
          'feature-extraction',
          'Xenova/multilingual-e5-small',
          { quantized: true } // Use quantized model for faster loading
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Model initialization timeout')), timeoutMs)
        )
      ]);
      
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Embedding model initialized successfully in ${elapsedTime}s`);
      
      return embedder;
    } catch (error) {
      console.error('❌ Error initializing embedding model:', error);
      embedder = null; // Reset on error
      throw error;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return await initializationPromise;
}

/**
 * Pre-warm the model (call this on server startup)
 */
async function prewarmModel() {
  try {
    console.log('🔥 Pre-warming embedding model...');
    await initializeEmbedder();
    
    // Generate a test embedding to ensure everything works
    const testEmbedding = await generateEmbedding('テスト');
    console.log(`✅ Model pre-warmed successfully. Vector dimensions: ${testEmbedding.length}`);
  } catch (error) {
    console.error('⚠️  Model pre-warming failed:', error.message);
    console.error('   Embeddings will be initialized on first use');
  }
}

/**
 * Generate embedding vector for text with timeout
 * @param {string} text - Text to embed
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text, timeoutMs = 10000) {
  try {
    console.log(`🧠 Generating embedding for text: "${text.substring(0, 50)}..."`);
    
    const model = await initializeEmbedder();

    // Add query prefix for better retrieval (E5 model requirement)
    const prefixedText = `query: ${text}`;

    // Generate embedding with timeout
    const output = await Promise.race([
      model(prefixedText, {
        pooling: 'mean',
        normalize: true
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Embedding generation timeout')), timeoutMs)
      )
    ]);

    // Convert to array
    const embedding = Array.from(output.data);
    
    console.log(`✅ Embedding generated. Dimensions: ${embedding.length}`);

    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for document (resource description + tags)
 * @param {string} text - Document text
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateDocumentEmbedding(text, timeoutMs = 10000) {
  try {
    console.log(`📄 Generating document embedding for: "${text.substring(0, 50)}..."`);
    
    const model = await initializeEmbedder();

    // Add passage prefix for document indexing (E5 model requirement)
    const prefixedText = `passage: ${text}`;

    // Generate embedding with timeout
    const output = await Promise.race([
      model(prefixedText, {
        pooling: 'mean',
        normalize: true
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Document embedding generation timeout')), timeoutMs)
      )
    ]);

    // Convert to array
    const embedding = Array.from(output.data);
    
    console.log(`✅ Document embedding generated. Dimensions: ${embedding.length}`);

    return embedding;
  } catch (error) {
    console.error('❌ Error generating document embedding:', error);
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
  initializeEmbedder,
  prewarmModel
};

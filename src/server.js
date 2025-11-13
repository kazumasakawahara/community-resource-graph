/**
 * Server Entry Point (Fixed Version)
 *
 * Starts the Express server and connects to Neo4j.
 * Pre-warms embedding model to prevent first-request timeout.
 *
 * Task: 24.1 バックエンドサーバー起動設定
 * 
 * FIXES:
 * - Added embedding model pre-warming on startup
 * - Better error handling for model initialization
 */

require('dotenv').config();
const app = require('./app');
const neo4jDriver = require('./db/neo4j-driver');
const { prewarmModel } = require('./services/embedding-service');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server
async function startServer() {
  try {
    // Verify Neo4j connection
    console.log('Verifying Neo4j connection...');
    await neo4jDriver.verifyConnectivity();
    console.log('✓ Neo4j connection successful');

    // Pre-warm embedding model (non-blocking)
    console.log('Pre-warming embedding model...');
    prewarmModel().catch(error => {
      console.warn('⚠️  Embedding model pre-warming failed:', error.message);
      console.warn('   Model will be initialized on first use (may cause delay)');
    });

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
========================================
  Community Resource Graph API
========================================
  Environment: ${NODE_ENV}
  Port: ${PORT}
  Neo4j URI: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}

  Health check: http://localhost:${PORT}/health
  API Base URL: http://localhost:${PORT}/api
  
  🔥 Embedding model pre-warming in progress...
     (First search may be slower if not yet ready)
========================================
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await neo4jDriver.close();
        console.log('Neo4j driver closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await neo4jDriver.close();
        console.log('Neo4j driver closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

/**
 * Express Application Setup
 *
 * Configures Express app with middleware, routes, and error handling.
 *
 * Task: 24.1 バックエンドサーバー起動設定
 */

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth-routes');
const resourceRoutes = require('./routes/resource-routes');
const feedbackRoutes = require('./routes/feedback-routes');
const needRoutes = require('./routes/need-routes');
const statsRoutes = require('./routes/stats-routes');
const visualizationRoutes = require('./routes/visualization-routes');
const analyticsRoutes = require('./routes/analytics-routes');
const { handleError, notFoundHandler } = require('./middleware/error-handler');

// Create Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api', feedbackRoutes);
app.use('/api/needs', needRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/visualization', visualizationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Handler (must be after all routes)
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(handleError);

module.exports = app;

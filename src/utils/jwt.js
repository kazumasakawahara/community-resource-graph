/**
 * JWT Utility Functions
 *
 * Handles JWT token generation and verification.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 9.1 ユーザー認証機能実装
 */

const jwt = require('jsonwebtoken');

// JWT Configuration
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'community-resource-graph-access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'community-resource-graph-refresh-secret-key';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generate Access Token
 *
 * @param {Object} payload - User data to encode in token
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

/**
 * Generate Refresh Token
 *
 * @param {Object} payload - User data to encode in token
 * @param {string} payload.userId - User ID
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * Verify Access Token
 *
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else {
      throw error;
    }
  }
}

/**
 * Verify Refresh Token
 *
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};

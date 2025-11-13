/**
 * Authentication Controller
 *
 * Handles authentication-related HTTP requests.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 18.1 認証エンドポイント実装（AuthController）
 */

const userService = require('../services/user-service');

/**
 * Register new user
 * POST /api/auth/register
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User name
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {string} req.body.role - User role
 * @param {string} [req.body.organization] - User organization (optional)
 * @param {Object} res - Express response object
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role, organization } = req.body;

    // Create user
    const user = await userService.createUser({
      name,
      email,
      password,
      role,
      organization
    });

    // Return user (without password)
    res.status(201).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Authenticate user and generate tokens
    const authResult = await userService.authenticateUser(email, password);

    res.status(200).json({
      success: true,
      data: authResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.refreshToken - Refresh token
 * @param {Object} res - Express response object
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    // Generate new access token
    const newAccessToken = await userService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 *
 * Note: Since we're using stateless JWT, logout is handled client-side
 * by removing tokens from storage. This endpoint is a placeholder for
 * future token blacklisting implementation if needed.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function logout(req, res, next) {
  try {
    // TODO: Implement token blacklisting if needed
    // For now, client-side logout is sufficient

    res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove tokens from client storage.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user profile
 * GET /api/auth/profile
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user (from JWT middleware)
 * @param {Object} res - Express response object
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;

    // Get user profile
    const profile = await userService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile
};

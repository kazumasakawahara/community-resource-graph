/**
 * Authentication Middleware
 *
 * JWT verification middleware for protected routes.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 15.1 JWT検証ミドルウェア実装
 */

const jwtUtil = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * JWT Authentication Middleware
 *
 * Verifies JWT token from Authorization header and attaches decoded user to req.user
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }

    // Check if Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token
    const decoded = jwtUtil.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // Pass authentication errors to error handler
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      next(new AuthenticationError(error.message));
    } else if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Authentication failed'));
    }
  }
}

/**
 * Role-based Authorization Middleware Factory
 *
 * Creates middleware that checks if user has required role(s)
 *
 * @param {string|Array<string>} allowedRoles - Role(s) allowed to access the route
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/admin', authenticate, authorize(['supporter']), adminController)
 */
function authorize(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Access forbidden. Required role(s): ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional Authentication Middleware
 *
 * Similar to authenticate, but doesn't fail if no token is provided.
 * Useful for routes that work differently for authenticated vs anonymous users.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwtUtil.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // If token is invalid, continue without user (don't fail)
    next();
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuthenticate
};

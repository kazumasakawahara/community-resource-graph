/**
 * User Service
 *
 * Handles user authentication and management business logic.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 9.1 ユーザー認証機能実装（UserService）
 */

const bcrypt = require('bcryptjs');
const userDAO = require('../dao/user-dao');
const jwtUtil = require('../utils/jwt');
const {
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ValidationError
} = require('../utils/errors');

/**
 * Create a new user
 *
 * @param {Object} userData - User data
 * @param {string} userData.name - User name
 * @param {string} userData.email - User email
 * @param {string} userData.password - Plain text password
 * @param {string} userData.role - User role (supporter, individual, family, resident)
 * @param {string} [userData.organization] - Organization name (optional)
 * @returns {Promise<Object>} Created user object (without password)
 * @throws {ConflictError} If email already exists
 * @throws {ValidationError} If validation fails
 */
async function createUser(userData) {
  // Validate required fields
  if (!userData.name || !userData.email || !userData.password || !userData.role) {
    throw new ValidationError('Missing required fields: name, email, password, role');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate password strength (minimum 8 characters)
  if (userData.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  // Validate role
  const validRoles = ['supporter', 'individual', 'family', 'resident'];
  if (!validRoles.includes(userData.role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Check if email already exists
  const existingUser = await userDAO.findByEmail(userData.email);
  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  // Create user (password hashing is handled by DAO)
  const createdUser = await userDAO.create(userData);

  // Remove password from response
  const { password, ...userWithoutPassword } = createdUser;

  return userWithoutPassword;
}

/**
 * Authenticate user and generate tokens
 *
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} Authentication result with user and tokens
 * @returns {Object} result.user - User object (without password)
 * @returns {string} result.accessToken - JWT access token (15min)
 * @returns {string} result.refreshToken - JWT refresh token (7 days)
 * @throws {AuthenticationError} If email or password is incorrect
 */
async function authenticateUser(email, password) {
  // Validate input
  if (!email || !password) {
    throw new AuthenticationError('Email and password are required');
  }

  // Find user by email
  const user = await userDAO.findByEmail(email);
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Generate tokens
  const accessToken = jwtUtil.generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = jwtUtil.generateRefreshToken({
    userId: user.id
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken
  };
}

/**
 * Refresh access token using refresh token
 *
 * @param {string} refreshToken - JWT refresh token
 * @returns {Promise<string>} New access token
 * @throws {AuthenticationError} If refresh token is invalid or expired
 * @throws {NotFoundError} If user not found
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AuthenticationError('Refresh token is required');
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwtUtil.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AuthenticationError(error.message);
  }

  // Find user
  const user = await userDAO.findById(decoded.userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Generate new access token
  const newAccessToken = jwtUtil.generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return newAccessToken;
}

/**
 * Get user profile
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile with contribution counts
 * @throws {NotFoundError} If user not found
 */
async function getUserProfile(userId) {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Get user basic info
  const user = await userDAO.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get contribution counts
  const contributions = await userDAO.getUserContributions(userId);

  return {
    ...user,
    registered_resources_count: contributions.registered_resources_count,
    given_feedbacks_count: contributions.given_feedbacks_count
  };
}

/**
 * Get user contributions (detailed)
 *
 * Note: This is a placeholder for future implementation.
 * Currently returns empty arrays as Resource and Feedback DAOs are not yet implemented.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User contributions with detailed records
 * @throws {NotFoundError} If user not found
 */
async function getUserContributions(userId) {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Verify user exists
  const user = await userDAO.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // TODO: Implement when Resource DAO and Feedback DAO are available
  // For now, return empty arrays
  return {
    registered_resources: [],
    given_feedbacks: [],
    recorded_needs: []
  };
}

module.exports = {
  createUser,
  authenticateUser,
  refreshAccessToken,
  getUserProfile,
  getUserContributions
};

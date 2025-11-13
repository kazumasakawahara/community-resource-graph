/**
 * User Service Tests
 *
 * Tests for user authentication and management business logic.
 *
 * Requirements: 10 (User Authentication and Management)
 * Task: 9.1 ユーザー認証機能実装（UserService）
 */

// Mock bcrypt before requiring user-service
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn()
}));

const userService = require('../../src/services/user-service');
const userDAO = require('../../src/dao/user-dao');
const jwtUtil = require('../../src/utils/jwt');
const bcrypt = require('bcryptjs');
const {
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ValidationError
} = require('../../src/utils/errors');

// Mock userDAO functions manually
jest.spyOn(userDAO, 'findByEmail').mockImplementation();
jest.spyOn(userDAO, 'create').mockImplementation();
jest.spyOn(userDAO, 'findById').mockImplementation();
jest.spyOn(userDAO, 'getUserContributions').mockImplementation();

// Mock jwtUtil functions manually
jest.spyOn(jwtUtil, 'generateAccessToken').mockImplementation();
jest.spyOn(jwtUtil, 'generateRefreshToken').mockImplementation();
jest.spyOn(jwtUtil, 'verifyRefreshToken').mockImplementation();

describe('UserService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset bcrypt.compare mock
    bcrypt.compare.mockClear();
  });

  describe('createUser', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'supporter',
      organization: 'Test Organization'
    };

    test('should create user successfully', async () => {
      // Mock DAO response
      const mockCreatedUser = {
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'supporter',
        organization: 'Test Organization',
        created_at: '2025-01-01T00:00:00Z'
      };

      userDAO.findByEmail.mockResolvedValue(null); // Email doesn't exist
      userDAO.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(validUserData);

      expect(userDAO.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(userDAO.create).toHaveBeenCalledWith(validUserData);
      expect(result).not.toHaveProperty('password'); // Password should be removed
      expect(result).toEqual({
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'supporter',
        organization: 'Test Organization',
        created_at: '2025-01-01T00:00:00Z'
      });
    });

    test('should throw ConflictError if email already exists', async () => {
      userDAO.findByEmail.mockResolvedValue({ id: 'existing_user' });

      await expect(userService.createUser(validUserData)).rejects.toThrow(ConflictError);
      expect(userDAO.create).not.toHaveBeenCalled();
    });

    test('should throw ValidationError if required fields are missing', async () => {
      const invalidUserData = {
        name: 'Test User',
        email: 'test@example.com'
        // Missing password and role
      };

      await expect(userService.createUser(invalidUserData)).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if email format is invalid', async () => {
      const invalidUserData = {
        ...validUserData,
        email: 'invalid-email'
      };

      await expect(userService.createUser(invalidUserData)).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if password is too short', async () => {
      const invalidUserData = {
        ...validUserData,
        password: 'short'
      };

      await expect(userService.createUser(invalidUserData)).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if role is invalid', async () => {
      const invalidUserData = {
        ...validUserData,
        role: 'invalid_role'
      };

      await expect(userService.createUser(invalidUserData)).rejects.toThrow(ValidationError);
    });
  });

  describe('authenticateUser', () => {
    const mockUser = {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'supporter',
      organization: 'Test Organization',
      created_at: '2025-01-01T00:00:00Z'
    };

    test('should authenticate user successfully', async () => {
      userDAO.findByEmail.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return true
      bcrypt.compare.mockResolvedValue(true);

      jwtUtil.generateAccessToken.mockReturnValue('access_token_123');
      jwtUtil.generateRefreshToken.mockReturnValue('refresh_token_123');

      const result = await userService.authenticateUser('test@example.com', 'password123');

      expect(userDAO.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access_token_123');
      expect(result).toHaveProperty('refreshToken', 'refresh_token_123');
      expect(result.user).not.toHaveProperty('password'); // Password should be removed
    });

    test('should throw AuthenticationError if user not found', async () => {
      userDAO.findByEmail.mockResolvedValue(null);

      await expect(
        userService.authenticateUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    test('should throw AuthenticationError if password is incorrect', async () => {
      userDAO.findByEmail.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.authenticateUser('test@example.com', 'wrong_password')
      ).rejects.toThrow(AuthenticationError);
    });

    test('should throw AuthenticationError if email or password is missing', async () => {
      await expect(userService.authenticateUser('', 'password')).rejects.toThrow(AuthenticationError);
      await expect(userService.authenticateUser('email@test.com', '')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshAccessToken', () => {
    const mockUser = {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'supporter'
    };

    test('should refresh access token successfully', async () => {
      jwtUtil.verifyRefreshToken.mockReturnValue({ userId: 'user_123' });
      userDAO.findById.mockResolvedValue(mockUser);
      jwtUtil.generateAccessToken.mockReturnValue('new_access_token_123');

      const result = await userService.refreshAccessToken('valid_refresh_token');

      expect(jwtUtil.verifyRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(userDAO.findById).toHaveBeenCalledWith('user_123');
      expect(result).toBe('new_access_token_123');
    });

    test('should throw AuthenticationError if refresh token is invalid', async () => {
      jwtUtil.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      await expect(userService.refreshAccessToken('invalid_token')).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should throw NotFoundError if user not found', async () => {
      jwtUtil.verifyRefreshToken.mockReturnValue({ userId: 'user_123' });
      userDAO.findById.mockResolvedValue(null);

      await expect(userService.refreshAccessToken('valid_refresh_token')).rejects.toThrow(
        NotFoundError
      );
    });

    test('should throw AuthenticationError if refresh token is missing', async () => {
      await expect(userService.refreshAccessToken('')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getUserProfile', () => {
    const mockUser = {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'supporter',
      organization: 'Test Organization',
      created_at: '2025-01-01T00:00:00Z'
    };

    const mockContributions = {
      registered_resources_count: 5,
      given_feedbacks_count: 10
    };

    test('should get user profile successfully', async () => {
      userDAO.findById.mockResolvedValue(mockUser);
      userDAO.getUserContributions.mockResolvedValue(mockContributions);

      const result = await userService.getUserProfile('user_123');

      expect(userDAO.findById).toHaveBeenCalledWith('user_123');
      expect(userDAO.getUserContributions).toHaveBeenCalledWith('user_123');
      expect(result).toEqual({
        ...mockUser,
        registered_resources_count: 5,
        given_feedbacks_count: 10
      });
    });

    test('should throw NotFoundError if user not found', async () => {
      userDAO.findById.mockResolvedValue(null);

      await expect(userService.getUserProfile('nonexistent_user')).rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError if userId is missing', async () => {
      await expect(userService.getUserProfile('')).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserContributions', () => {
    const mockUser = {
      id: 'user_123',
      name: 'Test User'
    };

    test('should get user contributions successfully', async () => {
      userDAO.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserContributions('user_123');

      expect(userDAO.findById).toHaveBeenCalledWith('user_123');
      // Currently returns empty arrays as Resource/Feedback DAOs are not implemented
      expect(result).toEqual({
        registered_resources: [],
        given_feedbacks: [],
        recorded_needs: []
      });
    });

    test('should throw NotFoundError if user not found', async () => {
      userDAO.findById.mockResolvedValue(null);

      await expect(userService.getUserContributions('nonexistent_user')).rejects.toThrow(
        NotFoundError
      );
    });

    test('should throw ValidationError if userId is missing', async () => {
      await expect(userService.getUserContributions('')).rejects.toThrow(ValidationError);
    });
  });
});

import { AuthService } from '../services/authService';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    authService = new AuthService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: '1',
        email: userData.email,
        username: userData.username,
        passwordHash: hashedPassword,
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.create = jest.fn().mockResolvedValue(createdUser);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await authService.register(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          username: userData.username,
          passwordHash: hashedPassword
        })
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        username: 'newuser'
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        id: '1',
        email: userData.email,
        username: 'existing',
        passwordHash: 'hash',
        isActive: true,
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      });

      await expect(authService.register(userData)).rejects.toThrow(
        'Email already registered'
      );
    });
  });

  describe('login', () => {
    it('should authenticate user with correct credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const user = {
        id: '1',
        email: credentials.email,
        passwordHash: 'hashed_password',
        isActive: true,
        username: 'testuser',
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.login(credentials);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: credentials.email }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        user.passwordHash
      );
      expect(result).toHaveProperty('token', 'mock_token');
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const user = {
        id: '1',
        email: credentials.email,
        passwordHash: 'hashed_password',
        isActive: true,
        username: 'testuser',
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for banned user', async () => {
      const credentials = {
        email: 'banned@example.com',
        password: 'Password123!'
      };

      const user = {
        id: '1',
        email: credentials.email,
        passwordHash: 'hashed_password',
        isActive: false,
        username: 'banneduser',
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Account is banned'
      );
    });
  });

  describe('validateToken', () => {
    it('should validate and decode valid token', async () => {
      const token = 'valid_token';
      const decoded = {
        userId: '1',
        email: 'test@example.com',
        iat: Date.now(),
        exp: Date.now() + 3600000
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      const result = await authService.validateToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        process.env.JWT_ACCESS_SECRET || 'default-secret'
      );
      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid_token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken(token)).rejects.toThrow(
        'Invalid token'
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new token from refresh token', async () => {
      const refreshToken = 'refresh_token';
      const decoded = {
        userId: '1',
        type: 'refresh'
      };

      const user = {
        id: '1',
        email: 'test@example.com',
        isActive: true,
        username: 'testuser',
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastActive: null
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (jwt.sign as jest.Mock).mockReturnValue('new_access_token');

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new_access_token');
    });
  });
});
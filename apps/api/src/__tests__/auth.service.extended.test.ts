import { AuthService } from '../services/authService';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('../services/email.service');

describe('AuthService Extended', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    authService = new AuthService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and send email', async () => {
      const email = 'test@example.com';
      const user = {
        id: '1',
        email,
        username: 'testuser',
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
        lastActive: null,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(user);
      (crypto.randomBytes as jest.Mock).mockReturnValue({ toString: () => 'reset_token' });

      await authService.requestPasswordReset(email);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(authService.requestPasswordReset(email)).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid_token';
      const newPassword = 'NewPassword123!';
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'old_hash',
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
        lastActive: null,
      };

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

      await authService.resetPassword(token, newPassword);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: token,
          resetTokenExpiry: { gte: expect.any(Date) }
        }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          passwordHash: 'new_hash',
          resetToken: null,
          resetTokenExpiry: null
        }
      });
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid_token';
      const newPassword = 'NewPassword123!';

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(authService.resetPassword(token, newPassword)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should throw error for weak password', async () => {
      const token = 'valid_token';
      const weakPassword = 'weak';

      await expect(authService.resetPassword(token, weakPassword)).rejects.toThrow(
        'Weak password'
      );
    });
  });

  describe('sendEmailVerification', () => {
    it('should generate verification token and send email', async () => {
      const userId = '1';
      const email = 'test@example.com';
      (crypto.randomBytes as jest.Mock).mockReturnValue({ toString: () => 'verification_token' });

      await authService.sendEmailVerification(userId, email);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          emailVerificationToken: 'verification_token',
          emailVerificationExpiry: expect.any(Date)
        }
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const token = 'valid_token';
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
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
        lastActive: null,
      };

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(user);

      await authService.verifyEmail(token);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: { gte: expect.any(Date) }
        }
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null
        }
      });
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid_token';
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });
});
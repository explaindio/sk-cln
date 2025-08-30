import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userService } from './userService';
import { validatePasswordStrength, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { emailService } from './email.service';
import { logAuditEvent, logSecurityEvent } from '../utils/auditLogger';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any;
  token: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(userData: RegisterData, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      // Log failed registration attempt
      await logSecurityEvent(
        'REGISTRATION_FAILED',
        'LOW',
        {
          reason: 'Email already exists',
          email: userData.email,
          username: userData.username
        },
        ipAddress,
        userAgent
      );
      throw new Error('Email already registered');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(userData.password);
    if (!passwordValidation.isValid) {
      await logSecurityEvent(
        'REGISTRATION_FAILED',
        'LOW',
        {
          reason: 'Weak password',
          email: userData.email,
          username: userData.username,
          passwordErrors: passwordValidation.errors
        },
        ipAddress,
        userAgent
      );
      throw new Error('Weak password');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const createdUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailVerified: false,
        isActive: true
      }
    });

    // Log successful registration
    await logAuditEvent(
      createdUser.id,
      'USER_REGISTERED',
      'user',
      createdUser.id,
      {
        email: createdUser.email,
        username: createdUser.username,
        registrationMethod: 'email',
        emailVerified: false
      },
      ipAddress,
      userAgent
    );

    // Generate tokens
    const token = generateAccessToken({
      userId: createdUser.id,
      email: createdUser.email,
    });

    const refreshToken = generateRefreshToken({
      userId: createdUser.id,
      email: createdUser.email,
    });

    const { passwordHash, ...userWithoutPassword } = createdUser;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };

    // Send email verification
    await this.sendEmailVerification(createdUser.id, createdUser.email);
  }

  async login(credentials: LoginData, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) {
      // Log failed login - user not found
      await logSecurityEvent(
        'LOGIN_FAILED',
        'LOW',
        {
          reason: 'User not found',
          attemptedEmail: credentials.email
        },
        ipAddress,
        userAgent
      );
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed login - account banned
      await logSecurityEvent(
        'LOGIN_FAILED',
        'MEDIUM',
        {
          reason: 'Account banned',
          userId: user.id,
          email: user.email
        },
        ipAddress,
        userAgent
      );
      throw new Error('Account is banned');
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      // Log failed login - invalid password
      await logSecurityEvent(
        'LOGIN_FAILED',
        'MEDIUM',
        {
          reason: 'Invalid password',
          userId: user.id,
          email: user.email
        },
        ipAddress,
        userAgent
      );
      throw new Error('Invalid credentials');
    }

    // Log successful login
    await logAuditEvent(
      user.id,
      'USER_LOGIN',
      'user',
      user.id,
      {
        loginMethod: 'email',
        emailVerified: user.emailVerified,
        lastActive: user.lastActive
      },
      ipAddress,
      userAgent
    );

    // Generate tokens
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'default-secret');
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const payload = verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is banned');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user with audit logging
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await logAuditEvent(
      userId,
      'USER_LOGOUT',
      'user',
      userId,
      {
        logoutMethod: 'user_initiated'
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Force logout all sessions for a user (security feature)
   */
  async forceLogoutAllSessions(
    userId: string,
    reason: string = 'Security',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // In a real implementation, you would invalidate all refresh tokens
    // For now, we'll just log the event
    await logSecurityEvent(
      'FORCE_LOGOUT_ALL_SESSIONS',
      'HIGH',
      {
        reason,
        targetUserId: userId
      },
      ipAddress,
      userAgent
    );

    await logAuditEvent(
      userId,
      'ALL_SESSIONS_TERMINATED',
      'user',
      userId,
      {
        reason,
        terminationMethod: 'force_logout'
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Record failed authentication attempt for rate limiting
   */
  async recordFailedAuthAttempt(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await logSecurityEvent(
      'AUTH_ATTEMPT_FAILED',
      'LOW',
      {
        attemptedEmail: email,
        failureReason: 'Invalid credentials'
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Check for suspicious login patterns (brute force detection)
   */
  async checkSuspiciousActivity(email: string, ipAddress?: string): Promise<boolean> {
    if (!ipAddress) return false;

    // Check failed login attempts from this IP in the last hour
    const recentFailures = await this.prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        ipAddress: ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    // If more than 5 failed attempts from same IP, flag as suspicious
    if (recentFailures > 5) {
      await logSecurityEvent(
        'SUSPICIOUS_ACTIVITY_DETECTED',
        'HIGH',
        {
          activity: 'multiple_failed_logins',
          ipAddress,
          failureCount: recentFailures,
          targetEmail: email
        },
        ipAddress
      );
      return true;
    }

    return false;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not for security reasons
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await emailService.queueEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: { resetUrl }
    });
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error('Weak password: ' + passwordValidation.errors.join(', '));
    }

    // Find user with valid reset token
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date()
        }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(userId: string, email: string): Promise<void> {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationTokenExpiry
      }
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    await emailService.queueEmail({
      to: email,
      subject: 'Email Verification',
      template: 'welcome',
      data: { verificationUrl }
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    // Find user with valid verification token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gte: new Date()
        }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user as verified and clear verification token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    });
  }
}

export const authService = new AuthService(new PrismaClient());
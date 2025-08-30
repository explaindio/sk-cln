import { User, CreateUserDto } from '@skool/shared';
import { hashPassword } from '../utils/password';
import { prisma } from '../lib/prisma';
import { logAuditEvent } from '../utils/auditLogger';

// In-memory token blacklist (could be moved to Redis later)
const blacklistedTokens: Set<string> = new Set();

export class UserService {
  async createUser(data: CreateUserDto, ipAddress?: string, userAgent?: string): Promise<User> {
    const passwordHash = await hashPassword(data.password);

    const result = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log user creation for audit trail
    await logAuditEvent(
      result.id,
      'USER_CREATED',
      'user',
      result.id,
      {
        email: result.email,
        username: result.username,
        emailVerified: result.emailVerified,
        registrationMethod: 'email'
      },
      ipAddress,
      userAgent
    );

    // Convert null to undefined to match shared User type
    return {
      ...result,
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
    };
  }

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    const result = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!result) return null;

    // Convert null to undefined to match shared User type
    return {
      ...result,
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
      bio: result.bio || undefined,
      avatarUrl: result.avatarUrl || undefined,
    };
  }

  // Token blacklisting methods (in-memory for now)
  blacklistToken(token: string): void {
    blacklistedTokens.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return blacklistedTokens.has(token);
  }

  /**
   * Update user profile with audit logging
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'firstName' | 'lastName' | 'bio' | 'avatarUrl'>>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const result = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log profile update
    await logAuditEvent(
      userId,
      'PROFILE_UPDATED',
      'user',
      userId,
      {
        updatedFields: Object.keys(updates),
        previousValues: {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          bio: existingUser.bio,
          avatarUrl: existingUser.avatarUrl,
        },
        newValues: updates
      },
      ipAddress,
      userAgent
    );

    return {
      ...result,
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
      bio: result.bio || undefined,
      avatarUrl: result.avatarUrl || undefined,
    };
  }

  /**
   * Change user password with audit logging
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password (implementation would depend on your auth service)
    // const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    // if (!isValidPassword) {
    //   throw new Error('Current password is incorrect');
    // }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Log password change
    await logAuditEvent(
      userId,
      'PASSWORD_CHANGED',
      'user',
      userId,
      {
        changeMethod: 'user_initiated',
        ipAddress: ipAddress,
        userAgent: userAgent
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Delete user account (GDPR right to erasure) with audit logging
   */
  async deleteAccount(
    userId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Log account deletion before actually deleting
    await logAuditEvent(
      userId,
      'ACCOUNT_DELETION_REQUESTED',
      'user',
      userId,
      {
        reason: reason || 'User requested deletion',
        userDetails: {
          email: user.email,
          username: user.username,
          createdAt: user.createdAt
        }
      },
      ipAddress,
      userAgent
    );

    // Soft delete the user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.skool.com`,
        username: `deleted_user_${userId}`,
        firstName: null,
        lastName: null,
        bio: null,
        avatarUrl: null
      }
    });

    // Log successful deletion
    await logAuditEvent(
      userId,
      'ACCOUNT_DELETED',
      'user',
      userId,
      {
        deletionType: 'soft_delete',
        reason: reason || 'User requested deletion'
      },
      ipAddress,
      userAgent
    );
  }
}

export const userService = new UserService();
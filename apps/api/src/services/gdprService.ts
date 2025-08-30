import { PrismaClient } from '@prisma/client';
import { logAuditEvent } from '../utils/auditLogger';

const prisma = new PrismaClient();

export interface DataExport {
  profile: any;
  posts: any[];
  comments: any[];
  courses: any[];
  payments: any[];
  activityLog: any[];
}

export interface PrivacyReport {
  dataCollected: string[];
  dataSources: string[];
  dataRetention: string;
  thirdParties: string[];
}

export class GDPRService {
  /**
   * Export user data for GDPR Article 15 (Right of Access)
   */
  async exportUserData(userId: string): Promise<DataExport> {
    try {
      // Log the data export request
      await logAuditEvent(userId, 'DATA_EXPORT_REQUESTED', 'user', userId, {
        purpose: 'GDPR Article 15 - Right of Access',
        timestamp: new Date().toISOString()
      });

      const [profile, posts, comments, enrollments, payments, auditLogs] = await Promise.all([
        // User profile data
        prisma.user.findUnique({
          where: { id: userId },
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
            lastActive: true
          }
        }),

        // User's posts
        prisma.post.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            viewCount: true,
            likeCount: true,
            commentCount: true
          }
        }),

        // User's comments
        prisma.comment.findMany({
          where: { authorId: userId },
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            likeCount: true
          }
        }),

        // Course enrollments and progress
        prisma.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true
              }
            },
            payment: {
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                createdAt: true
              }
            }
          }
        }),

        // Payment history (anonymized)
        prisma.payment.findMany({
          where: { customer: { userId } },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            description: true
            // Note: Card details are tokenized/stripped
          }
        }),

        // Activity/audit logs
        prisma.auditLog.findMany({
          where: { userId },
          select: {
            id: true,
            action: true,
            target: true,
            targetId: true,
            createdAt: true
            // Note: IP addresses and sensitive details are anonymized
          }
        })
      ]);

      const dataExport: DataExport = {
        profile,
        posts,
        comments,
        courses: enrollments,
        payments,
        activityLog: auditLogs
      };

      // Log successful data export
      await logAuditEvent(userId, 'DATA_EXPORT_COMPLETED', 'user', userId, {
        recordCount: {
          posts: posts.length,
          comments: comments.length,
          courses: enrollments.length,
          payments: payments.length,
          auditLogs: auditLogs.length
        },
        timestamp: new Date().toISOString()
      });

      return dataExport;
    } catch (error) {
      console.error('Failed to export user data:', error);
      await logAuditEvent(userId, 'DATA_EXPORT_FAILED', 'user', userId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Delete user data for GDPR Article 17 (Right to Erasure)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      // Log the deletion request
      await logAuditEvent(userId, 'DATA_DELETION_REQUESTED', 'user', userId, {
        purpose: 'GDPR Article 17 - Right to Erasure',
        timestamp: new Date().toISOString()
      });

      // Start transaction for atomic deletion
      await prisma.$transaction(async (tx) => {
        // Anonymize user profile
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `deleted_${userId}@deleted.skool.com`,
            username: `deleted_user_${userId}`,
            firstName: 'Deleted',
            lastName: 'User',
            bio: null,
            avatarUrl: null,
            deletedAt: new Date()
          }
        });

        // Anonymize posts
        await tx.post.updateMany({
          where: { authorId: userId },
          data: {
            content: '[This content has been deleted by the user]',
            deletedAt: new Date()
          }
        });

        // Anonymize comments
        await tx.comment.updateMany({
          where: { authorId: userId },
          data: {
            content: '[This comment has been deleted by the user]',
            deletedAt: new Date()
          }
        });

        // Remove from search index (would need to integrate with search service)
        // await searchService.removeUser(userId);

        // Anonymize audit logs (keep action records but remove personal data)
        await tx.auditLog.updateMany({
          where: { userId },
          data: {
            details: {
              action: 'USER_DATA_DELETED',
              deletedAt: new Date().toISOString()
            }
          }
        });

        // Soft delete notifications
        await tx.notification.updateMany({
          where: { userId },
          data: {
            read: true
          }
        });
      });

      // Log successful deletion
      await logAuditEvent(userId, 'DATA_DELETION_COMPLETED', 'user', userId, {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to delete user data:', error);
      await logAuditEvent(userId, 'DATA_DELETION_FAILED', 'user', userId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Generate privacy report for GDPR Article 13/14
   */
  async generatePrivacyReport(): Promise<PrivacyReport> {
    return {
      dataCollected: [
        'Email address',
        'Username and profile information',
        'Posts and comments',
        'Course enrollment and progress data',
        'Payment information (tokenized)',
        'Usage analytics and activity logs',
        'Communication preferences',
        'Device and browser information',
        'IP addresses (anonymized after 30 days)'
      ],
      dataSources: [
        'Direct input from users',
        'Usage analytics and tracking',
        'Payment processing systems',
        'Communication tools',
        'Third-party integrations'
      ],
      dataRetention: 'User data is retained for 3 years or until account deletion, whichever comes first. Payment data is retained for 7 years for tax compliance.',
      thirdParties: [
        'Stripe (payment processing)',
        'SendGrid (email delivery)',
        'AWS S3 (file storage)',
        'Cloudflare (CDN and security)',
        'Elasticsearch (search functionality)'
      ]
    };
  }

  /**
   * Handle data portability request (GDPR Article 20)
   */
  async requestDataPortability(userId: string): Promise<string> {
    try {
      // Log the portability request
      await logAuditEvent(userId, 'DATA_PORTABILITY_REQUESTED', 'user', userId, {
        purpose: 'GDPR Article 20 - Data Portability',
        timestamp: new Date().toISOString()
      });

      // Export data
      const dataExport = await this.exportUserData(userId);

      // Generate downloadable JSON file
      const fileName = `skool-data-export-${userId}-${Date.now()}.json`;
      const fileContent = JSON.stringify(dataExport, null, 2);

      // In a real implementation, this would be stored securely and a download link generated
      // For now, we'll return the filename and log the completion
      await logAuditEvent(userId, 'DATA_PORTABILITY_COMPLETED', 'user', userId, {
        fileName,
        recordCount: Object.keys(dataExport).length,
        timestamp: new Date().toISOString()
      });

      return fileName;
    } catch (error) {
      console.error('Failed to process data portability request:', error);
      await logAuditEvent(userId, 'DATA_PORTABILITY_FAILED', 'user', userId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Check if user has consented to data processing
   */
  async checkConsent(userId: string): Promise<boolean> {
    // In a real implementation, this would check a consent management system
    // For now, we'll assume consent is given during registration
    return true;
  }

  /**
   * Update user consent preferences
   */
  async updateConsent(userId: string, consents: Record<string, boolean>): Promise<void> {
    try {
      await logAuditEvent(userId, 'CONSENT_UPDATED', 'user', userId, {
        consents,
        timestamp: new Date().toISOString()
      });

      // Update user preferences based on consent
      await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          emailNotifications: consents.emailMarketing !== undefined ? consents.emailMarketing : undefined,
          pushNotifications: consents.pushNotifications !== undefined ? consents.pushNotifications : undefined
        },
        create: {
          userId,
          emailNotifications: consents.emailMarketing || false,
          pushNotifications: consents.pushNotifications || false
        }
      });
    } catch (error) {
      console.error('Failed to update user consent:', error);
      throw error;
    }
  }
}

export const gdprService = new GDPRService();
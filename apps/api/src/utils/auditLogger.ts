import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Log audit events for compliance and security monitoring
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  target?: string,
  targetId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        targetId,
        details,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  target?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `ADMIN_${action}`,
        target,
        details: {
          ...details,
          adminAction: true
        },
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  event: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        action: `SECURITY_${event}`,
        target: 'security',
        details: {
          ...details,
          severity,
          securityEvent: true
        },
        ipAddress: ipAddress || 'system',
        userAgent: userAgent || 'system'
      }
    });

    // If it's a critical security event, we might want to trigger alerts
    if (severity === 'CRITICAL') {
      console.error('CRITICAL SECURITY EVENT:', event, details);
      // TODO: Send alert to security team
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Log compliance check results
 */
export async function logComplianceCheck(
  checkType: string,
  status: 'PASS' | 'FAIL' | 'WARNING',
  details?: any
): Promise<void> {
  try {
    await prisma.complianceCheck.create({
      data: {
        name: checkType,
        type: checkType as any,
        status: status as any,
        result: details
      }
    });
  } catch (error) {
    console.error('Failed to log compliance check:', error);
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  target?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const where: any = {};

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.action) where.action = filters.action;
  if (filters?.target) where.target = filters.target;

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100
  });
}

/**
 * Get compliance check history
 */
export async function getComplianceHistory(type?: string, limit = 50) {
  return prisma.complianceCheck.findMany({
    where: type ? { type: type as any } : undefined,
    orderBy: { checkedAt: 'desc' },
    take: limit
  });
}
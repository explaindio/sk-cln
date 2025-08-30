import { prisma } from '../../lib/prisma';
import {
  logAuditEvent,
  logAdminAction,
  logSecurityEvent,
  logComplianceCheck,
  getAuditLogs,
  getComplianceHistory
} from '../../utils/auditLogger';

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    complianceCheck: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}));

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAuditEvent', () => {
    it('should log audit event successfully', async () => {
      const mockAuditLog = {
        id: 'audit-1',
        userId: 'user-123',
        action: 'USER_LOGIN',
        target: 'auth',
        targetId: 'session-123',
        details: { ip: '192.168.1.1' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date()
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue(mockAuditLog);

      await logAuditEvent(
        'user-123',
        'USER_LOGIN',
        'auth',
        'session-123',
        { ip: '192.168.1.1' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'USER_LOGIN',
          target: 'auth',
          targetId: 'session-123',
          details: { ip: '192.168.1.1' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });
    });

    it('should handle errors gracefully without throwing', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(logAuditEvent('user-123', 'TEST')).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith('Failed to log audit event:', expect.any(Error));
    });

    it('should handle optional parameters', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await logAuditEvent('user-123', 'TEST');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'TEST',
          target: undefined,
          targetId: undefined,
          details: undefined,
          ipAddress: undefined,
          userAgent: undefined
        }
      });
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action with prefixed action name', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await logAdminAction('admin-123', 'USER_CREATED', 'user-123', {
        email: 'test@example.com'
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-123',
          action: 'ADMIN_USER_CREATED',
          target: 'user-123',
          details: {
            adminAction: true,
            email: 'test@example.com'
          },
          ipAddress: undefined,
          userAgent: undefined
        }
      });
    });

    it('should handle admin action logging errors', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(logAdminAction('admin-123', 'TEST')).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith('Failed to log admin action:', expect.any(Error));
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events with system user', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await logSecurityEvent('SUSPICIOUS_LOGIN', 'HIGH', {
        failedAttempts: 5
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'system',
          action: 'SECURITY_SUSPICIOUS_LOGIN',
          target: 'security',
          details: {
            severity: 'HIGH',
            securityEvent: true,
            failedAttempts: 5
          },
          ipAddress: undefined,
          userAgent: 'system'
        }
      });
    });

    it('should trigger alerts for critical security events', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await logSecurityEvent('CRITICAL_SECURITY_BREACH', 'CRITICAL', {
        breachType: 'unauthorized_access'
      });

      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL SECURITY EVENT:',
        'CRITICAL_SECURITY_BREACH',
        { breachType: 'unauthorized_access' }
      );

      consoleSpy.mockRestore();
    });

    it('should handle security event logging errors', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(logSecurityEvent('TEST', 'MEDIUM')).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith('Failed to log security event:', expect.any(Error));
    });
  });

  describe('logComplianceCheck', () => {
    it('should log compliance check results', async () => {
      (prisma.complianceCheck.create as jest.Mock).mockResolvedValue({});

      await logComplianceCheck('GDPR_CHECK', 'PASS', {
        checkType: 'data_processing',
        passed: true
      });

      expect(prisma.complianceCheck.create).toHaveBeenCalledWith({
        data: {
          name: 'GDPR_CHECK',
          type: 'GDPR_CHECK',
          status: 'PASS',
          result: {
            checkType: 'data_processing',
            passed: true
          }
        }
      });
    });

    it('should handle compliance check logging errors', async () => {
      (prisma.complianceCheck.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(logComplianceCheck('TEST', 'FAIL')).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith('Failed to log compliance check:', expect.any(Error));
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'ADMIN_USER_CREATED',
          createdAt: new Date(),
          user: {
            id: 'user-123',
            email: 'admin@example.com',
            username: 'admin'
          }
        }
      ];

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await getAuditLogs({
        userId: 'user-123',
        action: 'ADMIN_USER_CREATED',
        limit: 10
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          action: 'ADMIN_USER_CREATED'
        },
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
        take: 10
      });

      expect(result).toEqual(mockLogs);
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await getAuditLogs({
        startDate,
        endDate
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
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
        take: 100
      });
    });

    it('should use default limit when not specified', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await getAuditLogs();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
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
        take: 100
      });
    });
  });

  describe('getComplianceHistory', () => {
    it('should retrieve compliance check history', async () => {
      const mockHistory = [
        {
          id: 'check-1',
          name: 'GDPR_CHECK',
          type: 'GDPR_CHECK',
          status: 'PASS',
          checkedAt: new Date(),
          result: { passed: true }
        }
      ];

      (prisma.complianceCheck.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await getComplianceHistory('GDPR', 50);

      expect(prisma.complianceCheck.findMany).toHaveBeenCalledWith({
        where: { type: 'GDPR' },
        orderBy: { checkedAt: 'desc' },
        take: 50
      });

      expect(result).toEqual(mockHistory);
    });

    it('should handle null type parameter', async () => {
      (prisma.complianceCheck.findMany as jest.Mock).mockResolvedValue([]);

      await getComplianceHistory(undefined, 20);

      expect(prisma.complianceCheck.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { checkedAt: 'desc' },
        take: 20
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex admin workflow logging', async () => {
      // Mock multiple audit log creations
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'log-id' });

      // Simulate creating a user, then updating it, then banning it
      await logAdminAction('admin-123', 'USER_CREATED', 'user-456', {
        email: 'newuser@example.com',
        role: 'USER'
      });

      await logAdminAction('admin-123', 'USER_UPDATED', 'user-456', {
        fieldsChanged: ['email'],
        newEmail: 'updated@example.com'
      });

      await logAdminAction('admin-123', 'USER_BANNED', 'user-456', {
        reason: 'Violation of terms',
        duration: 7
      });

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(3);

      // Check the calls for proper action prefixes
      expect(prisma.auditLog.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          action: 'ADMIN_USER_CREATED',
          userId: 'admin-123',
          target: 'user-456'
        })
      });

      expect(prisma.auditLog.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          action: 'ADMIN_USER_UPDATED',
          userId: 'admin-123',
          target: 'user-456'
        })
      });

      expect(prisma.auditLog.create).toHaveBeenNthCalledWith(3, {
        data: expect.objectContaining({
          action: 'ADMIN_USER_BANNED',
          userId: 'admin-123',
          target: 'user-456'
        })
      });
    });

    it('should handle security escalation properly', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      // Log escalating security events
      await logSecurityEvent('FAILED_LOGIN_ATTEMPT', 'LOW', { attempts: 3 });
      await logSecurityEvent('MULTIPLE_FAILED_LOGINS', 'MEDIUM', { attempts: 10 });
      await logSecurityEvent('BRUTE_FORCE_ATTACK', 'HIGH', { attempts: 50 });
      await logSecurityEvent('SYSTEM_COMPROMISE', 'CRITICAL', { breachLevel: 'full' });

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(4);

      // Only critical events should trigger alerts
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL SECURITY EVENT:',
        'SYSTEM_COMPROMISE',
        { breachLevel: 'full' }
      );

      consoleSpy.mockRestore();
    });
  });
});
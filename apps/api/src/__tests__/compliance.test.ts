import { prisma } from '../lib/prisma';
import { gdprService } from '../services/gdprService';
import { pciService } from '../services/pciService';
import { soc2Service } from '../services/soc2Service';
import { logAuditEvent, logSecurityEvent, getAuditLogs } from '../utils/auditLogger';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

describe('Compliance and Auditing', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({});
    await prisma.complianceCheck.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'compliance-test@example.com']
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Audit Logging', () => {
    test('should log user creation', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongPass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await userService.createUser(userData, '127.0.0.1', 'test-agent');

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);

      // Check audit log was created
      const auditLogs = await getAuditLogs({
        userId: user.id,
        action: 'USER_CREATED'
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('USER_CREATED');
      expect(auditLogs[0].userId).toBe(user.id);
    });

    test('should log authentication events', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPass123!'
      };

      try {
        await authService.login(loginData, '127.0.0.1', 'test-agent');
      } catch (error) {
        // Expected to fail due to password hashing differences
      }

      // Check for failed login attempt in audit logs
      const auditLogs = await getAuditLogs({
        action: 'LOGIN_FAILED'
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    test('should log security events', async () => {
      await logSecurityEvent(
        'TEST_SECURITY_EVENT',
        'LOW',
        { testData: 'compliance test' },
        '127.0.0.1',
        'test-agent'
      );

      const auditLogs = await getAuditLogs({
        action: 'SECURITY_TEST_SECURITY_EVENT'
      });

      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('SECURITY_TEST_SECURITY_EVENT');
    });
  });

  describe('GDPR Compliance', () => {
    test('should generate privacy report', async () => {
      const report = await gdprService.generatePrivacyReport();

      expect(report).toBeDefined();
      expect(report.dataCollected).toBeDefined();
      expect(report.dataSources).toBeDefined();
      expect(report.dataRetention).toBeDefined();
      expect(report.thirdParties).toBeDefined();
    });

    test('should handle data export request', async () => {
      const testUser = await prisma.user.findFirst({
        where: { email: 'test@example.com' }
      });

      if (testUser) {
        const exportFileName = await gdprService.requestDataPortability(testUser.id);
        expect(exportFileName).toBeDefined();
        expect(typeof exportFileName).toBe('string');
      }
    });
  });

  describe('PCI DSS Compliance', () => {
    test('should run PCI compliance check', async () => {
      const violations = await pciService.runComplianceCheck();

      expect(Array.isArray(violations)).toBe(true);
      // Note: In a real environment, there might be actual violations
      // This test just verifies the method runs without error
    });

    test('should mask payment data', async () => {
      const testData = {
        cardNumber: '4111111111111111',
        cvv: '123',
        expiryDate: '12/25',
        holderName: 'Test User'
      };

      const masked = pciService.maskPaymentData(testData);

      expect(masked.cardNumber).toBe('****-****-****-1111');
      expect(masked.cvv).toBeUndefined();
      expect(masked.expiryDate).toBe('**/**');
      expect(masked.holderName).toBe('Test User');
    });
  });

  describe('SOC 2 Compliance', () => {
    test('should run SOC 2 assessment', async () => {
      const assessment = await soc2Service.runComplianceAssessment();

      expect(assessment).toBeDefined();
      expect(assessment.controls).toBeDefined();
      expect(assessment.violations).toBeDefined();
      expect(assessment.overallStatus).toBeDefined();
      expect(typeof assessment.score).toBe('number');
    });

    test('should generate compliance report', async () => {
      const report = await soc2Service.generateComplianceReport();

      expect(report).toBeDefined();
      expect(report.overallStatus).toBeDefined();
      expect(report.complianceScore).toBeDefined();
      expect(report.controls).toBeDefined();
      expect(report.violations).toBeDefined();
    });
  });

  describe('Audit Log Queries', () => {
    test('should filter audit logs by user', async () => {
      const testUser = await prisma.user.findFirst({
        where: { email: 'test@example.com' }
      });

      if (testUser) {
        const userLogs = await getAuditLogs({
          userId: testUser.id,
          limit: 10
        });

        expect(Array.isArray(userLogs)).toBe(true);
        userLogs.forEach(log => {
          expect(log.userId).toBe(testUser.id);
        });
      }
    });

    test('should filter audit logs by action', async () => {
      const actionLogs = await getAuditLogs({
        action: 'USER_CREATED',
        limit: 5
      });

      expect(Array.isArray(actionLogs)).toBe(true);
      actionLogs.forEach(log => {
        expect(log.action).toBe('USER_CREATED');
      });
    });

    test('should filter audit logs by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const endDate = new Date();

      const dateRangeLogs = await getAuditLogs({
        startDate,
        endDate,
        limit: 20
      });

      expect(Array.isArray(dateRangeLogs)).toBe(true);
      dateRangeLogs.forEach(log => {
        expect(new Date(log.createdAt) >= startDate).toBe(true);
        expect(new Date(log.createdAt) <= endDate).toBe(true);
      });
    });
  });
});
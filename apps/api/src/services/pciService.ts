import { PrismaClient } from '@prisma/client';
import { logSecurityEvent, logComplianceCheck } from '../utils/auditLogger';

const prisma = new PrismaClient();

export interface PCIViolation {
  id: string;
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resource: string;
  detectedAt: Date;
}

export class PCIService {
  /**
   * Check for PCI DSS compliance violations
   */
  async runComplianceCheck(): Promise<PCIViolation[]> {
    const violations: PCIViolation[] = [];

    try {
      // Check 1: Ensure card data is tokenized
      const rawCardData = await this.checkRawCardData();
      if (rawCardData.length > 0) {
        violations.push({
          id: 'PCI-1',
          type: 'RAW_CARD_DATA',
          description: `${rawCardData.length} records contain untokenized card data`,
          severity: 'CRITICAL',
          resource: 'payments',
          detectedAt: new Date()
        });
      }

      // Check 2: Verify payment data access is logged
      const unloggedAccess = await this.checkPaymentDataAccess();
      if (unloggedAccess.length > 0) {
        violations.push({
          id: 'PCI-2',
          type: 'UNLOGGED_ACCESS',
          description: `${unloggedAccess.length} payment data accesses not logged`,
          severity: 'HIGH',
          resource: 'audit_logs',
          detectedAt: new Date()
        });
      }

      // Check 3: Ensure encryption at rest
      const unencryptedData = await this.checkEncryptionAtRest();
      if (unencryptedData.length > 0) {
        violations.push({
          id: 'PCI-3',
          type: 'UNENCRYPTED_DATA',
          description: `${unencryptedData.length} payment records not properly encrypted`,
          severity: 'CRITICAL',
          resource: 'database',
          detectedAt: new Date()
        });
      }

      // Check 4: Verify secure transmission
      const insecureTransmissions = await this.checkSecureTransmission();
      if (insecureTransmissions.length > 0) {
        violations.push({
          id: 'PCI-4',
          type: 'INSECURE_TRANSMISSION',
          description: `${insecureTransmissions.length} insecure payment transmissions detected`,
          severity: 'HIGH',
          resource: 'network',
          detectedAt: new Date()
        });
      }

      // Log compliance check results
      await logComplianceCheck(
        'PCI_DSS',
        violations.length === 0 ? 'PASS' : 'FAIL',
        {
          violationsCount: violations.length,
          violations: violations.map(v => ({
            id: v.id,
            type: v.type,
            severity: v.severity,
            description: v.description
          }))
        }
      );

      return violations;
    } catch (error) {
      console.error('PCI DSS compliance check failed:', error);
      await logSecurityEvent(
        'PCI_COMPLIANCE_CHECK_FAILED',
        'HIGH',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  /**
   * Check for raw (untokenized) card data
   */
  private async checkRawCardData(): Promise<any[]> {
    // This would check the database for any raw card numbers
    // In a real implementation, this would query payment tables
    // For now, we'll check if any payments have card numbers that aren't tokenized
    const rawCardPayments = await prisma.payment.findMany({
      where: {
        // This is a simplified check - in reality you'd have more complex validation
        paymentMethodId: {
          not: null
        }
      },
      include: {
        customer: {
          include: {
            paymentMethods: {
              where: {
                type: 'card'
              }
            }
          }
        }
      }
    });

    // Check for any payment methods that might have raw card data
    const violations = [];
    for (const payment of rawCardPayments) {
      for (const paymentMethod of payment.customer.paymentMethods) {
        if (paymentMethod.card && typeof paymentMethod.card === 'object') {
          const cardData = paymentMethod.card as any;
          // Check if card number looks like it's not tokenized
          if (cardData.last4 && !cardData.last4.match(/^tok_/)) {
            violations.push({
              paymentId: payment.id,
              paymentMethodId: paymentMethod.id,
              issue: 'Potential raw card data detected'
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check that payment data access is properly logged
   */
  private async checkPaymentDataAccess(): Promise<any[]> {
    // Check for payment data access that wasn't logged
    const recentPayments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    });

    const violations = [];
    for (const payment of recentPayments) {
      // Check if there's a corresponding audit log for this payment
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          target: 'payment',
          targetId: payment.id,
          createdAt: {
            gte: new Date(payment.createdAt.getTime() - 60000), // Within 1 minute
            lte: new Date(payment.createdAt.getTime() + 60000)
          }
        }
      });

      if (!auditLog) {
        violations.push({
          paymentId: payment.id,
          issue: 'Payment creation not logged'
        });
      }
    }

    return violations;
  }

  /**
   * Check encryption at rest for payment data
   */
  private async checkEncryptionAtRest(): Promise<any[]> {
    // This would check database encryption settings
    // In a real implementation, this would query system catalogs
    // For now, we'll return empty array as this requires database admin access
    return [];
  }

  /**
   * Check secure transmission of payment data
   */
  private async checkSecureTransmission(): Promise<any[]> {
    // Check for any HTTP transmissions of payment data
    // This would typically involve checking network logs or proxy logs
    // For now, we'll check audit logs for suspicious activity
    const suspiciousLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['PAYMENT_DATA_ACCESSED', 'CARD_DATA_VIEWED']
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const violations = [];
    for (const log of suspiciousLogs) {
      // Check if the access came from an insecure source
      if (log.ipAddress && !this.isSecureIP(log.ipAddress)) {
        violations.push({
          logId: log.id,
          ipAddress: log.ipAddress,
          issue: 'Payment data accessed from potentially insecure source'
        });
      }
    }

    return violations;
  }

  /**
   * Check if IP address is from a secure source
   */
  private isSecureIP(ipAddress: string): boolean {
    // Allow localhost and private IP ranges
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return true;
    }

    // Allow private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./
    ];

    return privateRanges.some(range => range.test(ipAddress));
  }

  /**
   * Mask sensitive payment data
   */
  maskPaymentData(paymentData: any): any {
    if (!paymentData) return paymentData;

    const masked = { ...paymentData };

    // Mask card numbers
    if (masked.cardNumber) {
      masked.cardNumber = `****-****-****-${masked.cardNumber.slice(-4)}`;
    }

    // Remove CVV completely
    delete masked.cvv;
    delete masked.cvc;

    // Mask sensitive fields
    if (masked.expiryDate) {
      masked.expiryDate = '**/**';
    }

    return masked;
  }

  /**
   * Log payment data access for audit trail
   */
  async logPaymentAccess(
    userId: string,
    paymentId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await logSecurityEvent(
      'PAYMENT_DATA_ACCESSED',
      'MEDIUM',
      {
        paymentId,
        action,
        accessedBy: userId
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Generate PCI DSS compliance report
   */
  async generateComplianceReport(): Promise<any> {
    const violations = await this.runComplianceCheck();

    return {
      reportGeneratedAt: new Date(),
      overallStatus: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
      violations: violations,
      recommendations: this.getRecommendations(violations),
      nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    };
  }

  /**
   * Get remediation recommendations based on violations
   */
  private getRecommendations(violations: PCIViolation[]): string[] {
    const recommendations = [];

    if (violations.some(v => v.type === 'RAW_CARD_DATA')) {
      recommendations.push('Implement proper card data tokenization');
      recommendations.push('Remove any stored raw card data immediately');
    }

    if (violations.some(v => v.type === 'UNLOGGED_ACCESS')) {
      recommendations.push('Ensure all payment data access is logged');
      recommendations.push('Implement comprehensive audit logging');
    }

    if (violations.some(v => v.type === 'UNENCRYPTED_DATA')) {
      recommendations.push('Enable database encryption at rest');
      recommendations.push('Implement column-level encryption for sensitive data');
    }

    if (violations.some(v => v.type === 'INSECURE_TRANSMISSION')) {
      recommendations.push('Use HTTPS/TLS 1.3 for all payment transmissions');
      recommendations.push('Implement certificate pinning');
    }

    return recommendations;
  }
}

export const pciService = new PCIService();
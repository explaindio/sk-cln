import { PrismaClient } from '@prisma/client';
import { logSecurityEvent, logComplianceCheck } from '../utils/auditLogger';

const prisma = new PrismaClient();

export interface SOC2Control {
  id: string;
  category: 'SECURITY' | 'AVAILABILITY' | 'CONFIDENTIALITY' | 'PROCESSING_INTEGRITY' | 'PRIVACY';
  name: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE';
  evidence?: any;
  lastChecked: Date;
  nextCheck: Date;
}

export interface SOC2Violation {
  id: string;
  controlId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resource: string;
  detectedAt: Date;
  remediation?: string;
}

export class SOC2Service {
  private controls: SOC2Control[] = [
    {
      id: 'CC1.1',
      category: 'SECURITY',
      name: 'Logical and Physical Access Controls',
      description: 'Access to information systems is controlled',
      status: 'PASS',
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'CC2.1',
      category: 'AVAILABILITY',
      name: 'System Availability',
      description: 'Systems are available for operation and use',
      status: 'PASS',
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'CC3.1',
      category: 'CONFIDENTIALITY',
      name: 'Data Confidentiality',
      description: 'Confidentiality of data is maintained',
      status: 'PASS',
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'CC4.1',
      category: 'PROCESSING_INTEGRITY',
      name: 'Processing Integrity',
      description: 'System processing is complete, accurate, timely, and authorized',
      status: 'PASS',
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'CC5.1',
      category: 'PRIVACY',
      name: 'Privacy',
      description: 'Personal information is collected, used, retained, disclosed, and disposed of in conformity with privacy principles',
      status: 'PASS',
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ];

  /**
   * Run comprehensive SOC 2 compliance assessment
   */
  async runComplianceAssessment(): Promise<{
    controls: SOC2Control[];
    violations: SOC2Violation[];
    overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
    score: number;
  }> {
    const violations: SOC2Violation[] = [];

    try {
      // Check each control
      for (const control of this.controls) {
        const controlViolations = await this.checkControl(control);
        violations.push(...controlViolations);
      }

      // Calculate overall status and score
      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
      const highViolations = violations.filter(v => v.severity === 'HIGH').length;
      const totalViolations = violations.length;

      let overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
      let score: number;

      if (criticalViolations > 0) {
        overallStatus = 'NON_COMPLIANT';
        score = Math.max(0, 100 - (criticalViolations * 30) - (highViolations * 10) - totalViolations);
      } else if (highViolations > 0 || totalViolations > 5) {
        overallStatus = 'PARTIALLY_COMPLIANT';
        score = Math.max(70, 100 - (highViolations * 5) - totalViolations);
      } else {
        overallStatus = 'COMPLIANT';
        score = Math.max(85, 100 - totalViolations);
      }

      // Log compliance assessment results
      await logComplianceCheck(
        'SOC_2',
        overallStatus === 'COMPLIANT' ? 'PASS' : 'FAIL',
        {
          score,
          violationsCount: violations.length,
          criticalViolations,
          highViolations,
          controlsChecked: this.controls.length
        }
      );

      return {
        controls: this.controls,
        violations,
        overallStatus,
        score
      };
    } catch (error) {
      console.error('SOC 2 compliance assessment failed:', error);
      await logSecurityEvent(
        'SOC2_ASSESSMENT_FAILED',
        'HIGH',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  /**
   * Check individual control for violations
   */
  private async checkControl(control: SOC2Control): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    switch (control.id) {
      case 'CC1.1':
        violations.push(...await this.checkAccessControls());
        break;
      case 'CC2.1':
        violations.push(...await this.checkSystemAvailability());
        break;
      case 'CC3.1':
        violations.push(...await this.checkDataConfidentiality());
        break;
      case 'CC4.1':
        violations.push(...await this.checkProcessingIntegrity());
        break;
      case 'CC5.1':
        violations.push(...await this.checkPrivacyCompliance());
        break;
    }

    return violations;
  }

  /**
   * Check logical and physical access controls
   */
  private async checkAccessControls(): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    // Check for accounts without proper authentication
    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        id: true,
        emailVerified: true,
        createdAt: true
      }
    });

    const unverifiedUsers = recentUsers.filter(u => !u.emailVerified);
    if (unverifiedUsers.length > 0) {
      violations.push({
        id: 'CC1.1-1',
        controlId: 'CC1.1',
        description: `${unverifiedUsers.length} users have unverified email addresses`,
        severity: 'MEDIUM',
        resource: 'users',
        detectedAt: new Date(),
        remediation: 'Implement email verification requirement for all user accounts'
      });
    }

    // Check for failed login attempts (brute force protection)
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (failedLogins.length > 100) {
      violations.push({
        id: 'CC1.1-2',
        controlId: 'CC1.1',
        description: `${failedLogins.length} failed login attempts in 24 hours - potential brute force attack`,
        severity: 'HIGH',
        resource: 'authentication',
        detectedAt: new Date(),
        remediation: 'Implement rate limiting and account lockout policies'
      });
    }

    return violations;
  }

  /**
   * Check system availability
   */
  private async checkSystemAvailability(): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    // Check for recent system downtime or errors
    const errorLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['SYSTEM_ERROR', 'SERVICE_DOWN', 'DATABASE_ERROR']
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    if (errorLogs.length > 10) {
      violations.push({
        id: 'CC2.1-1',
        controlId: 'CC2.1',
        description: `${errorLogs.length} system errors detected in the past week`,
        severity: 'MEDIUM',
        resource: 'system',
        detectedAt: new Date(),
        remediation: 'Investigate and resolve system errors affecting availability'
      });
    }

    // Check API response times (would need actual monitoring data)
    // This is a placeholder for performance monitoring integration
    violations.push({
      id: 'CC2.1-2',
      controlId: 'CC2.1',
      description: 'API response time monitoring not fully implemented',
      severity: 'LOW',
      resource: 'monitoring',
      detectedAt: new Date(),
      remediation: 'Implement comprehensive application performance monitoring'
    });

    return violations;
  }

  /**
   * Check data confidentiality
   */
  private async checkDataConfidentiality(): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    // Check for data encryption
    const totalUsers = await prisma.user.count();
    const usersWithEncryptedData = await prisma.user.count({
      where: {
        // This is a simplified check - in reality you'd check encryption metadata
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (usersWithEncryptedData < totalUsers * 0.95) {
      violations.push({
        id: 'CC3.1-1',
        controlId: 'CC3.1',
        description: 'Not all user data is properly encrypted at rest',
        severity: 'HIGH',
        resource: 'database',
        detectedAt: new Date(),
        remediation: 'Implement database encryption for all sensitive data'
      });
    }

    // Check for unauthorized data access
    const sensitiveDataAccess = await prisma.auditLog.findMany({
      where: {
        target: {
          in: ['user_data', 'payment_data', 'personal_information']
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    // Flag any suspicious access patterns
    const suspiciousAccess = sensitiveDataAccess.filter(log => {
      // Check for unusual access patterns (simplified logic)
      return log.ipAddress && !this.isTrustedIP(log.ipAddress);
    });

    if (suspiciousAccess.length > 0) {
      violations.push({
        id: 'CC3.1-2',
        controlId: 'CC3.1',
        description: `${suspiciousAccess.length} suspicious access attempts to sensitive data`,
        severity: 'HIGH',
        resource: 'data_access',
        detectedAt: new Date(),
        remediation: 'Review access logs and strengthen authorization controls'
      });
    }

    return violations;
  }

  /**
   * Check processing integrity
   */
  private async checkProcessingIntegrity(): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    // Check for data processing errors
    const processingErrors = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['DATA_PROCESSING_ERROR', 'PAYMENT_PROCESSING_FAILED', 'TRANSACTION_FAILED']
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (processingErrors.length > 5) {
      violations.push({
        id: 'CC4.1-1',
        controlId: 'CC4.1',
        description: `${processingErrors.length} data processing errors in the past week`,
        severity: 'MEDIUM',
        resource: 'data_processing',
        detectedAt: new Date(),
        remediation: 'Review and fix data processing workflows'
      });
    }

    // Check transaction integrity (simplified)
    const incompleteTransactions = await prisma.payment.findMany({
      where: {
        status: 'PROCESSING',
        createdAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // Older than 10 minutes
        }
      }
    });

    if (incompleteTransactions.length > 0) {
      violations.push({
        id: 'CC4.1-2',
        controlId: 'CC4.1',
        description: `${incompleteTransactions.length} transactions stuck in processing state`,
        severity: 'MEDIUM',
        resource: 'transactions',
        detectedAt: new Date(),
        remediation: 'Implement transaction timeout and cleanup procedures'
      });
    }

    return violations;
  }

  /**
   * Check privacy compliance
   */
  private async checkPrivacyCompliance(): Promise<SOC2Violation[]> {
    const violations: SOC2Violation[] = [];

    // Check data retention compliance
    const oldDataCount = await prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: {
          lt: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) // Older than 3 years
        }
      }
    });

    if (oldDataCount > 0) {
      violations.push({
        id: 'CC5.1-1',
        controlId: 'CC5.1',
        description: `${oldDataCount} user records older than 3 years - review data retention policy`,
        severity: 'MEDIUM',
        resource: 'user_data',
        detectedAt: new Date(),
        remediation: 'Implement automated data retention and deletion policies'
      });
    }

    // Check consent management
    const usersWithoutConsentCheck = await prisma.user.count({
      where: {
        // This would check if users have given proper consent
        // Simplified for this implementation
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    violations.push({
      id: 'CC5.1-2',
      controlId: 'CC5.1',
      description: 'Consent management system needs review and implementation',
      severity: 'LOW',
      resource: 'consent_management',
      detectedAt: new Date(),
      remediation: 'Implement comprehensive consent management and tracking'
    });

    return violations;
  }

  /**
   * Check if IP is from a trusted source
   */
  private isTrustedIP(ipAddress: string): boolean {
    // This would check against known trusted IP ranges
    // Simplified implementation
    const trustedRanges = [
      '10.',     // Private network
      '192.168.', // Private network
      '172.16.'  // Private network
    ];

    return trustedRanges.some(range => ipAddress.startsWith(range));
  }

  /**
   * Generate SOC 2 compliance report
   */
  async generateComplianceReport(): Promise<any> {
    const assessment = await this.runComplianceAssessment();

    return {
      reportGeneratedAt: new Date(),
      assessmentPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      overallStatus: assessment.overallStatus,
      complianceScore: assessment.score,
      controls: assessment.controls,
      violations: assessment.violations,
      recommendations: this.generateRecommendations(assessment.violations),
      nextAssessmentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Generate remediation recommendations
   */
  private generateRecommendations(violations: SOC2Violation[]): string[] {
    const recommendations = [];

    if (violations.some(v => v.controlId.startsWith('CC1'))) {
      recommendations.push('Strengthen access controls and authentication mechanisms');
    }

    if (violations.some(v => v.controlId.startsWith('CC2'))) {
      recommendations.push('Improve system monitoring and availability tracking');
    }

    if (violations.some(v => v.controlId.startsWith('CC3'))) {
      recommendations.push('Enhance data encryption and access control policies');
    }

    if (violations.some(v => v.controlId.startsWith('CC4'))) {
      recommendations.push('Review and improve data processing workflows');
    }

    if (violations.some(v => v.controlId.startsWith('CC5'))) {
      recommendations.push('Implement comprehensive privacy and consent management');
    }

    return recommendations;
  }
}

export const soc2Service = new SOC2Service();
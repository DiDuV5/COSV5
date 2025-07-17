/**
 * @fileoverview 安全监控仪表板类型定义
 * @description 安全监控相关的所有类型、接口定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

/**
 * 安全状态接口
 */
export interface SecurityStatus {
  overallScore: number;
  lastAuditTime: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  encryption: {
    transportEncryption: boolean;
    storageEncryption: boolean;
    passwordStrength: 'WEAK' | 'MEDIUM' | 'STRONG';
    sensitiveDataCoverage: number;
  };
  permissions: {
    totalUsers: number;
    overPrivilegedUsers: number;
    unusedPermissions: number;
    permissionConflicts: number;
  };
  threats: {
    blockedAttacks: number;
    suspiciousActivities: number;
    failedLogins: number;
  };
}

/**
 * 漏洞详情接口
 */
export interface VulnerabilityDetail {
  id: string;
  type: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  remediation: string;
  location: string;
  cvssScore?: number;
}

/**
 * 安全仪表板状态
 */
export interface SecurityDashboardState {
  securityStatus: SecurityStatus | null;
  vulnerabilities: VulnerabilityDetail[];
  loading: boolean;
  scanning: boolean;
  lastUpdate: Date;
}

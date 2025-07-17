/**
 * @fileoverview 安全审计系统类型定义
 * @description 安全审计相关的所有类型、接口和枚举定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @security-standards
 * - OWASP Top 10 合规
 * - 数据加密传输和存储
 * - 权限最小化原则
 * - 安全日志和监控
 */

/**
 * 安全风险等级
 */
export enum SecurityRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 安全审计结果
 */
export interface SecurityAuditResult {
  /** 审计ID */
  auditId: string;
  /** 审计时间 */
  timestamp: Date;
  /** 总体安全评分 (0-100) */
  overallScore: number;
  /** 发现的漏洞 */
  vulnerabilities: SecurityVulnerability[];
  /** 权限审计结果 */
  permissionAudit: PermissionAuditResult;
  /** 数据加密状态 */
  encryptionStatus: EncryptionStatus;
  /** 安全建议 */
  recommendations: SecurityRecommendation[];
}

/**
 * 安全漏洞
 */
export interface SecurityVulnerability {
  /** 漏洞ID */
  id: string;
  /** 漏洞类型 */
  type: string;
  /** 风险等级 */
  riskLevel: SecurityRiskLevel;
  /** 漏洞描述 */
  description: string;
  /** 影响范围 */
  impact: string;
  /** 修复建议 */
  remediation: string;
  /** 发现位置 */
  location: string;
  /** CVSS评分 */
  cvssScore?: number;
}

/**
 * 权限审计结果
 */
export interface PermissionAuditResult {
  /** 用户权限分布 */
  userPermissionDistribution: Record<string, number>;
  /** 过度权限用户 */
  overPrivilegedUsers: string[];
  /** 未使用权限 */
  unusedPermissions: string[];
  /** 权限冲突 */
  permissionConflicts: PermissionConflict[];
}

/**
 * 权限冲突
 */
export interface PermissionConflict {
  userId: string;
  conflictType: string;
  description: string;
  riskLevel: SecurityRiskLevel;
}

/**
 * 数据加密状态
 */
export interface EncryptionStatus {
  /** 传输加密状态 */
  transportEncryption: boolean;
  /** 存储加密状态 */
  storageEncryption: boolean;
  /** 密码加密强度 */
  passwordEncryptionStrength: 'WEAK' | 'MEDIUM' | 'STRONG';
  /** 敏感数据加密覆盖率 */
  sensitiveDataEncryptionCoverage: number;
}

/**
 * 安全建议
 */
export interface SecurityRecommendation {
  /** 建议ID */
  id: string;
  /** 优先级 */
  priority: SecurityRiskLevel;
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 实施步骤 */
  implementationSteps: string[];
  /** 预期效果 */
  expectedImpact: string;
}

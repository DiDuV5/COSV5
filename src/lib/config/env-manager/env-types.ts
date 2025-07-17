/**
 * @fileoverview 环境变量管理类型定义
 * @description 定义环境变量管理相关的所有类型和接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

/**
 * 环境变量模板
 */
export interface EnvTemplate {
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  variables: EnvVariable[];
}

/**
 * 环境变量定义
 */
export interface EnvVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  required: boolean;
  defaultValue?: string;
  exampleValue?: string;
  securitySensitive?: boolean;
  environmentSpecific?: {
    production?: string;
    development?: string;
    test?: string;
  };
}

/**
 * 配置迁移结果
 */
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  details: {
    migrated: string[];
    skipped: string[];
    errors: { variable: string; error: string }[];
  };
}

/**
 * 配置对比结果
 */
export interface ComparisonResult {
  environment1: string;
  environment2: string;
  differences: {
    onlyInEnv1: string[];
    onlyInEnv2: string[];
    differentValues: { variable: string; env1Value: string; env2Value: string }[];
  };
  summary: {
    totalVariables1: number;
    totalVariables2: number;
    commonVariables: number;
    differenceCount: number;
  };
}

/**
 * 安全扫描结果
 */
export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  score: number; // 0-100
}

/**
 * 安全漏洞
 */
export interface SecurityVulnerability {
  type: 'weak_password' | 'exposed_secret' | 'insecure_default' | 'missing_encryption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  variable: string;
  description: string;
  recommendation: string;
}

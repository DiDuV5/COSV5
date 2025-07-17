/**
 * @fileoverview 配置整合管理器类型定义
 * @description 定义配置整合相关的所有类型和接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

/**
 * 配置迁移状态
 */
export interface ConfigMigrationStatus {
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  migratedCount: number;
  totalCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * 硬编码配置项
 */
export interface HardcodedConfig {
  file: string;
  line: number;
  oldValue: string;
  newEnvVar: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  description: string;
}

/**
 * 配置项定义
 */
export interface ConfigItem {
  key: string;
  cosereeden: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

/**
 * 迁移报告摘要
 */
export interface MigrationSummary {
  totalCategories: number;
  completedCategories: number;
  failedCategories: number;
  totalConfigs: number;
  migratedConfigs: number;
  errorCount: number;
  warningCount: number;
}

/**
 * 迁移报告
 */
export interface MigrationReport {
  summary: MigrationSummary;
  details: ConfigMigrationStatus[];
  recommendations: string[];
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: any;
}

/**
 * 配置类别
 */
export type ConfigCategory = 
  | 'redis'
  | 'database'
  | 'storage'
  | 'email'
  | 'auth'
  | 'business'
  | 'ui'
  | 'monitoring'
  | 'security';

/**
 * 配置优先级
 */
export type ConfigPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 迁移状态
 */
export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * 配置迁移选项
 */
export interface MigrationOptions {
  dryRun?: boolean;
  skipValidation?: boolean;
  backupConfigs?: boolean;
  forceOverwrite?: boolean;
}

/**
 * 配置备份信息
 */
export interface ConfigBackup {
  timestamp: Date;
  category: string;
  originalValues: Record<string, string>;
  backupPath?: string;
}

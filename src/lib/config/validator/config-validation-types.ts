/**
 * @fileoverview 配置验证类型定义
 * @description 定义配置验证相关的所有类型和接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

/**
 * 配置验证优先级
 */
export enum ConfigPriority {
  P0 = 'P0', // 关键基础设施
  P1 = 'P1', // 核心功能
  P2 = 'P2', // 应用层设置
  P3 = 'P3', // 可选功能
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  priority: ConfigPriority;
  category: string;
  errors: ConfigError[];
  warnings: ConfigWarning[];
  suggestions: ConfigSuggestion[];
}

/**
 * 配置错误
 */
export interface ConfigError {
  code: string;
  message: string;
  field: string;
  value?: string;
  expectedType?: string;
  expectedRange?: string;
  fixSuggestion?: string;
}

/**
 * 配置警告
 */
export interface ConfigWarning {
  code: string;
  message: string;
  field: string;
  value?: string;
  recommendation?: string;
}

/**
 * 配置建议
 */
export interface ConfigSuggestion {
  code: string;
  message: string;
  field: string;
  recommendedValue?: string;
  reason?: string;
}

/**
 * 配置验证规则
 */
export interface ConfigValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: string[];
  defaultValue?: string;
  environmentSpecific?: {
    production?: { required?: boolean; defaultValue?: string };
    development?: { required?: boolean; defaultValue?: string };
    test?: { required?: boolean; defaultValue?: string };
  };
  dependencies?: string[];
  conflicts?: string[];
  securitySensitive?: boolean;
}

/**
 * 配置类别定义
 */
export interface ConfigCategory {
  name: string;
  priority: ConfigPriority;
  description: string;
  rules: ConfigValidationRule[];
  healthCheck?: () => Promise<boolean>;
}

/**
 * 验证报告摘要
 */
export interface ValidationReportSummary {
  totalCategories: number;
  validCategories: number;
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
}

/**
 * 完整验证报告
 */
export interface ValidationReport {
  summary: ValidationReportSummary;
  results: Map<string, ConfigValidationResult>;
  recommendations: string[];
}

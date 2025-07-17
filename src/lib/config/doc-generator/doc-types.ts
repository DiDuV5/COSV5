/**
 * @fileoverview 配置文档生成器类型定义
 * @description 定义配置文档生成相关的所有类型和接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

/**
 * 文档生成配置
 */
export interface DocGenerationConfig {
  outputDir: string;
  includeExamples: boolean;
  includeSecurity: boolean;
  includeValidation: boolean;
  format: 'markdown' | 'html' | 'json';
}

/**
 * 配置变更记录
 */
export interface ConfigChangeRecord {
  timestamp: number;
  version: string;
  category: string;
  changeType: 'added' | 'modified' | 'removed' | 'deprecated';
  variable: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  author?: string;
}

/**
 * 文档模板配置
 */
export interface DocumentTemplate {
  title: string;
  description: string;
  sections: DocumentSection[];
}

/**
 * 文档章节
 */
export interface DocumentSection {
  title: string;
  content: string[];
  subsections?: DocumentSection[];
}

/**
 * 环境变量文档项
 */
export interface EnvVarDocItem {
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  exampleValue?: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  securitySensitive: boolean;
  validationRules?: string[];
}

/**
 * 配置类别文档
 */
export interface ConfigCategoryDoc {
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  variables: EnvVarDocItem[];
  examples?: ConfigExample[];
  bestPractices?: string[];
}

/**
 * 配置示例
 */
export interface ConfigExample {
  title: string;
  description: string;
  environment: 'development' | 'production' | 'test';
  variables: Record<string, string>;
}

/**
 * 安全指南项
 */
export interface SecurityGuideItem {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  examples?: string[];
}

/**
 * 最佳实践项
 */
export interface BestPracticeItem {
  title: string;
  description: string;
  category: string;
  importance: 'low' | 'medium' | 'high';
  doList: string[];
  dontList: string[];
  examples?: string[];
}

/**
 * 部署检查项
 */
export interface DeploymentCheckItem {
  title: string;
  description: string;
  category: string;
  required: boolean;
  checkCommand?: string;
  expectedResult?: string;
  troubleshooting?: string[];
}

/**
 * 文档生成结果
 */
export interface DocGenerationResult {
  success: boolean;
  generatedFiles: string[];
  errors: string[];
  warnings: string[];
  stats: {
    totalVariables: number;
    categoriesCount: number;
    examplesCount: number;
    securityItemsCount: number;
  };
}

/**
 * 变更历史统计
 */
export interface ChangeHistoryStats {
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByCategory: Record<string, number>;
  recentChanges: ConfigChangeRecord[];
  mostActiveCategories: Array<{ category: string; count: number }>;
}

/**
 * 文档格式化选项
 */
export interface DocumentFormatOptions {
  format: 'markdown' | 'html' | 'json';
  includeTableOfContents: boolean;
  includeTimestamp: boolean;
  includeVersion: boolean;
  customStyles?: string;
}

/**
 * 验证报告项
 */
export interface ValidationReportItem {
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  isValid: boolean;
  errors: Array<{ message: string; field: string }>;
  warnings: Array<{ message: string; field: string }>;
  suggestions: Array<{ message: string; field: string }>;
}

/**
 * 文档生成上下文
 */
export interface DocGenerationContext {
  config: DocGenerationConfig;
  timestamp: Date;
  version: string;
  environment: string;
  author?: string;
}

/**
 * 文档输出格式
 */
export type DocumentFormat = 'markdown' | 'html' | 'json' | 'pdf';

/**
 * 配置变更类型
 */
export type ConfigChangeType = 'added' | 'modified' | 'removed' | 'deprecated';

/**
 * 优先级类型
 */
export type ConfigPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 环境类型
 */
export type EnvironmentType = 'development' | 'production' | 'test' | 'staging';

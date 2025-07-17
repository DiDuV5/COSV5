/**
 * @fileoverview 配置验证器核心
 * @description 核心配置验证器类和主要验证逻辑
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import {
  ConfigCategory,
  ConfigValidationResult,
  ValidationReport,
  ConfigPriority
} from './config-validation-types';
import {
  validateRule,
  checkDependencies,
  checkConflicts
} from './config-validation-utils';
import {
  getRedisValidationRules,
  getDatabaseValidationRules,
  getStorageValidationRules,
  getEmailValidationRules,
  getSecurityValidationRules,
  getAuthValidationRules,
} from './config-validation-rules';
import { generateValidationReport } from './config-validation-report';

/**
 * 统一配置验证器
 */
export class ConfigValidator {
  private static instance: ConfigValidator;
  private categories: Map<string, ConfigCategory> = new Map();
  private validationCache: Map<string, ConfigValidationResult> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {
    this.initializeCategories();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  /**
   * 初始化配置类别
   */
  private initializeCategories(): void {
    // P0级配置类别
    this.registerCategory({
      name: 'redis',
      priority: ConfigPriority.P0,
      description: 'Redis缓存配置',
      rules: getRedisValidationRules(),
    });

    this.registerCategory({
      name: 'database',
      priority: ConfigPriority.P0,
      description: '数据库连接配置',
      rules: getDatabaseValidationRules(),
    });

    this.registerCategory({
      name: 'storage',
      priority: ConfigPriority.P0,
      description: '存储服务配置',
      rules: getStorageValidationRules(),
    });

    // P1级配置类别
    this.registerCategory({
      name: 'email',
      priority: ConfigPriority.P1,
      description: '邮件服务配置',
      rules: getEmailValidationRules(),
    });

    this.registerCategory({
      name: 'security',
      priority: ConfigPriority.P1,
      description: '安全配置',
      rules: getSecurityValidationRules(),
    });

    this.registerCategory({
      name: 'auth',
      priority: ConfigPriority.P1,
      description: '认证配置',
      rules: getAuthValidationRules(),
    });
  }

  /**
   * 注册配置类别
   */
  registerCategory(category: ConfigCategory): void {
    this.categories.set(category.name, category);
  }

  /**
   * 验证所有配置
   */
  async validateAllConfigs(): Promise<Map<string, ConfigValidationResult>> {
    const results = new Map<string, ConfigValidationResult>();

    for (const [name, category] of this.categories) {
      try {
        const result = await this.validateCategory(name);
        results.set(name, result);
      } catch (error) {
        logger.error(`配置验证失败: ${name}`, { error });
        results.set(name, {
          isValid: false,
          priority: category.priority,
          category: name,
          errors: [{
            code: 'VALIDATION_ERROR',
            message: `配置验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
            field: 'general',
          }],
          warnings: [],
          suggestions: [],
        });
      }
    }

    return results;
  }

  /**
   * 验证特定配置类别
   */
  async validateCategory(categoryName: string): Promise<ConfigValidationResult> {
    const cached = this.validationCache.get(categoryName);
    const now = Date.now();

    if (cached && now - (cached as any).timestamp < this.cacheExpiry) {
      return cached;
    }

    const category = this.categories.get(categoryName);
    if (!category) {
      throw new Error(`未知的配置类别: ${categoryName}`);
    }

    const result: ConfigValidationResult = {
      isValid: true,
      priority: category.priority,
      category: categoryName,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 验证每个规则
    for (const rule of category.rules) {
      const ruleResult = validateRule(rule);
      result.errors.push(...ruleResult.errors);
      result.warnings.push(...ruleResult.warnings);
      result.suggestions.push(...ruleResult.suggestions);
    }

    // 检查依赖关系
    checkDependencies(category.rules, result.errors);

    // 检查冲突
    checkConflicts(category.rules, result.warnings);

    // 执行健康检查
    if (category.healthCheck) {
      try {
        const isHealthy = await category.healthCheck();
        if (!isHealthy) {
          result.warnings.push({
            code: 'HEALTH_CHECK_FAILED',
            message: `${categoryName}配置健康检查失败`,
            field: 'general',
            recommendation: '请检查配置是否正确并且服务是否可用',
          });
        }
      } catch (error) {
        result.warnings.push({
          code: 'HEALTH_CHECK_ERROR',
          message: `${categoryName}健康检查执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          field: 'general',
        });
      }
    }

    result.isValid = result.errors.length === 0;
    (result as any).timestamp = Date.now();
    this.validationCache.set(categoryName, result);

    return result;
  }

  /**
   * 生成配置验证报告
   */
  async generateValidationReport(): Promise<ValidationReport> {
    const results = await this.validateAllConfigs();
    return generateValidationReport(results, this.categories.size);
  }

  /**
   * 清除验证缓存
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * 获取所有注册的配置类别
   */
  getCategories(): Map<string, ConfigCategory> {
    return new Map(this.categories);
  }

  /**
   * 获取特定类别的配置
   */
  getCategory(name: string): ConfigCategory | undefined {
    return this.categories.get(name);
  }
}

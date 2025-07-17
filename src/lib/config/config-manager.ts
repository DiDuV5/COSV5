/**
 * @fileoverview 统一配置管理器
 * @description 提供统一的配置管理入口，整合验证、健康检查、环境变量管理等功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import { ConfigValidator, ConfigValidationResult, ConfigPriority } from './config-validator';
import { ConfigHealthChecker, HealthCheckResult } from './config-health-checker';
import { EnvManager, MigrationResult, ComparisonResult, SecurityScanResult } from './env-manager';
import { ConfigDocGenerator, DocGenerationConfig } from './config-doc-generator';

/**
 * 配置管理器状态
 */
export interface ConfigManagerStatus {
  initialized: boolean;
  validationPassed: boolean;
  healthCheckEnabled: boolean;
  lastValidation: number;
  lastHealthCheck: number;
  errors: string[];
  warnings: string[];
}

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  enableHealthCheck?: boolean;
  enableAutoValidation?: boolean;
  validationInterval?: number; // 毫秒
  healthCheckInterval?: number; // 毫秒
  strictMode?: boolean; // 严格模式，任何错误都会阻止启动
}

/**
 * 统一配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private validator: ConfigValidator;
  private healthChecker: ConfigHealthChecker;
  private envManager: EnvManager;
  private docGenerator: ConfigDocGenerator;

  private status: ConfigManagerStatus = {
    initialized: false,
    validationPassed: false,
    healthCheckEnabled: false,
    lastValidation: 0,
    lastHealthCheck: 0,
    errors: [],
    warnings: [],
  };

  private options: Required<ConfigManagerOptions> = {
    enableHealthCheck: true,
    enableAutoValidation: true,
    validationInterval: 5 * 60 * 1000, // 5分钟
    healthCheckInterval: 5 * 60 * 1000, // 5分钟
    strictMode: process.env.NODE_ENV === 'production',
  };

  private constructor() {
    this.validator = ConfigValidator.getInstance();
    this.healthChecker = ConfigHealthChecker.getInstance();
    this.envManager = EnvManager.getInstance();
    this.docGenerator = ConfigDocGenerator.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 初始化配置管理器
   */
  async initialize(options?: Partial<ConfigManagerOptions>): Promise<void> {
    try {
      // 合并选项
      this.options = { ...this.options, ...options };

      logger.info('开始初始化配置管理器', { options: this.options });

      // 执行初始配置验证
      await this.performInitialValidation();

      // 启动健康检查
      if (this.options.enableHealthCheck) {
        await this.startHealthChecks();
      }

      // 启动自动验证
      if (this.options.enableAutoValidation) {
        this.startAutoValidation();
      }

      this.status.initialized = true;
      logger.info('配置管理器初始化完成');

    } catch (error) {
      logger.error('配置管理器初始化失败', { error });

      if (this.options.strictMode) {
        throw error;
      }
    }
  }

  /**
   * 执行初始配置验证
   */
  private async performInitialValidation(): Promise<void> {
    try {
      const results = await this.validator.validateAllConfigs();
      this.status.lastValidation = Date.now();

      let hasErrors = false;
      let hasWarnings = false;

      for (const [category, result] of results) {
        if (!result.isValid) {
          hasErrors = true;
          this.status.errors.push(`${category}: ${result.errors.map(e => e.message).join(', ')}`);
        }

        if (result.warnings.length > 0) {
          hasWarnings = true;
          this.status.warnings.push(`${category}: ${result.warnings.map(w => w.message).join(', ')}`);
        }
      }

      this.status.validationPassed = !hasErrors;

      if (hasErrors) {
        logger.error('配置验证失败', { errors: this.status.errors });

        if (this.options.strictMode) {
          throw new Error(`配置验证失败: ${this.status.errors.join('; ')}`);
        }
      }

      if (hasWarnings) {
        logger.warn('配置验证发现警告', { warnings: this.status.warnings });
      }

      if (!hasErrors && !hasWarnings) {
        logger.info('配置验证通过');
      }

    } catch (error) {
      logger.error('配置验证过程中发生错误', { error });
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  private async startHealthChecks(): Promise<void> {
    try {
      await this.healthChecker.startHealthChecks();
      this.status.healthCheckEnabled = true;
      this.status.lastHealthCheck = Date.now();

      logger.info('配置健康检查已启动');
    } catch (error) {
      logger.error('启动健康检查失败', { error });
      throw error;
    }
  }

  /**
   * 启动自动验证
   */
  private startAutoValidation(): void {
    setInterval(async () => {
      try {
        await this.performInitialValidation();
      } catch (error) {
        logger.error('自动配置验证失败', { error });
      }
    }, this.options.validationInterval);

    logger.info(`自动配置验证已启动，间隔: ${this.options.validationInterval}ms`);
  }

  /**
   * 获取配置管理器状态
   */
  getStatus(): ConfigManagerStatus {
    return { ...this.status };
  }

  /**
   * 验证所有配置
   */
  async validateConfigs(): Promise<Map<string, ConfigValidationResult>> {
    const results = await this.validator.validateAllConfigs();
    this.status.lastValidation = Date.now();
    return results;
  }

  /**
   * 验证特定配置类别
   */
  async validateCategory(category: string): Promise<ConfigValidationResult> {
    return await this.validator.validateCategory(category);
  }

  /**
   * 生成配置验证报告
   */
  async generateValidationReport(): Promise<any> {
    return await this.validator.generateValidationReport();
  }

  /**
   * 获取健康检查摘要
   */
  getHealthSummary(): Record<string, any> {
    return this.healthChecker.getHealthSummary();
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(category?: string): Promise<HealthCheckResult | Record<string, HealthCheckResult>> {
    if (category) {
      return await this.healthChecker.performHealthCheck(category);
    } else {
      const categories = ['redis', 'database', 'storage', 'email', 'security', 'auth'];
      const results: Record<string, HealthCheckResult> = {};

      for (const cat of categories) {
        try {
          results[cat] = await this.healthChecker.performHealthCheck(cat);
        } catch (error) {
          logger.error(`健康检查失败: ${cat}`, { error });
        }
      }

      return results;
    }
  }

  /**
   * 生成环境变量模板
   */
  async generateEnvTemplate(
    environment: 'production' | 'development' | 'test',
    outputPath?: string
  ): Promise<string> {
    return await this.envManager.generateEnvTemplate(environment, outputPath);
  }

  /**
   * 迁移到COSEREEDEN前缀
   */
  async migrateToCoserEdenPrefix(envFilePath?: string): Promise<MigrationResult> {
    const result = await this.envManager.migrateToCoserEdenPrefix(envFilePath);

    // 记录配置变更
    if (result.success && result.migratedCount > 0) {
      this.docGenerator.recordConfigChange({
        version: '2.0.0',
        category: 'migration',
        changeType: 'modified',
        variable: 'multiple',
        description: `迁移 ${result.migratedCount} 个环境变量到COSEREEDEN_前缀`,
        author: 'ConfigManager',
      });
    }

    return result;
  }

  /**
   * 对比环境配置
   */
  async compareEnvironments(
    env1Path: string,
    env2Path: string,
    env1Name?: string,
    env2Name?: string
  ): Promise<ComparisonResult> {
    return await this.envManager.compareEnvironments(env1Path, env2Path);
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(envFilePath?: string): Promise<SecurityScanResult> {
    return await this.envManager.performSecurityScan(envFilePath);
  }

  /**
   * 生成完整配置文档
   */
  async generateDocumentation(config: DocGenerationConfig): Promise<void> {
    await this.docGenerator.generateCompleteDocumentation(config);
  }

  /**
   * 记录配置变更
   */
  recordConfigChange(change: {
    version: string;
    category: string;
    changeType: 'added' | 'modified' | 'removed' | 'deprecated';
    variable: string;
    oldValue?: string;
    newValue?: string;
    description: string;
    author?: string;
  }): void {
    this.docGenerator.recordConfigChange(change);
  }

  /**
   * 停止配置管理器
   */
  async shutdown(): Promise<void> {
    try {
      // 停止健康检查
      this.healthChecker.stopHealthChecks();

      // 清除缓存
      this.validator.clearCache();
      this.healthChecker.clearHistory();

      this.status.initialized = false;
      this.status.healthCheckEnabled = false;

      logger.info('配置管理器已停止');
    } catch (error) {
      logger.error('停止配置管理器失败', { error });
      throw error;
    }
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    try {
      // 清除缓存
      this.validator.clearCache();

      // 重新验证配置
      await this.performInitialValidation();

      logger.info('配置已重新加载');
    } catch (error) {
      logger.error('重新加载配置失败', { error });
      throw error;
    }
  }

  /**
   * 获取配置摘要
   */
  async getConfigSummary(): Promise<{
    status: ConfigManagerStatus;
    validation: any;
    health: Record<string, any>;
    security?: SecurityScanResult;
  }> {
    const validation = await this.generateValidationReport();
    const health = this.getHealthSummary();

    const summary: any = {
      status: this.getStatus(),
      validation,
      health,
    };

    // 如果启用了安全扫描，添加安全信息
    try {
      const security = await this.performSecurityScan();
      summary.security = security;
    } catch (error) {
      logger.warn('获取安全扫描结果失败', { error });
    }

    return summary;
  }
}

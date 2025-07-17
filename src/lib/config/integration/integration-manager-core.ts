/**
 * @fileoverview 配置整合管理器核心
 * @description 核心配置整合管理器类和主要功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import { ConfigManager } from '../config-manager';
import { EnvManager } from '../env-manager';
import { ConfigValidator } from '../config-validator';
import { HardcodedDetector } from './hardcoded-detector';
import { P0Migrator } from './p0-migrator';
import { P1Migrator } from './p1-migrator';
import { ReportGenerator } from './report-generator';
import type {
  ConfigMigrationStatus,
  HardcodedConfig,
  MigrationReport,
  MigrationOptions,
  ConfigValidationResult
} from './integration-types';

/**
 * 配置整合管理器
 */
export class ConfigIntegrationManager {
  private static instance: ConfigIntegrationManager;
  private configManager: ConfigManager;
  private envManager: EnvManager;
  private validator: ConfigValidator;
  private hardcodedDetector: HardcodedDetector;
  private p0Migrator: P0Migrator;
  private p1Migrator: P1Migrator;
  private reportGenerator: ReportGenerator;
  private migrationStatus: Map<string, ConfigMigrationStatus> = new Map();

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.envManager = EnvManager.getInstance();
    this.validator = ConfigValidator.getInstance();
    this.hardcodedDetector = new HardcodedDetector();
    this.p0Migrator = new P0Migrator();
    this.p1Migrator = new P1Migrator();
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigIntegrationManager {
    if (!ConfigIntegrationManager.instance) {
      ConfigIntegrationManager.instance = new ConfigIntegrationManager();
    }
    return ConfigIntegrationManager.instance;
  }

  /**
   * 识别项目中的硬编码配置
   */
  async identifyHardcodedConfigs(): Promise<HardcodedConfig[]> {
    logger.info('开始识别硬编码配置');

    try {
      const configs = await this.hardcodedDetector.identifyHardcodedConfigs();

      logger.info('硬编码配置识别完成', {
        totalConfigs: configs.length,
        p0Count: configs.filter(c => c.priority === 'P0').length,
        p1Count: configs.filter(c => c.priority === 'P1').length,
        p2Count: configs.filter(c => c.priority === 'P2').length,
        p3Count: configs.filter(c => c.priority === 'P3').length
      });

      return configs;
    } catch (error) {
      logger.error('硬编码配置识别失败', { error });
      throw error;
    }
  }

  /**
   * 执行P0级配置迁移
   */
  async migrateP0Configs(options: MigrationOptions = {}): Promise<ConfigMigrationStatus[]> {
    logger.info('开始P0级配置迁移');

    try {
      const results = await this.p0Migrator.migrateP0Configs(options);

      // 更新迁移状态
      for (const result of results) {
        this.migrationStatus.set(result.category, result);
      }

      logger.info('P0级配置迁移完成', {
        totalCategories: results.length,
        completedCategories: results.filter(r => r.status === 'completed').length,
        failedCategories: results.filter(r => r.status === 'failed').length
      });

      return results;
    } catch (error) {
      logger.error('P0级配置迁移失败', { error });
      throw error;
    }
  }

  /**
   * 执行P1级配置迁移
   */
  async migrateP1Configs(options: MigrationOptions = {}): Promise<ConfigMigrationStatus[]> {
    logger.info('开始P1级配置迁移');

    try {
      const results = await this.p1Migrator.migrateP1Configs(options);

      // 更新迁移状态
      for (const result of results) {
        this.migrationStatus.set(result.category, result);
      }

      logger.info('P1级配置迁移完成', {
        totalCategories: results.length,
        completedCategories: results.filter(r => r.status === 'completed').length,
        failedCategories: results.filter(r => r.status === 'failed').length
      });

      return results;
    } catch (error) {
      logger.error('P1级配置迁移失败', { error });
      throw error;
    }
  }

  /**
   * 执行完整的配置迁移
   */
  async migrateAllConfigs(options: MigrationOptions = {}): Promise<ConfigMigrationStatus[]> {
    logger.info('开始完整配置迁移');

    const allResults: ConfigMigrationStatus[] = [];

    try {
      // 执行P0级迁移
      const p0Results = await this.migrateP0Configs(options);
      allResults.push(...p0Results);

      // 执行P1级迁移
      const p1Results = await this.migrateP1Configs(options);
      allResults.push(...p1Results);

      logger.info('完整配置迁移完成', {
        totalCategories: allResults.length,
        completedCategories: allResults.filter(r => r.status === 'completed').length,
        failedCategories: allResults.filter(r => r.status === 'failed').length
      });

      return allResults;
    } catch (error) {
      logger.error('完整配置迁移失败', { error });
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  getMigrationStatus(): Map<string, ConfigMigrationStatus> {
    return new Map(this.migrationStatus);
  }

  /**
   * 生成迁移报告
   */
  generateMigrationReport(): MigrationReport {
    return this.reportGenerator.generateMigrationReport(this.migrationStatus);
  }

  /**
   * 生成详细报告
   */
  generateDetailedReport(): string {
    return this.reportGenerator.generateDetailedReport(this.migrationStatus);
  }

  /**
   * 生成环境变量模板
   */
  generateEnvTemplate(priority: 'P0' | 'P1' | 'P2' | 'P3' | 'all' = 'all'): string {
    return this.reportGenerator.generateEnvTemplate(priority);
  }

  /**
   * 验证迁移后的配置
   */
  async validateMigratedConfigs(): Promise<ConfigValidationResult> {
    logger.info('验证迁移后的配置');

    try {
      // 使用现有的配置验证器
      const validationResults = await this.validator.validateAllConfigs();
      const report = await this.validator.generateValidationReport();

      // 将Map转换为数组进行处理
      const resultsArray = Array.from(validationResults.values());

      const result: ConfigValidationResult = {
        isValid: resultsArray.every(r => r.isValid),
        errors: resultsArray.flatMap(r => (r.errors || []).map(e => typeof e === 'string' ? e : e.message || '未知错误')),
        warnings: resultsArray.flatMap(r => (r.warnings || []).map(w => typeof w === 'string' ? w : w.message || '未知警告')),
        details: report
      };

      logger.info('配置验证完成', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

      return result;
    } catch (error) {
      logger.error('配置验证失败', { error });
      throw error;
    }
  }

  /**
   * 验证P0级配置
   */
  async validateP0Configs(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return await this.p0Migrator.validateP0Configs();
  }

  /**
   * 验证P1级配置
   */
  async validateP1Configs(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return await this.p1Migrator.validateP1Configs();
  }

  /**
   * 获取硬编码配置建议
   */
  async getHardcodedConfigSuggestions(): Promise<string[]> {
    const configs = await this.identifyHardcodedConfigs();
    return this.hardcodedDetector.generateMigrationSuggestions(configs);
  }

  /**
   * 按优先级分组硬编码配置
   */
  async groupHardcodedConfigsByPriority(): Promise<Record<string, HardcodedConfig[]>> {
    const configs = await this.identifyHardcodedConfigs();
    return this.hardcodedDetector.groupConfigsByPriority(configs);
  }

  /**
   * 按类别分组硬编码配置
   */
  async groupHardcodedConfigsByCategory(): Promise<Record<string, HardcodedConfig[]>> {
    const configs = await this.identifyHardcodedConfigs();
    return this.hardcodedDetector.groupConfigsByCategory(configs);
  }

  /**
   * 重置迁移状态
   */
  resetMigrationStatus(): void {
    this.migrationStatus.clear();
    logger.info('迁移状态已重置');
  }

  /**
   * 获取配置迁移统计
   */
  getMigrationStats(): {
    totalCategories: number;
    completedCategories: number;
    failedCategories: number;
    inProgressCategories: number;
    pendingCategories: number;
  } {
    const statuses = Array.from(this.migrationStatus.values());

    return {
      totalCategories: statuses.length,
      completedCategories: statuses.filter(s => s.status === 'completed').length,
      failedCategories: statuses.filter(s => s.status === 'failed').length,
      inProgressCategories: statuses.filter(s => s.status === 'in_progress').length,
      pendingCategories: statuses.filter(s => s.status === 'pending').length,
    };
  }

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    try {
      const p0Validation = await this.validateP0Configs();
      const p1Validation = await this.validateP1Configs();

      return !p0Validation.isValid || !p1Validation.isValid;
    } catch (error) {
      logger.error('检查迁移需求失败', { error });
      return true; // 出错时假设需要迁移
    }
  }
}

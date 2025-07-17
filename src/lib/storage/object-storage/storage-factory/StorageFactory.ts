/**
 * @fileoverview 重构后的存储服务工厂主类
 * @description 根据环境配置创建和管理存储服务实例
 * @author Augment AI
 * @date 2025-07-15
 * @version 3.0.0
 */

import { StorageManager, type StorageManagerConfig } from '../storage-manager';
import type { StorageConfig } from '../base-storage-provider';
import { EnvironmentValidator } from './EnvironmentValidator';
import { ConfigurationBuilder } from './ConfigurationBuilder';
import { URLGenerator } from './URLGenerator';
import type { ConfigValidationResult } from './types';

/**
 * 重构后的存储服务工厂类
 */
export class StorageFactory {
  private static defaultManager: StorageManager | null = null;
  private static environmentValidator = new EnvironmentValidator();
  private static configurationBuilder = new ConfigurationBuilder();
  private static urlGenerator = new URLGenerator();

  /**
   * 创建存储服务
   */
  static async createStorageService(config?: StorageManagerConfig): Promise<StorageManager> {
    const finalConfig = config || StorageFactory.configurationBuilder.createDefaultConfig();
    const manager = StorageManager.getInstance(finalConfig);

    if (!manager.isReady()) {
      await manager.initialize();
    }

    return manager;
  }

  /**
   * 获取默认存储管理器
   */
  static async getDefaultManager(): Promise<StorageManager> {
    if (!StorageFactory.defaultManager) {
      StorageFactory.defaultManager = await StorageFactory.createStorageService();
    }
    return StorageFactory.defaultManager;
  }

  /**
   * 重置默认管理器
   */
  static resetDefaultManager(): void {
    StorageFactory.defaultManager = null;
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(): StorageManagerConfig {
    return StorageFactory.configurationBuilder.createDefaultConfig();
  }

  /**
   * 创建主要存储配置 (环境变量驱动)
   */
  static createPrimaryStorageConfig(): StorageConfig {
    return StorageFactory.configurationBuilder.createPrimaryStorageConfig();
  }

  /**
   * 创建备用存储配置
   */
  static createFallbackStorageConfig(): StorageConfig | undefined {
    return StorageFactory.configurationBuilder.createFallbackStorageConfig();
  }

  /**
   * 创建Cloudflare R2配置 (从环境变量)
   */
  static createCloudflareR2Config(): StorageConfig {
    return StorageFactory.configurationBuilder.createCloudflareR2Config();
  }

  /**
   * 创建本地存储配置
   */
  static createLocalStorageConfig(): StorageConfig {
    return StorageFactory.configurationBuilder.createLocalStorageConfig();
  }

  /**
   * 验证存储配置
   */
  static validateStorageConfig(config: StorageConfig): void {
    StorageFactory.environmentValidator.validateStorageConfig(config);
  }

  /**
   * 验证Cloudflare R2配置
   */
  static validateCloudflareR2Config(config: StorageConfig): void {
    StorageFactory.environmentValidator.validateCloudflareR2Config(config);
  }

  /**
   * 验证本地存储配置
   */
  static validateLocalStorageConfig(config: StorageConfig): void {
    StorageFactory.environmentValidator.validateLocalStorageConfig(config);
  }

  /**
   * 获取配置摘要
   */
  static getConfigSummary(config: StorageConfig): any {
    return StorageFactory.configurationBuilder.getConfigSummary(config);
  }

  /**
   * 验证管理器配置
   */
  static validateManagerConfig(config: StorageManagerConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证主要配置
    try {
      StorageFactory.validateStorageConfig(config.primary);
    } catch (error) {
      errors.push(`主要存储配置错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 验证备用配置
    if (config.fallback) {
      try {
        StorageFactory.validateStorageConfig(config.fallback);
      } catch (error) {
        warnings.push(`备用存储配置警告: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        primary: StorageFactory.getConfigSummary(config.primary),
        fallback: config.fallback ? StorageFactory.getConfigSummary(config.fallback) : null,
        enableFailover: config.enableFailover,
        enableCache: config.enableCache,
      },
    };
  }

  /**
   * 创建测试配置
   */
  static createTestConfig(): StorageManagerConfig {
    return StorageFactory.configurationBuilder.createTestConfig();
  }

  /**
   * 获取配置状态摘要
   */
  static getConfigStatus() {
    return StorageFactory.environmentValidator.getConfigStatus();
  }

  /**
   * 根据环境创建配置
   */
  static createConfigForEnvironment(environment?: string): StorageManagerConfig {
    return StorageFactory.configurationBuilder.createConfigForEnvironment(environment);
  }

  /**
   * 生成CDN URL
   */
  static generateCDNUrl(key: string): string {
    return StorageFactory.urlGenerator.generateCDNUrl(key);
  }

  /**
   * 生成公开访问URL
   */
  static generatePublicUrl(key: string): string {
    return StorageFactory.urlGenerator.generatePublicUrl(key);
  }

  /**
   * 生成自定义域名URL
   */
  static generateCustomDomainUrl(key: string): string {
    return StorageFactory.urlGenerator.generateCustomDomainUrl(key);
  }

  /**
   * 获取最佳访问URL
   */
  static getBestAccessUrl(key: string): string {
    return StorageFactory.urlGenerator.getBestAccessUrl(key);
  }

  /**
   * URL编码文件名
   */
  static encodeFilename(filename: string): string {
    return StorageFactory.urlGenerator.encodeFilename(filename);
  }

  /**
   * 检查环境配置
   */
  static checkEnvironmentConfig() {
    return StorageFactory.environmentValidator.checkEnvironmentConfig();
  }

  /**
   * 创建开发环境配置
   */
  static createDevelopmentConfig(): StorageManagerConfig {
    return StorageFactory.configurationBuilder.createDevelopmentConfig();
  }

  /**
   * 创建生产环境配置
   */
  static createProductionConfig(): StorageManagerConfig {
    return StorageFactory.configurationBuilder.createProductionConfig();
  }

  /**
   * 验证配置完整性
   */
  static validateConfiguration(config: StorageConfig) {
    return StorageFactory.configurationBuilder.validateConfiguration(config);
  }

  /**
   * 合并配置
   */
  static mergeConfigs(base: StorageConfig, override: Partial<StorageConfig>): StorageConfig {
    return StorageFactory.configurationBuilder.mergeConfigs(base, override);
  }

  /**
   * 比较配置
   */
  static compareConfigs(config1: StorageConfig, config2: StorageConfig) {
    return StorageFactory.configurationBuilder.compareConfigs(config1, config2);
  }

  /**
   * 生成配置报告
   */
  static generateConfigReport() {
    return StorageFactory.environmentValidator.generateConfigReport();
  }

  /**
   * 批量生成URL
   */
  static generateMultipleUrls(keys: string[]): string[] {
    return StorageFactory.urlGenerator.generateMultipleUrls(keys);
  }

  /**
   * 生成缩略图URL
   */
  static generateThumbnailUrl(key: string, size?: string): string {
    return StorageFactory.urlGenerator.generateThumbnailUrl(key, size);
  }

  /**
   * 检查URL是否为CDN URL
   */
  static isCDNUrl(url: string): boolean {
    return StorageFactory.urlGenerator.isCDNUrl(url);
  }

  /**
   * 从URL提取文件键
   */
  static extractKeyFromUrl(url: string): string | null {
    return StorageFactory.urlGenerator.extractKeyFromUrl(url);
  }

  /**
   * 获取环境变量状态
   */
  static getEnvironmentStatus() {
    return {
      required: StorageFactory.environmentValidator.getRequiredVarsStatus(),
      optional: StorageFactory.environmentValidator.getOptionalVarsStatus(),
    };
  }
}

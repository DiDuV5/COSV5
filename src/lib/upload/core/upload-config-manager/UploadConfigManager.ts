/**
 * @fileoverview 重构后的上传配置管理器
 * @description 提供统一的上传配置管理接口 - 重构版本
 * @author Augment AI
 * @date 2025-07-06
 * @version 4.0.0 - 重构版（模块化架构）
 */

import { UserLevel } from '@/types/user-level';
import {
  UnifiedUploadConfig,
  UserLevelConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  ConfigLoadOptions,
  UserConfigQueryOptions
} from '../types/upload-config-types';

import { ConfigManager } from './core/ConfigManager';
import { ConfigService } from './services/ConfigService';
import { UserService } from './services/UserService';
import { CompatibilityAdapter } from './adapters/CompatibilityAdapter';
import { ConfigUtils } from './utils/ConfigUtils';

/**
 * 上传配置管理器主类 - 重构版
 */
export class UploadConfigManager {
  private static instance: UploadConfigManager;
  private configManager: ConfigManager;
  private configService: ConfigService;
  private userService: UserService;
  private compatibilityAdapter: CompatibilityAdapter;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.configService = new ConfigService();
    this.userService = new UserService();
    this.compatibilityAdapter = new CompatibilityAdapter();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UploadConfigManager {
    if (!UploadConfigManager.instance) {
      UploadConfigManager.instance = new UploadConfigManager();
    }
    return UploadConfigManager.instance;
  }

  // 静态方法 - 主要API

  /**
   * 获取统一上传配置
   */
  static async getConfig(options?: ConfigLoadOptions): Promise<UnifiedUploadConfig> {
    const instance = this.getInstance();
    return await instance.configService.getConfig('default', options);
  }

  /**
   * 获取用户级别配置
   */
  static async getUserLevelConfig(
    userLevel: UserLevel,
    options?: UserConfigQueryOptions
  ): Promise<UserLevelConfig> {
    const instance = this.getInstance();
    return await instance.userService.getUserLevelConfig(userLevel, options);
  }

  /**
   * 验证配置
   */
  static async validateConfig(config: UnifiedUploadConfig): Promise<ConfigValidationResult> {
    const instance = this.getInstance();
    return await instance.configService.validateConfig(config);
  }

  /**
   * 执行健康检查
   */
  static async performHealthCheck(): Promise<ConfigHealthCheck> {
    const instance = this.getInstance();
    return await instance.configService.performHealthCheck();
  }

  /**
   * 检查用户是否可以上传
   */
  static async canUserUpload(
    userId: string,
    userLevel: UserLevel,
    fileSize: number,
    fileCount: number = 1
  ): Promise<{
    canUpload: boolean;
    reason?: string;
    limits?: any;
  }> {
    const instance = this.getInstance();
    return await instance.userService.canUserUpload(userId, userLevel, fileSize, fileCount);
  }

  /**
   * 更新用户配额使用量
   */
  static async updateUserQuotaUsage(
    userId: string,
    storageUsed: number,
    bandwidthUsed: number
  ): Promise<void> {
    const instance = this.getInstance();
    return await instance.userService.updateUserQuotaUsage(userId, storageUsed, bandwidthUsed);
  }

  /**
   * 获取用户上传统计
   */
  static async getUserUploadStats(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
  }> {
    const instance = this.getInstance();
    return await instance.userService.getUserUploadStats(userId);
  }

  /**
   * 重新加载配置
   */
  static async reloadConfig(): Promise<UnifiedUploadConfig> {
    const instance = this.getInstance();
    return await instance.configService.reloadConfig();
  }

  /**
   * 获取配置统计信息
   */
  static getConfigStatistics(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    lastUpdate: Date | null;
  } {
    const instance = this.getInstance();
    return instance.configManager.getStatistics();
  }

  /**
   * 清除配置缓存
   */
  static clearConfigCache(): void {
    const instance = this.getInstance();
    instance.configService.clearConfigCache();
  }

  // 兼容性方法

  /**
   * 检查是否为视频文件
   */
  static isVideoFile(mimeType: string): boolean {
    return ConfigUtils.isVideoFile(mimeType);
  }

  /**
   * 获取用户限制配置（测试兼容方法）
   */
  static async getUserLimits(userLevel: UserLevel): Promise<UserLevelConfig> {
    return await this.getUserLevelConfig(userLevel);
  }

  /**
   * 获取R2配置（测试兼容方法）
   */
  static async getR2Config(): Promise<any> {
    return await ConfigUtils.getR2Config();
  }

  /**
   * 判断是否应该使用混合上传策略（测试兼容方法）
   */
  static shouldUseHybridStrategy(fileSize: number, userLevel: UserLevel): boolean {
    return ConfigUtils.shouldUseHybridStrategy(fileSize, userLevel);
  }

  /**
   * 获取视频处理配置（测试兼容方法）
   */
  static getVideoProcessingConfig(): any {
    return ConfigUtils.getVideoProcessingConfig();
  }

  /**
   * 清除缓存（公共方法，用于测试）
   */
  static clearCache(): void {
    this.clearConfigCache();
  }

  // 实例方法（用于测试兼容性）

  /**
   * 获取R2配置（实例方法）
   */
  async getR2Config(): Promise<any> {
    return await this.compatibilityAdapter.getR2Config();
  }

  /**
   * 检查是否为视频文件（实例方法）
   */
  isVideoFile(mimeType: string): boolean {
    return this.compatibilityAdapter.isVideoFile(mimeType);
  }

  /**
   * 判断是否应该使用混合上传策略（实例方法）
   */
  shouldUseHybridStrategy(fileSize: number, userLevel: UserLevel): boolean {
    return this.compatibilityAdapter.shouldUseHybridStrategy(fileSize, userLevel);
  }

  /**
   * 获取视频处理配置（实例方法）
   */
  getVideoProcessingConfig(): any {
    return this.compatibilityAdapter.getVideoProcessingConfig();
  }

  /**
   * 获取用户限制配置（实例方法）
   */
  async getUserLimits(userLevel: UserLevel): Promise<UserLevelConfig> {
    return await this.compatibilityAdapter.getUserLimits(userLevel);
  }

  /**
   * 获取配置（实例方法）
   */
  async getConfig(options?: ConfigLoadOptions): Promise<UnifiedUploadConfig> {
    return await this.compatibilityAdapter.getConfig(options);
  }

  /**
   * 清除缓存（实例方法）
   */
  clearCache(): void {
    this.compatibilityAdapter.clearCache();
  }
}

// 导出单例实例
export const uploadConfigManager = UploadConfigManager.getInstance();

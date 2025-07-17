/**
 * @fileoverview 兼容性适配器
 * @description 处理向后兼容的实例方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import {
  UnifiedUploadConfig,
  UserLevelConfig,
  ConfigLoadOptions
} from '../../types/upload-config-types';

import { ConfigService } from '../services/ConfigService';
import { UserService } from '../services/UserService';
import { ConfigUtils } from '../utils/ConfigUtils';

/**
 * 兼容性适配器类
 */
export class CompatibilityAdapter {
  private configService: ConfigService;
  private userService: UserService;

  constructor() {
    this.configService = new ConfigService();
    this.userService = new UserService();
  }

  /**
   * 获取R2配置（实例方法）
   */
  public async getR2Config(): Promise<any> {
    return await ConfigUtils.getR2Config();
  }

  /**
   * 检查是否为视频文件（实例方法）
   */
  public isVideoFile(mimeType: string): boolean {
    return ConfigUtils.isVideoFile(mimeType);
  }

  /**
   * 判断是否应该使用混合上传策略（实例方法）
   */
  public shouldUseHybridStrategy(fileSize: number, userLevel: UserLevel): boolean {
    return ConfigUtils.shouldUseHybridStrategy(fileSize, userLevel);
  }

  /**
   * 获取视频处理配置（实例方法）
   */
  public getVideoProcessingConfig(): any {
    return ConfigUtils.getVideoProcessingConfig();
  }

  /**
   * 获取用户限制配置（实例方法）
   */
  public async getUserLimits(userLevel: UserLevel): Promise<UserLevelConfig> {
    return await this.userService.getUserLimits(userLevel);
  }

  /**
   * 获取配置（实例方法）
   */
  public async getConfig(options?: ConfigLoadOptions): Promise<UnifiedUploadConfig> {
    return await this.configService.getConfig('default', options);
  }

  /**
   * 清除缓存（实例方法）
   */
  public clearCache(): void {
    this.configService.clearConfigCache();
  }

  /**
   * 检查用户上传权限（实例方法）
   */
  public async canUserUpload(
    userId: string,
    userLevel: UserLevel,
    fileSize: number,
    fileCount: number = 1
  ): Promise<{
    canUpload: boolean;
    reason?: string;
    limits?: any;
  }> {
    return await this.userService.canUserUpload(userId, userLevel, fileSize, fileCount);
  }

  /**
   * 更新用户配额使用量（实例方法）
   */
  public async updateUserQuotaUsage(
    userId: string,
    storageUsed: number,
    bandwidthUsed: number
  ): Promise<void> {
    return await this.userService.updateUserQuotaUsage(userId, storageUsed, bandwidthUsed);
  }

  /**
   * 获取用户上传统计（实例方法）
   */
  public async getUserUploadStats(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
  }> {
    return await this.userService.getUserUploadStats(userId);
  }
}

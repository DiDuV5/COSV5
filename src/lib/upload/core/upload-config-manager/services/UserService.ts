/**
 * @fileoverview 用户服务
 * @description 处理用户相关的配置和权限
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import {
  UserLevelConfig,
  UserConfigQueryOptions
} from '../../types/upload-config-types';

import { UserConfigProvider } from '../../providers/user-config-provider';
import { ConfigManager } from '../core/ConfigManager';

/**
 * 用户服务类
 */
export class UserService {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 获取用户级别配置
   */
  public async getUserLevelConfig(
    userLevel: UserLevel,
    options?: UserConfigQueryOptions
  ): Promise<UserLevelConfig> {
    try {
      console.log(`👤 获取用户级别配置: ${userLevel}`);

      const cacheKey = `user_config_${userLevel}_${options?.userId || 'default'}`;
      const cacheManager = this.configManager.getCacheManager();

      // 尝试从缓存获取
      if (options?.useCache !== false) {
        const cached = cacheManager.get(cacheKey);
        if (cached) {
          console.log('✅ 从缓存获取用户配置');
          return cached;
        }
      }

      // 获取用户配置
      const config = await UserConfigProvider.getUserLevelConfig(userLevel);

      // 缓存配置
      cacheManager.set(cacheKey, config, 2 * 60 * 1000); // 2分钟缓存

      console.log(`✅ 用户级别配置获取完成: ${userLevel}`);
      return config || {
        level: userLevel,
        maxFileSize: 1024 * 1024, // 1MB default
        allowedTypes: ['image/jpeg'],
        allowedMimeTypes: ['image/jpeg'],
        uploadQuota: 1024 * 1024 * 100, // 100MB default
        permissions: ['upload'],
        maxFilesPerUpload: 1,
        enableAdvancedFeatures: false
      };

    } catch (error) {
      console.error('❌ 获取用户级别配置失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否可以上传
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
    try {
      console.log(`🔍 检查用户上传权限: ${userId}`);

      const canUpload = await UserConfigProvider.canUserUpload(userId, fileSize, 'application/octet-stream');
      return {
        canUpload,
        reason: canUpload ? undefined : '文件大小或类型不符合要求',
        limits: {
          maxFileSize: fileSize,
          maxFiles: fileCount
        }
      };

    } catch (error) {
      console.error('❌ 检查用户上传权限失败:', error);

      return {
        canUpload: false,
        reason: '检查权限时发生错误'
      };
    }
  }

  /**
   * 更新用户配额使用量
   */
  public async updateUserQuotaUsage(
    userId: string,
    storageUsed: number,
    bandwidthUsed: number
  ): Promise<void> {
    try {
      await UserConfigProvider.updateUserQuotaUsage(userId, storageUsed);

      // 清除相关缓存
      const cacheManager = this.configManager.getCacheManager();
      cacheManager.clearByPattern(`user_config_*_${userId}`);

    } catch (error) {
      console.error('❌ 更新用户配额使用量失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户上传统计
   */
  public async getUserUploadStats(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
  }> {
    try {
      const stats = await UserConfigProvider.getUserUploadStats(userId);
      return {
        totalUploads: stats.totalUploads,
        totalSize: stats.totalSize,
        todayUploads: 0, // 需要从其他地方获取
        thisMonthUploads: 0, // 需要从其他地方获取
        averageFileSize: stats.totalUploads > 0 ? stats.totalSize / stats.totalUploads : 0
      };
    } catch (error) {
      console.error('❌ 获取用户上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户限制配置（兼容方法）
   */
  public async getUserLimits(userLevel: UserLevel): Promise<UserLevelConfig> {
    return await this.getUserLevelConfig(userLevel);
  }
}

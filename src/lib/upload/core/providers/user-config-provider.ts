/**
 * @fileoverview 用户配置提供器
 * @description 负责提供用户相关的配置信息
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type {
  UserLevelConfig,
  UserConfigQueryOptions,
  ConfigCacheOptions
} from '../types/upload-config-types';

/**
 * 用户配置提供器类
 */
export class UserConfigProvider {
  private static instance: UserConfigProvider;
  private configCache = new Map<string, UserLevelConfig>();
  private cacheTimeout = 10 * 60 * 1000; // 10分钟缓存

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): UserConfigProvider {
    if (!UserConfigProvider.instance) {
      UserConfigProvider.instance = new UserConfigProvider();
    }
    return UserConfigProvider.instance;
  }

  /**
   * 获取用户配置
   */
  async getUserConfig(
    userId: string,
    options: UserConfigQueryOptions = {}
  ): Promise<UserLevelConfig | null> {
    try {
      const cacheKey = `user-${userId}`;

      // 检查缓存
      if (options.useCache !== false && this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey) || null;
      }

      // 模拟从数据库获取用户配置
      const config = await this.fetchUserConfigFromDatabase(userId, options);

      if (config) {
        this.configCache.set(cacheKey, config);
      }

      return config;
    } catch (error) {
      console.error('获取用户配置失败:', error);
      return null;
    }
  }

  /**
   * 获取用户级别配置
   */
  async getUserLevelConfig(userLevel: string): Promise<UserLevelConfig | null> {
    try {
      const cacheKey = `level-${userLevel}`;

      // 检查缓存
      if (this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey) || null;
      }

      // 根据用户级别返回配置
      const config = this.getConfigByLevel(userLevel);

      if (config) {
        this.configCache.set(cacheKey, config);
      }

      return config;
    } catch (error) {
      console.error('获取用户级别配置失败:', error);
      return null;
    }
  }

  /**
   * 批量获取用户配置
   */
  async getBatchUserConfigs(
    userIds: string[],
    options: UserConfigQueryOptions = {}
  ): Promise<Map<string, UserLevelConfig>> {
    const configs = new Map<string, UserLevelConfig>();

    try {
      const promises = userIds.map(async (userId) => {
        const config = await this.getUserConfig(userId, options);
        if (config) {
          configs.set(userId, config);
        }
      });

      await Promise.all(promises);
      return configs;
    } catch (error) {
      console.error('批量获取用户配置失败:', error);
      return configs;
    }
  }

  /**
   * 更新用户配置缓存
   */
  updateUserConfigCache(userId: string, config: UserLevelConfig): void {
    const cacheKey = `user-${userId}`;
    this.configCache.set(cacheKey, config);
  }

  /**
   * 清除用户配置缓存
   */
  clearUserConfigCache(userId?: string): void {
    if (userId) {
      const cacheKey = `user-${userId}`;
      this.configCache.delete(cacheKey);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys()),
      timeout: this.cacheTimeout
    };
  }

  /**
   * 从数据库获取用户配置（模拟）
   */
  private async fetchUserConfigFromDatabase(
    userId: string,
    options: UserConfigQueryOptions
  ): Promise<UserLevelConfig | null> {
    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟根据用户ID获取用户级别
    const userLevel = this.mockGetUserLevel(userId);

    return this.getConfigByLevel(userLevel);
  }

  /**
   * 根据级别获取配置
   */
  private getConfigByLevel(userLevel: string): UserLevelConfig {
    const baseConfig = {
      level: userLevel,
      uploadQuota: 1024 * 1024 * 1024, // 1GB
      permissions: ['upload', 'view']
    };

    switch (userLevel.toUpperCase()) {
      case 'GUEST':
        return {
          ...baseConfig,
          maxFileSize: 2 * 1024 * 1024, // 2MB
          allowedTypes: ['image/jpeg', 'image/png'],
          allowedMimeTypes: ['image/jpeg', 'image/png'],
          maxFilesPerUpload: 1,
          enableAdvancedFeatures: false
        };

      case 'USER':
        return {
          ...baseConfig,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
          maxFilesPerUpload: 5,
          enableAdvancedFeatures: false
        };

      case 'VIP':
        return {
          ...baseConfig,
          maxFileSize: 50 * 1024 * 1024, // 50MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
          maxFilesPerUpload: 20,
          enableAdvancedFeatures: true,
          permissions: [...baseConfig.permissions, 'batch_upload']
        };

      case 'CREATOR':
        return {
          ...baseConfig,
          maxFileSize: 100 * 1024 * 1024, // 100MB
          allowedTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'audio/mp3'
          ],
          allowedMimeTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'audio/mp3'
          ],
          maxFilesPerUpload: 100,
          enableAdvancedFeatures: true,
          permissions: [...baseConfig.permissions, 'batch_upload', 'advanced_edit']
        };

      case 'ADMIN':
      case 'SUPER_ADMIN':
        return {
          ...baseConfig,
          maxFileSize: 500 * 1024 * 1024, // 500MB
          allowedTypes: ['*'], // 所有类型
          allowedMimeTypes: ['*'], // 所有类型
          maxFilesPerUpload: 1000,
          enableAdvancedFeatures: true,
          permissions: [
            ...baseConfig.permissions,
            'batch_upload',
            'advanced_edit',
            'admin_upload',
            'system_config'
          ]
        };

      default:
        return {
          ...baseConfig,
          level: 'GUEST',
          maxFileSize: 1 * 1024 * 1024, // 1MB
          allowedTypes: ['image/jpeg'],
          allowedMimeTypes: ['image/jpeg'],
          maxFilesPerUpload: 1,
          enableAdvancedFeatures: false
        };
    }
  }

  /**
   * 模拟获取用户级别
   */
  private mockGetUserLevel(userId: string): string {
    // 模拟根据用户ID返回不同级别
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const levels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN'];
    return levels[Math.abs(hash) % levels.length];
  }

  /**
   * 验证用户权限
   */
  async validateUserPermission(
    userId: string,
    permission: string
  ): Promise<boolean> {
    try {
      const config = await this.getUserConfig(userId);
      return config?.permissions.includes(permission) || false;
    } catch (error) {
      console.error('验证用户权限失败:', error);
      return false;
    }
  }

  /**
   * 获取用户上传限制
   */
  async getUserUploadLimits(userId: string): Promise<{
    maxFileSize: number;
    allowedTypes: string[];
    maxFilesPerUpload: number;
    dailyQuota: number;
  } | null> {
    try {
      const config = await this.getUserConfig(userId);
      if (!config) return null;

      return {
        maxFileSize: config.maxFileSize,
        allowedTypes: config.allowedTypes,
        maxFilesPerUpload: config.maxFilesPerUpload,
        dailyQuota: config.uploadQuota
      };
    } catch (error) {
      console.error('获取用户上传限制失败:', error);
      return null;
    }
  }

  /**
   * 检查用户是否可以上传文件
   */
  async canUserUploadFile(
    userId: string,
    fileSize: number,
    fileType: string
  ): Promise<boolean> {
    try {
      const config = await this.getUserConfig(userId);
      if (!config) return false;

      // 检查文件大小
      if (fileSize > config.maxFileSize) {
        return false;
      }

      // 检查文件类型
      if (!config.allowedTypes.includes('*') &&
          !config.allowedTypes.includes(fileType)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('检查用户上传权限失败:', error);
      return false;
    }
  }

  /**
   * 静态方法：获取用户级别配置
   */
  static async getUserLevelConfig(userLevel: string): Promise<UserLevelConfig | null> {
    const instance = UserConfigProvider.getInstance();
    return instance.getUserLevelConfig(userLevel);
  }

  /**
   * 静态方法：检查用户是否可以上传
   */
  static async canUserUpload(userId: string, fileSize: number, fileType: string): Promise<boolean> {
    const instance = UserConfigProvider.getInstance();
    return instance.canUserUploadFile(userId, fileSize, fileType);
  }

  /**
   * 静态方法：更新用户配额使用情况
   */
  static async updateUserQuotaUsage(userId: string, usedBytes: number): Promise<void> {
    // 模拟更新用户配额使用情况
    console.log(`更新用户 ${userId} 配额使用: ${usedBytes} 字节`);
  }

  /**
   * 静态方法：获取用户上传统计
   */
  static async getUserUploadStats(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    quotaUsed: number;
    quotaRemaining: number;
  }> {
    // 模拟返回用户上传统计
    return {
      totalUploads: 0,
      totalSize: 0,
      quotaUsed: 0,
      quotaRemaining: 1024 * 1024 * 1024 // 1GB
    };
  }
}

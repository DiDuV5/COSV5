/**
 * @fileoverview 权限检查模块
 * @description 处理用户上传权限的检查和验证
 * @author Augment AI
 * @date 2025-07-03
 */

import { UserLevel } from '@/types/user-level';
import { UserLevelConfig } from '../../types/upload-config-types';
import { UserConfigQueries } from '../queries/user-config-queries';

import { DEFAULT_USER_LEVEL_CONFIGS } from '../../types/upload-config-types';

/**
 * 权限检查器类
 */
export class PermissionChecker {

  /**
   * 应用权限限制到配置
   */
  static async applyPermissionLimits(
    config: UserLevelConfig,
    userLevel: UserLevel,
    userId?: string
  ): Promise<UserLevelConfig> {
    try {
      console.log(`🔐 应用权限限制: ${userLevel}, 用户: ${userId || '未指定'}`);

      let finalConfig = { ...config };

      // 检查用户是否有特殊权限限制
      if (userId) {
        const restrictions = await UserConfigQueries.getUserRestrictions(userId);
        if (restrictions) {
          finalConfig = this.applyUserRestrictions(finalConfig, restrictions);
        }
      }

      // 应用系统级别的权限限制
      const systemLimits = await UserConfigQueries.getSystemLimits();
      if (systemLimits) {
        finalConfig = this.applySystemLimits(finalConfig, systemLimits);
      }

      console.log(`✅ 权限限制应用完成: ${userLevel}`);
      return finalConfig;

    } catch (error) {
      console.error('应用权限限制失败:', error);
      return config;
    }
  }

  /**
   * 应用用户特定限制
   */
  private static applyUserRestrictions(
    config: UserLevelConfig,
    restrictions: {
      maxFileSize?: number;
      maxFilesPerUpload?: number;
      maxDailyUploads?: number;
      disabledFeatures?: string[];
    }
  ): UserLevelConfig {
    const restrictedConfig = { ...config };

    // 应用文件大小限制
    if (restrictions.maxFileSize && restrictions.maxFileSize < config.maxFileSize) {
      restrictedConfig.maxFileSize = restrictions.maxFileSize;
      console.log(`📏 应用用户文件大小限制: ${restrictions.maxFileSize}`);
    }

    // 应用文件数量限制
    if (restrictions.maxFilesPerUpload && restrictions.maxFilesPerUpload < config.maxFilesPerUpload) {
      restrictedConfig.maxFilesPerUpload = restrictions.maxFilesPerUpload;
      console.log(`📊 应用用户文件数量限制: ${restrictions.maxFilesPerUpload}`);
    }

    // 应用每日上传限制
    if (restrictions.maxDailyUploads && restrictions.maxDailyUploads < config.maxDailyUploads) {
      restrictedConfig.maxDailyUploads = restrictions.maxDailyUploads;
      console.log(`📅 应用用户每日上传限制: ${restrictions.maxDailyUploads}`);
    }

    // 应用功能禁用
    if (restrictions.disabledFeatures) {
      restrictions.disabledFeatures.forEach(feature => {
        switch (feature) {
          case 'advanced_features':
            restrictedConfig.enableAdvancedFeatures = false;
            console.log(`🚫 禁用高级功能`);
            break;
          case 'priority_upload':
            restrictedConfig.enablePriorityUpload = false;
            console.log(`🚫 禁用优先上传`);
            break;
          case 'batch_upload':
            restrictedConfig.enableBatchUpload = false;
            console.log(`🚫 禁用批量上传`);
            break;
          case 'stream_upload':
            restrictedConfig.enableStreamUpload = false;
            console.log(`🚫 禁用流式上传`);
            break;
        }
      });
    }

    return restrictedConfig;
  }

  /**
   * 应用系统级限制
   */
  private static applySystemLimits(
    config: UserLevelConfig,
    systemLimits: {
      globalMaxFileSize?: number;
      globalMaxDailyUploads?: number;
    }
  ): UserLevelConfig {
    const limitedConfig = { ...config };

    // 应用全局文件大小限制
    if (systemLimits.globalMaxFileSize && config.maxFileSize > systemLimits.globalMaxFileSize) {
      limitedConfig.maxFileSize = systemLimits.globalMaxFileSize;
      console.log(`🌐 应用全局文件大小限制: ${systemLimits.globalMaxFileSize}`);
    }

    // 应用全局每日上传限制
    if (systemLimits.globalMaxDailyUploads && config.maxDailyUploads > systemLimits.globalMaxDailyUploads) {
      limitedConfig.maxDailyUploads = systemLimits.globalMaxDailyUploads;
      console.log(`🌐 应用全局每日上传限制: ${systemLimits.globalMaxDailyUploads}`);
    }

    return limitedConfig;
  }

  /**
   * 检查用户是否可以上传
   */
  static async canUserUpload(
    userId: string,
    userLevel: UserLevel,
    fileSize: number,
    fileCount: number = 1,
    mimeType?: string
  ): Promise<{
    canUpload: boolean;
    reason?: string;
    limits?: {
      dailyUploadsUsed: number;
      dailyUploadsLimit: number;
      storageUsed: number;
      storageLimit: number;
    };
  }> {
    try {
      console.log(`🔍 检查用户上传权限: ${userId}, 文件大小: ${fileSize}, 数量: ${fileCount}`);

      // 获取用户配置（包含权限限制）
      const { personalizedConfig, quotaInfo, restrictions, systemLimits } =
        await UserConfigQueries.getBatchUserConfigData(userId, userLevel);

      // 构建最终配置
      let config = { ...require('../../types/upload-config-types').DEFAULT_USER_LEVEL_CONFIGS[userLevel] };

      if (personalizedConfig) {
        config = { ...config, ...personalizedConfig };
      }

      // 应用权限限制
      config = await this.applyPermissionLimits(config, userLevel, userId);

      // 检查文件大小限制
      if (fileSize > config.maxFileSize) {
        return {
          canUpload: false,
          reason: `文件大小超出限制 (${this.formatFileSize(fileSize)} > ${this.formatFileSize(config.maxFileSize)})`
        };
      }

      // 检查文件数量限制
      if (fileCount > config.maxFilesPerUpload) {
        return {
          canUpload: false,
          reason: `文件数量超出限制 (${fileCount} > ${config.maxFilesPerUpload})`
        };
      }

      // 检查MIME类型限制
      if (mimeType && !this.isMimeTypeAllowed(mimeType, config.allowedMimeTypes)) {
        return {
          canUpload: false,
          reason: `文件类型不被允许: ${mimeType}`
        };
      }

      // 检查每日上传限制
      const dailyUploads = await UserConfigQueries.getDailyUploadCount(userId);
      if (dailyUploads + fileCount > config.maxDailyUploads) {
        return {
          canUpload: false,
          reason: `每日上传数量超出限制`,
          limits: {
            dailyUploadsUsed: dailyUploads,
            dailyUploadsLimit: config.maxDailyUploads,
            storageUsed: quotaInfo?.usedStorage || 0,
            storageLimit: quotaInfo?.storageQuota || -1
          }
        };
      }

      // 检查存储配额
      if (quotaInfo && quotaInfo.storageQuota > 0) {
        if (quotaInfo.usedStorage + fileSize > quotaInfo.storageQuota) {
          return {
            canUpload: false,
            reason: `存储配额不足`,
            limits: {
              dailyUploadsUsed: dailyUploads,
              dailyUploadsLimit: config.maxDailyUploads,
              storageUsed: quotaInfo.usedStorage,
              storageLimit: quotaInfo.storageQuota
            }
          };
        }
      }

      console.log(`✅ 用户可以上传: ${userId}`);
      return { canUpload: true };

    } catch (error) {
      console.error('检查用户上传权限失败:', error);
      return {
        canUpload: false,
        reason: '检查权限时发生错误'
      };
    }
  }

  /**
   * 检查MIME类型是否被允许
   */
  private static isMimeTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
    // 如果允许所有类型
    if (allowedTypes.includes('*')) {
      return true;
    }

    // 精确匹配
    if (allowedTypes.includes(mimeType)) {
      return true;
    }

    // 通配符匹配（如 image/*）
    const category = mimeType.split('/')[0];
    if (allowedTypes.includes(`${category}/*`)) {
      return true;
    }

    return false;
  }

  /**
   * 检查用户是否有特定功能权限
   */
  static async hasFeaturePermission(
    userId: string,
    userLevel: UserLevel,
    feature: 'advanced_features' | 'priority_upload' | 'batch_upload' | 'stream_upload'
  ): Promise<boolean> {
    try {
      // 获取用户限制
      const restrictions = await UserConfigQueries.getUserRestrictions(userId);

      // 检查是否被禁用
      if (restrictions?.disabledFeatures?.includes(feature)) {
        return false;
      }

      // 根据用户级别检查默认权限

      switch (feature) {
        case 'advanced_features':
          return DEFAULT_USER_LEVEL_CONFIGS.USER.enableAdvancedFeatures;
        case 'priority_upload':
          return DEFAULT_USER_LEVEL_CONFIGS.USER.enablePriorityUpload;
        case 'batch_upload':
          return DEFAULT_USER_LEVEL_CONFIGS.USER.enableBatchUpload;
        case 'stream_upload':
          return DEFAULT_USER_LEVEL_CONFIGS.USER.enableStreamUpload;
        default:
          return false;
      }

    } catch (error) {
      console.error('检查功能权限失败:', error);
      return false;
    }
  }

  /**
   * 获取用户权限摘要
   */
  static async getUserPermissionSummary(
    userId: string,
    userLevel: UserLevel
  ): Promise<{
    level: UserLevel;
    maxFileSize: number;
    maxFilesPerUpload: number;
    maxDailyUploads: number;
    allowedMimeTypes: string[];
    features: {
      advancedFeatures: boolean;
      priorityUpload: boolean;
      batchUpload: boolean;
      streamUpload: boolean;
    };
    restrictions: string[];
  }> {
    try {
      // 获取完整配置
      const config = await this.applyPermissionLimits(
        require('../../types/upload-config-types').DEFAULT_USER_LEVEL_CONFIGS[userLevel],
        userLevel,
        userId
      );

      // 获取用户限制
      const restrictions = await UserConfigQueries.getUserRestrictions(userId);

      return {
        level: userLevel,
        maxFileSize: config.maxFileSize,
        maxFilesPerUpload: config.maxFilesPerUpload,
        maxDailyUploads: config.maxDailyUploads,
        allowedMimeTypes: config.allowedMimeTypes,
        features: {
          advancedFeatures: config.enableAdvancedFeatures,
          priorityUpload: config.enablePriorityUpload,
          batchUpload: config.enableBatchUpload,
          streamUpload: config.enableStreamUpload
        },
        restrictions: restrictions?.disabledFeatures || []
      };

    } catch (error) {
      console.error('获取用户权限摘要失败:', error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

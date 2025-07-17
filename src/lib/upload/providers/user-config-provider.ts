/**
 * @fileoverview 用户配置提供器 - 重构版本
 * @description 提供基于用户级别的上传配置（模块化架构）
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { UserLevel } from '@/types/user-level';

// 导入重构后的模块
import {
  UserLevelConfig,
  UserConfigQueryOptions,
  DEFAULT_USER_LEVEL_CONFIGS
} from '../types/upload-config-types';

import { UserConfigQueries } from './queries/user-config-queries';
import { QuotaManager } from './quota/quota-manager';
import { PermissionChecker } from './permissions/permission-checker';
import { UploadStatistics } from './statistics/upload-statistics';

/**
 * 用户配置提供器主类 - 重构版
 */
export class UserConfigProvider {

  /**
   * 获取用户级别配置
   */
  static async getUserLevelConfig(
    userLevel: UserLevel,
    options: Partial<UserConfigQueryOptions> = {}
  ): Promise<UserLevelConfig> {
    try {
      console.log(`👤 获取用户级别配置: ${userLevel}`);
      
      const {
        userId,
        includeQuotas = true,
        includePermissions = true,
        useCache = true
      } = options;

      // 获取基础配置
      let config = { ...DEFAULT_USER_LEVEL_CONFIGS[userLevel] };

      // 如果指定了用户ID，获取个性化配置
      if (userId) {
        const personalizedConfig = await UserConfigQueries.getPersonalizedConfig(userId, useCache);
        if (personalizedConfig) {
          config = { ...config, ...personalizedConfig };
        }
      }

      // 获取配额信息
      if (includeQuotas && userId) {
        const quotaInfo = await UserConfigQueries.getUserQuotaInfo(userId);
        config.storageQuota = quotaInfo.storageQuota;
        config.bandwidthQuota = quotaInfo.bandwidthQuota;
      }

      // 应用权限限制
      if (includePermissions) {
        config = await PermissionChecker.applyPermissionLimits(config, userLevel, userId);
      }

      console.log(`✅ 用户配置获取完成: ${userLevel}`);
      return config;

    } catch (error) {
      console.error('❌ 获取用户级别配置失败:', error);
      
      // 返回默认配置作为降级方案
      return DEFAULT_USER_LEVEL_CONFIGS[userLevel] || DEFAULT_USER_LEVEL_CONFIGS.GUEST;
    }
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
    limits?: {
      dailyUploadsUsed: number;
      dailyUploadsLimit: number;
      storageUsed: number;
      storageLimit: number;
    };
  }> {
    try {
      console.log(`🔍 检查用户上传权限: ${userId}`);
      
      return await PermissionChecker.canUserUpload(userId, userLevel, fileSize, fileCount);

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
  static async updateUserQuotaUsage(
    userId: string,
    storageUsed: number,
    bandwidthUsed: number
  ): Promise<void> {
    try {
      await QuotaManager.updateQuotaUsage(userId, storageUsed, bandwidthUsed);
    } catch (error) {
      console.error('❌ 更新用户配额使用量失败:', error);
      throw error;
    }
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
    try {
      return await UploadStatistics.getUserUploadStats(userId);
    } catch (error) {
      console.error('❌ 获取用户上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户配额使用情况
   */
  static async getUserQuotaUsage(userId: string): Promise<{
    storage: {
      used: number;
      limit: number;
      available: number;
      usagePercentage: number;
    };
    bandwidth: {
      used: number;
      limit: number;
      available: number;
      usagePercentage: number;
    };
  }> {
    try {
      return await QuotaManager.getQuotaUsage(userId);
    } catch (error) {
      console.error('❌ 获取用户配额使用情况失败:', error);
      throw error;
    }
  }

  /**
   * 检查配额是否足够
   */
  static async checkQuotaAvailability(
    userId: string,
    userLevel: UserLevel,
    fileSize: number,
    fileCount: number = 1
  ): Promise<{
    hasQuota: boolean;
    reason?: string;
    quotaInfo?: any;
  }> {
    try {
      return await QuotaManager.checkQuotaAvailability(userId, userLevel, fileSize, fileCount);
    } catch (error) {
      console.error('❌ 检查配额可用性失败:', error);
      return {
        hasQuota: false,
        reason: '检查配额时发生错误'
      };
    }
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
      return await PermissionChecker.hasFeaturePermission(userId, userLevel, feature);
    } catch (error) {
      console.error('❌ 检查功能权限失败:', error);
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
      return await PermissionChecker.getUserPermissionSummary(userId, userLevel);
    } catch (error) {
      console.error('❌ 获取用户权限摘要失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细上传统计
   */
  static async getDetailedUploadStats(userId: string): Promise<{
    basic: {
      totalUploads: number;
      totalSize: number;
      todayUploads: number;
      thisMonthUploads: number;
      averageFileSize: number;
    };
    byType: Array<{
      mimeType: string;
      count: number;
      totalSize: number;
      averageSize: number;
    }>;
    byMonth: Array<{
      month: string;
      uploads: number;
      totalSize: number;
    }>;
    trends: {
      uploadTrend: 'increasing' | 'decreasing' | 'stable';
      sizeTrend: 'increasing' | 'decreasing' | 'stable';
    };
  }> {
    try {
      return await UploadStatistics.getDetailedUploadStats(userId);
    } catch (error) {
      console.error('❌ 获取用户详细上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 检查配额警告
   */
  static async checkQuotaWarnings(userId: string): Promise<{
    hasWarnings: boolean;
    warnings: Array<{
      type: 'storage' | 'bandwidth';
      severity: 'warning' | 'critical';
      message: string;
      usagePercentage: number;
    }>;
  }> {
    try {
      return await QuotaManager.checkQuotaWarnings(userId);
    } catch (error) {
      console.error('❌ 检查配额警告失败:', error);
      return {
        hasWarnings: false,
        warnings: []
      };
    }
  }

  /**
   * 重置用户配额（管理员功能）
   */
  static async resetUserQuota(
    userId: string,
    newStorageQuota?: number,
    newBandwidthQuota?: number
  ): Promise<void> {
    try {
      await QuotaManager.resetUserQuota(userId, newStorageQuota, newBandwidthQuota);
    } catch (error) {
      console.error('❌ 重置用户配额失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统级上传统计（管理员功能）
   */
  static async getSystemUploadStats(): Promise<{
    totalUsers: number;
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
    topUploaders: Array<{
      userId: string;
      username: string;
      uploads: number;
      totalSize: number;
    }>;
    popularTypes: Array<{
      mimeType: string;
      count: number;
      percentage: number;
    }>;
  }> {
    try {
      return await UploadStatistics.getSystemUploadStats();
    } catch (error) {
      console.error('❌ 获取系统级上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户级别统计（管理员功能）
   */
  static async getUserLevelStats(): Promise<Array<{
    userLevel: UserLevel;
    userCount: number;
    totalUploads: number;
    totalSize: number;
    averageUploadsPerUser: number;
    averageSizePerUser: number;
  }>> {
    try {
      return await UploadStatistics.getUserLevelStats();
    } catch (error) {
      console.error('❌ 获取用户级别统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取配额统计信息（管理员功能）
   */
  static async getQuotaStatistics(): Promise<{
    totalUsers: number;
    totalStorageUsed: number;
    totalBandwidthUsed: number;
    averageStorageUsage: number;
    averageBandwidthUsage: number;
    usersNearLimit: number;
  }> {
    try {
      return await QuotaManager.getQuotaStatistics();
    } catch (error) {
      console.error('❌ 获取配额统计信息失败:', error);
      throw error;
    }
  }
}

// 重新导出类型以保持向后兼容
export type {
  UserLevelConfig,
  UserConfigQueryOptions
} from '../types/upload-config-types';

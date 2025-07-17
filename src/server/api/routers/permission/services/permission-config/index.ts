/**
 * @fileoverview 权限配置服务 - 统一导出
 * @description 重构后的权限配置服务，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './validators';
export * from './crud';
export * from './logger';

// 为了完全向后兼容，创建PermissionConfigService类
import type { PrismaClient } from '@prisma/client';
import {
  PermissionConfigUpdateParams,
  BatchPermissionUpdateParams,
  PermissionConfigResponse,
  BatchPermissionConfigResponse,
  PermissionConfigStats,
} from './types';
import { PermissionConfigCRUD } from './crud';

/**
 * 权限配置服务 - 向后兼容包装器
 */
export class PermissionConfigService {
  private crud: PermissionConfigCRUD;

  constructor(private db: PrismaClient) {
    this.crud = new PermissionConfigCRUD(db);
  }

  /**
   * 获取所有权限配置
   */
  async getAllConfigs(): Promise<any[]> {
    return this.crud.getAllConfigs();
  }

  /**
   * 根据用户等级获取权限配置
   */
  async getConfigByLevel(userLevel: string): Promise<any | null> {
    return this.crud.getConfigByLevel(userLevel);
  }

  /**
   * 获取用户的权限配置
   */
  async getUserPermissions(userId: string): Promise<any | null> {
    return this.crud.getUserPermissions(userId);
  }

  /**
   * 更新权限配置 - 增强安全验证
   */
  async updateConfig(
    params: PermissionConfigUpdateParams,
    adminId: string
  ): Promise<PermissionConfigResponse> {
    return this.crud.updateConfig(params, adminId);
  }

  /**
   * 批量更新用户组权限配置
   */
  async batchUpdateUserGroupPermissions(
    params: BatchPermissionUpdateParams,
    adminId: string
  ): Promise<BatchPermissionConfigResponse> {
    return this.crud.batchUpdateUserGroupPermissions(params, adminId);
  }

  /**
   * 重置权限配置为默认值
   */
  async resetConfigToDefault(
    userLevel: string,
    adminId: string
  ): Promise<PermissionConfigResponse> {
    return this.crud.resetConfigToDefault(userLevel, adminId);
  }

  /**
   * 删除权限配置
   */
  async deleteConfig(userLevel: string, adminId: string): Promise<PermissionConfigResponse> {
    return this.crud.deleteConfig(userLevel, adminId);
  }

  /**
   * 获取权限配置统计
   */
  async getConfigStats(): Promise<PermissionConfigStats> {
    return this.crud.getConfigStats();
  }

  // 以下是原有的私有方法，为了向后兼容保留
  /**
   * 验证用户等级
   * @deprecated 请使用 PermissionConfigValidators.validateUserLevel
   */
  private validateUserLevel(userLevel: string): void {
    const validLevels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
    if (!validLevels.includes(userLevel)) {
      throw new Error('无效的用户等级');
    }
  }

  /**
   * 验证权限配置数据
   * @deprecated 请使用 PermissionConfigValidators.validatePermissionConfig
   */
  private validatePermissionConfig(config: any): void {
    if (config.mediaAccessPercentage !== undefined) {
      if (config.mediaAccessPercentage < 0 || config.mediaAccessPercentage > 100) {
        throw new Error('媒体访问百分比必须在0-100之间');
      }
    }

    if (config.dailyMomentsLimit !== undefined && config.dailyMomentsLimit < 0) {
      throw new Error('每日动态限制不能为负数');
    }

    if (config.dailyPostsLimit !== undefined && config.dailyPostsLimit < 0) {
      throw new Error('每日帖子限制不能为负数');
    }

    if (config.maxImagesPerUpload !== undefined && config.maxImagesPerUpload < 0) {
      throw new Error('每次上传图片数量限制不能为负数');
    }

    if (config.maxVideosPerUpload !== undefined && config.maxVideosPerUpload < 0) {
      throw new Error('每次上传视频数量限制不能为负数');
    }
  }

  /**
   * 获取默认权限配置
   * @deprecated 请使用 DEFAULT_PERMISSION_CONFIG 常量
   */
  private getDefaultPermissionConfig() {
    return {
      canPublishMoments: false,
      canPublishPosts: false,
      dailyMomentsLimit: 0,
      dailyPostsLimit: 0,
      canUploadImages: false,
      canUploadVideos: false,
      maxImagesPerUpload: 0,
      maxVideosPerUpload: 0,
      momentMinLength: 1,
      momentMaxLength: 500,
      mediaAccessPercentage: 0,
      canPlayVideos: false,
      canViewRestrictedPreview: false,
      canDownloadImages: false,
    };
  }

  /**
   * 记录权限变更日志
   * @deprecated 请使用 PermissionConfigLogger.logPermissionChange
   */
  private async logPermissionChange(params: {
    adminId: string;
    action: string;
    userLevel: string;
    changes: any;
  }): Promise<void> {
    try {
      // 这里可以记录到专门的审计日志表
      console.log('Permission change logged:', params);
    } catch (error) {
      console.error('Failed to log permission change:', error);
    }
  }

  /**
   * 记录批量权限变更日志
   * @deprecated 请使用 PermissionConfigLogger.logBatchPermissionChange
   */
  private async logBatchPermissionChange(params: {
    adminId: string;
    updates: any[];
    reason?: string;
  }): Promise<void> {
    try {
      console.log(`批量权限更新: ${params.reason || '无原因'}`, {
        updates: params.updates,
        operator: params.adminId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log batch permission change:', error);
    }
  }

  /**
   * 验证管理员权限
   * @deprecated 请使用 PermissionConfigValidators.validateAdminPermission
   */
  private async validateAdminPermission(adminId: string, action: string): Promise<void> {
    const admin = await this.db.user.findUnique({
      where: { id: adminId },
      select: { userLevel: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw new Error('管理员账户不存在或未激活');
    }

    const adminLevels = ['ADMIN', 'SUPER_ADMIN'];
    if (!adminLevels.includes(admin.userLevel)) {
      throw new Error('权限不足：需要管理员权限');
    }
  }

  /**
   * 验证权限配置安全性
   * @deprecated 请使用 PermissionConfigValidators.validatePermissionSecurity
   */
  private async validatePermissionSecurity(
    userLevel: string,
    updateData: any,
    adminId: string
  ): Promise<void> {
    // 检查是否试图给低级用户过高的权限
    const dangerousPermissions = ['canPublishPosts', 'canUploadVideos'];
    const lowLevelUsers = ['GUEST', 'USER'];

    if (lowLevelUsers.includes(userLevel)) {
      for (const permission of dangerousPermissions) {
        if (updateData[permission] === true) {
          // 记录安全事件
          console.warn(`[SECURITY] Admin ${adminId} attempting to grant ${permission} to ${userLevel}`);

          // 对于GUEST用户，完全禁止某些权限
          if (userLevel === 'GUEST' && permission === 'canPublishPosts') {
            throw new Error('不能给访客用户授予发布权限');
          }
        }
      }
    }

    // 检查权限提升攻击
    if (updateData.dailyPostsLimit && updateData.dailyPostsLimit > 1000) {
      console.warn(`[SECURITY] Suspicious high daily limit: ${updateData.dailyPostsLimit} by admin ${adminId}`);
    }
  }

  /**
   * 验证权限配置冲突
   * @deprecated 请使用 PermissionConfigValidators.validatePermissionConflicts
   */
  private validatePermissionConflicts(config: any): void {
    // 检查逻辑冲突
    if (config.canPublishPosts === true && config.canUploadImages === false && config.canUploadVideos === false) {
      throw new Error('允许发布作品但不允许上传任何媒体文件的配置不合理');
    }

    // 检查数值冲突
    if (config.maxImagesPerUpload && config.maxImagesPerUpload > 100) {
      throw new Error('单次上传图片数量不能超过100张');
    }

    if (config.maxVideosPerUpload && config.maxVideosPerUpload > 10) {
      throw new Error('单次上传视频数量不能超过10个');
    }
  }
}

/**
 * 导出服务创建函数 - 保持向后兼容性
 */
export const createPermissionConfigService = (db: PrismaClient) => new PermissionConfigService(db);

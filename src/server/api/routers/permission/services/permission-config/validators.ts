/**
 * @fileoverview 权限配置验证器
 * @description 提供权限配置相关的验证功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import {
  VALID_USER_LEVELS,
  ADMIN_LEVELS,
  LOW_LEVEL_USERS,
  DANGEROUS_PERMISSIONS,
  PERMISSION_LIMITS,
} from './types';

/**
 * 权限配置验证器类
 */
export class PermissionConfigValidators {
  constructor(private db: PrismaClient) {}

  /**
   * 验证用户等级
   */
  validateUserLevel(userLevel: string): void {
    if (!VALID_USER_LEVELS.includes(userLevel)) {
      throw TRPCErrorHandler.validationError('无效的用户等级');
    }
  }

  /**
   * 验证权限配置数据
   */
  validatePermissionConfig(config: any): void {
    // 验证媒体访问百分比
    if (config.mediaAccessPercentage !== undefined) {
      if (
        config.mediaAccessPercentage < PERMISSION_LIMITS.MIN_MEDIA_ACCESS_PERCENTAGE ||
        config.mediaAccessPercentage > PERMISSION_LIMITS.MAX_MEDIA_ACCESS_PERCENTAGE
      ) {
        throw TRPCErrorHandler.validationError(
          `媒体访问百分比必须在${PERMISSION_LIMITS.MIN_MEDIA_ACCESS_PERCENTAGE}-${PERMISSION_LIMITS.MAX_MEDIA_ACCESS_PERCENTAGE}之间`
        );
      }
    }

    // 验证每日动态限制
    if (config.dailyMomentsLimit !== undefined && config.dailyMomentsLimit < 0) {
      throw TRPCErrorHandler.validationError('每日动态限制不能为负数');
    }

    // 验证每日帖子限制
    if (config.dailyPostsLimit !== undefined && config.dailyPostsLimit < 0) {
      throw TRPCErrorHandler.validationError('每日帖子限制不能为负数');
    }

    // 验证每次上传图片数量限制
    if (config.maxImagesPerUpload !== undefined && config.maxImagesPerUpload < 0) {
      throw TRPCErrorHandler.validationError('每次上传图片数量限制不能为负数');
    }

    // 验证每次上传视频数量限制
    if (config.maxVideosPerUpload !== undefined && config.maxVideosPerUpload < 0) {
      throw TRPCErrorHandler.validationError('每次上传视频数量限制不能为负数');
    }

    // 验证动态长度限制
    if (config.momentMinLength !== undefined && config.momentMinLength < 1) {
      throw TRPCErrorHandler.validationError('动态最小长度不能小于1');
    }

    if (config.momentMaxLength !== undefined && config.momentMaxLength < 1) {
      throw TRPCErrorHandler.validationError('动态最大长度不能小于1');
    }

    if (
      config.momentMinLength !== undefined &&
      config.momentMaxLength !== undefined &&
      config.momentMinLength > config.momentMaxLength
    ) {
      throw TRPCErrorHandler.validationError('动态最小长度不能大于最大长度');
    }
  }

  /**
   * 验证管理员权限
   */
  async validateAdminPermission(adminId: string, action: string): Promise<void> {
    const admin = await this.db.user.findUnique({
      where: { id: adminId },
      select: { userLevel: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw TRPCErrorHandler.forbidden('管理员账户不存在或未激活');
    }

    if (!ADMIN_LEVELS.includes(admin.userLevel)) {
      throw TRPCErrorHandler.forbidden('权限不足：需要管理员权限');
    }
  }

  /**
   * 验证权限配置安全性
   */
  async validatePermissionSecurity(
    userLevel: string,
    updateData: any,
    adminId: string
  ): Promise<void> {
    // 检查是否试图给低级用户过高的权限
    if (LOW_LEVEL_USERS.includes(userLevel)) {
      for (const permission of DANGEROUS_PERMISSIONS) {
        if (updateData[permission] === true) {
          // 记录安全事件
          console.warn(
            `[SECURITY] Admin ${adminId} attempting to grant ${permission} to ${userLevel}`
          );

          // 对于GUEST用户，完全禁止某些权限
          if (userLevel === 'GUEST' && permission === 'canPublishPosts') {
            throw TRPCErrorHandler.forbidden('不能给访客用户授予发布权限');
          }
        }
      }
    }

    // 检查权限提升攻击
    if (updateData.dailyPostsLimit && updateData.dailyPostsLimit > PERMISSION_LIMITS.MAX_DAILY_POSTS_LIMIT) {
      console.warn(
        `[SECURITY] Suspicious high daily limit: ${updateData.dailyPostsLimit} by admin ${adminId}`
      );
    }
  }

  /**
   * 验证权限配置冲突
   */
  validatePermissionConflicts(config: any): void {
    // 检查逻辑冲突：允许发布作品但不允许上传任何媒体文件
    if (
      config.canPublishPosts === true &&
      config.canUploadImages === false &&
      config.canUploadVideos === false
    ) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '允许发布作品但不允许上传任何媒体文件的配置不合理'
      );
    }

    // 检查数值冲突：单次上传图片数量限制
    if (config.maxImagesPerUpload && config.maxImagesPerUpload > PERMISSION_LIMITS.MAX_IMAGES_PER_UPLOAD) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        `单次上传图片数量不能超过${PERMISSION_LIMITS.MAX_IMAGES_PER_UPLOAD}张`
      );
    }

    // 检查数值冲突：单次上传视频数量限制
    if (config.maxVideosPerUpload && config.maxVideosPerUpload > PERMISSION_LIMITS.MAX_VIDEOS_PER_UPLOAD) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        `单次上传视频数量不能超过${PERMISSION_LIMITS.MAX_VIDEOS_PER_UPLOAD}个`
      );
    }

    // 检查权限组合冲突：允许上传但限制为0
    if (config.canUploadImages === true && config.maxImagesPerUpload === 0) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '允许上传图片但限制数量为0的配置不合理'
      );
    }

    if (config.canUploadVideos === true && config.maxVideosPerUpload === 0) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '允许上传视频但限制数量为0的配置不合理'
      );
    }

    // 检查发布权限冲突：允许发布但限制为0
    if (config.canPublishMoments === true && config.dailyMomentsLimit === 0) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '允许发布动态但每日限制为0的配置不合理'
      );
    }

    if (config.canPublishPosts === true && config.dailyPostsLimit === 0) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '允许发布作品但每日限制为0的配置不合理'
      );
    }
  }

  /**
   * 验证用户等级是否可以删除
   */
  async validateUserLevelDeletion(userLevel: string): Promise<void> {
    // 检查是否有用户使用此等级
    const usersCount = await this.db.user.count({
      where: { userLevel },
    });

    if (usersCount > 0) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        `无法删除权限配置，还有 ${usersCount} 个用户使用此等级`
      );
    }
  }

  /**
   * 验证批量更新参数
   */
  validateBatchUpdateParams(updates: any[]): void {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw TRPCErrorHandler.validationError('批量更新参数不能为空');
    }

    if (updates.length > 50) {
      throw TRPCErrorHandler.validationError('单次批量更新不能超过50个配置');
    }

    // 验证每个更新项
    for (const update of updates) {
      if (!update.userLevel) {
        throw TRPCErrorHandler.validationError('批量更新中每个项目都必须包含userLevel');
      }
      this.validateUserLevel(update.userLevel);
    }

    // 检查是否有重复的用户等级
    const userLevels = updates.map(update => update.userLevel);
    const uniqueUserLevels = new Set(userLevels);
    if (userLevels.length !== uniqueUserLevels.size) {
      throw TRPCErrorHandler.validationError('批量更新中不能包含重复的用户等级');
    }
  }
}

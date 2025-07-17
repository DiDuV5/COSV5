/**
 * @fileoverview 权限工具函数模块
 * @description 权限检查工具函数和辅助方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import { prisma } from '@/lib/prisma';
import { permissionCacheManager } from './permission-cache';
import {
  type PermissionSummary,
  type UserPermissionConfig,
  PERMISSIONS,
} from './types';

/**
 * 权限检查工具类
 */
export class PermissionUtils {
  /**
   * 检查用户是否有指定权限
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return false;
      }

      const config = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);
      if (!config) {
        return false;
      }

      return this.checkSpecificPermission(permission, config);
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }

  /**
   * 检查用户等级是否满足要求
   */
  static checkUserLevel(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
    const levels: UserLevel[] = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
    const userIndex = levels.indexOf(userLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    return userIndex >= requiredIndex;
  }

  /**
   * 获取用户权限摘要
   */
  static async getPermissionSummary(userId: string): Promise<PermissionSummary | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true, isVerified: true },
      });

      if (!user) {
        return null;
      }

      const config = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);

      return {
        userLevel: user.userLevel as UserLevel,
        isActive: user.isActive,
        isVerified: user.isVerified,
        permissions: config,
      };
    } catch (error) {
      console.error('获取权限摘要失败:', error);
      return null;
    }
  }

  /**
   * 批量检查用户权限
   */
  static async batchCheckPermissions(
    userId: string,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true },
      });

      if (!user || !user.isActive) {
        // 如果用户不存在或未激活，所有权限都为false
        permissions.forEach(permission => {
          result[permission] = false;
        });
        return result;
      }

      const config = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);

      if (!config) {
        // 如果配置不存在，所有权限都为false
        permissions.forEach(permission => {
          result[permission] = false;
        });
        return result;
      }

      // 批量检查权限
      permissions.forEach(permission => {
        result[permission] = this.checkSpecificPermission(permission, config);
      });

      return result;
    } catch (error) {
      console.error('批量权限检查失败:', error);
      // 出错时，所有权限都为false
      permissions.forEach(permission => {
        result[permission] = false;
      });
      return result;
    }
  }

  /**
   * 获取用户可用的权限列表
   */
  static async getUserAvailablePermissions(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return [];
      }

      const config = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);
      if (!config) {
        return [];
      }

      const availablePermissions: string[] = [];
      const allPermissions = Object.values(PERMISSIONS);

      allPermissions.forEach(permission => {
        if (this.checkSpecificPermission(permission, config)) {
          availablePermissions.push(permission);
        }
      });

      return availablePermissions;
    } catch (error) {
      console.error('获取用户可用权限失败:', error);
      return [];
    }
  }

  /**
   * 检查用户是否可以执行特定操作
   */
  static async canUserPerformOperation(
    userId: string,
    operation: string,
    resourceType?: string
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true, isVerified: true },
      });

      if (!user || !user.isActive) {
        return false;
      }

      // 根据操作类型和资源类型判断所需权限
      const requiredPermissions = this.getRequiredPermissionsForOperation(operation, resourceType);

      if (requiredPermissions.length === 0) {
        return true; // 如果不需要特殊权限，默认允许
      }

      const config = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);
      if (!config) {
        return false;
      }

      // 检查是否拥有所有必需的权限
      return requiredPermissions.every(permission =>
        this.checkSpecificPermission(permission, config)
      );
    } catch (error) {
      console.error('检查用户操作权限失败:', error);
      return false;
    }
  }

  /**
   * 获取操作所需的权限列表
   */
  private static getRequiredPermissionsForOperation(
    operation: string,
    resourceType?: string
  ): string[] {
    const permissionMap: Record<string, string[]> = {
      // 上传相关
      'upload_image': [PERMISSIONS.UPLOAD_IMAGES],
      'upload_video': [PERMISSIONS.UPLOAD_VIDEOS],

      // 发布相关
      'publish_post': [PERMISSIONS.PUBLISH_POSTS],
      'publish_moment': [PERMISSIONS.PUBLISH_MOMENTS],

      // 互动相关
      'like_post': [PERMISSIONS.LIKE_POSTS],
      'comment': [PERMISSIONS.COMMENT],
      'follow': [PERMISSIONS.FOLLOW],
      'share': [PERMISSIONS.SHARE],

      // 浏览相关
      'search': [PERMISSIONS.SEARCH_CONTENT],
      'view_tags': [PERMISSIONS.VIEW_TAGS],
    };

    // 根据资源类型调整权限要求
    if (resourceType) {
      const key = `${operation}_${resourceType}`;
      if (permissionMap[key]) {
        return permissionMap[key];
      }
    }

    return permissionMap[operation] || [];
  }

  /**
   * 检查具体权限
   */
  private static checkSpecificPermission(permission: string, config: UserPermissionConfig): boolean {
    switch (permission) {
      case PERMISSIONS.UPLOAD_IMAGES:
        return config.canUploadImages ?? false;
      case PERMISSIONS.UPLOAD_VIDEOS:
        return config.canUploadVideos ?? false;
      case PERMISSIONS.PUBLISH_POSTS:
        return config.canPublishPosts ?? false;
      case PERMISSIONS.PUBLISH_MOMENTS:
        return config.canPublishMoments ?? false;
      case PERMISSIONS.LIKE_POSTS:
        return config.canLikePosts ?? false;
      case PERMISSIONS.COMMENT:
        return config.canComment ?? false;
      case PERMISSIONS.FOLLOW:
        return config.canFollow ?? false;
      case PERMISSIONS.SHARE:
        return config.canShare ?? true;
      case PERMISSIONS.SEARCH_CONTENT:
        return config.canSearchContent ?? true;
      case PERMISSIONS.VIEW_TAGS:
        return config.canViewTags ?? true;
      default:
        return false;
    }
  }

  /**
   * 获取用户等级的权限描述
   */
  static getUserLevelPermissionDescription(userLevel: UserLevel): string {
    const descriptions: Record<UserLevel, string> = {
      'GUEST': '游客权限：仅可浏览公开内容',
      'USER': '普通用户：可评论、点赞、关注',
      'VIP': 'VIP用户：可上传内容、发布作品，享有优先权',
      'CREATOR': '创作者：可管理内容、享有创作者特权',
      'ADMIN': '管理员：可管理用户和内容，拥有管理权限',
      'SUPER_ADMIN': '超级管理员：拥有系统最高权限',
    };

    return descriptions[userLevel] || '未知权限等级';
  }

  /**
   * 检查用户是否可以升级到指定等级
   */
  static async canUpgradeToLevel(userId: string, targetLevel: UserLevel): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          userLevel: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      });

      if (!user || !user.isActive) {
        return false;
      }

      const currentLevel = user.userLevel as UserLevel;

      // 不能降级
      if (!this.checkUserLevel(targetLevel, currentLevel)) {
        return false;
      }

      // 检查升级条件
      switch (targetLevel) {
        case 'VIP':
          return user.isVerified && this.isAccountOldEnough(user.createdAt, 7); // 7天
        case 'CREATOR':
          return user.isVerified && this.isAccountOldEnough(user.createdAt, 30); // 30天
        case 'ADMIN':
        case 'SUPER_ADMIN':
          return false; // 管理员权限需要手动分配
        default:
          return true;
      }
    } catch (error) {
      console.error('检查用户升级权限失败:', error);
      return false;
    }
  }

  /**
   * 检查账户是否足够老
   */
  private static isAccountOldEnough(createdAt: Date, requiredDays: number): boolean {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= requiredDays;
  }

  /**
   * 获取权限等级的数值
   */
  static getUserLevelPriority(userLevel: UserLevel): number {
    const priorities: Record<UserLevel, number> = {
      'GUEST': 0,
      'USER': 1,
      'VIP': 2,
      'CREATOR': 3,
      'ADMIN': 4,
      'SUPER_ADMIN': 5,
    };

    return priorities[userLevel] ?? 0;
  }
}

// 导出工具函数的兼容性接口
export const {
  hasPermission,
  checkUserLevel,
  getPermissionSummary,
  batchCheckPermissions,
  getUserAvailablePermissions,
  canUserPerformOperation,
  getUserLevelPermissionDescription,
  canUpgradeToLevel,
  getUserLevelPriority,
} = PermissionUtils;

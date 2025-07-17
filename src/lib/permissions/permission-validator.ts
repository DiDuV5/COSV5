/**
 * @fileoverview 核心权限验证模块
 * @description 统一权限验证逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel, USER_LEVEL_INFO } from '@/types/user-level';
import { permissionCacheManager } from './permission-cache';
import { resourceAccessController } from './resource-access-control';
import { auditLogManager } from './audit-logger';
import {
  type PermissionOptions,
  type PermissionContext,
  type PermissionValidationResult as _PermissionValidationResult,
  type UserPermissionConfig,
  SECURITY_EVENTS,
} from './types';



/**
 * 权限验证器
 */
export class PermissionValidator {
  /**
   * 权限验证函数 - 增强版本
   */
  async validatePermissions(
    ctx: any,
    options: PermissionOptions = {}
  ): Promise<PermissionContext> {
    const startTime = Date.now();
    const operation = options.operation || 'unknown';

    try {
      // 1. 检查用户是否已登录
      await this.validateUserSession(ctx, options, operation);

      // 2. 获取完整的用户信息（使用缓存）
      const user = await permissionCacheManager.getCachedUserInfo(ctx.session.user.id, ctx.db);

      if (!user) {
        await auditLogManager.logSecurityEvent('USER_NOT_FOUND', {
          userId: ctx.session.user.id,
          operation: options.operation,
        });
        throw TRPCErrorHandler.unauthorized('用户不存在');
      }

      // 3. 检查用户状态
      await this.validateUserStatus(user, options, operation);

      // 4. 检查用户等级权限
      if (options.requiredLevel) {
        await this.validateUserLevel(user, options, operation);
      }

      // 5. 检查发布权限
      if (options.requirePublishPermission) {
        await this.validatePublishPermission(user, options);
      }

      // 6. 检查细粒度资源权限
      if (options.resourceType && options.resourceId) {
        await this.validateResourceAccess(user, options, operation, ctx.db);
      }

      // 7. 检查具体权限
      if (options.requiredPermissions && options.requiredPermissions.length > 0) {
        await this.validateSpecificPermissions(user, options, operation);
      }

      // 8. 记录成功的权限检查（如果启用审计）
      if (options.enableAudit) {
        await auditLogManager.logPermissionAudit({
          userId: user.id,
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'GRANTED',
          reason: 'Permission check passed',
          userLevel: user.userLevel as UserLevel,
          timestamp: new Date(),
        });
      }

      // 9. 记录性能指标
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 100) { // 超过100ms记录慢查询
        console.warn(`权限检查耗时过长: ${duration}ms`, {
          userId: user.id,
          operation,
          duration,
        });
      }

      return {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
        user, // 添加完整的用户信息
        permissionCheckDuration: duration, // 添加性能指标
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 记录失败的权限检查
      if (options.enableAudit && ctx.session?.user?.id) {
        await auditLogManager.logPermissionAudit({
          userId: ctx.session.user.id,
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'DENIED',
          reason: error instanceof Error ? error.message : 'Unknown error',
          userLevel: 'GUEST',
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  /**
   * 验证用户会话
   */
  private async validateUserSession(ctx: any, options: PermissionOptions, operation: string): Promise<void> {
    // 检查用户是否已登录
    if (!ctx.session || !ctx.session.user) {
      await auditLogManager.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        operation,
        timestamp: new Date().toISOString(),
      });

      if (options.enableAudit) {
        await auditLogManager.logPermissionAudit({
          userId: 'anonymous',
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'DENIED',
          reason: 'User not logged in',
          userLevel: 'GUEST',
          timestamp: new Date(),
        });
      }

      throw TRPCErrorHandler.unauthorized('请先登录');
    }

    // 验证会话完整性
    if (!ctx.session.user.id || typeof ctx.session.user.id !== 'string') {
      await auditLogManager.logSecurityEvent('INVALID_SESSION_FORMAT', {
        sessionUser: ctx.session.user,
        operation,
      });

      if (options.enableAudit) {
        await auditLogManager.logPermissionAudit({
          userId: ctx.session.user.id || 'invalid',
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'DENIED',
          reason: 'Invalid session format',
          userLevel: 'GUEST',
          timestamp: new Date(),
        });
      }

      throw TRPCErrorHandler.unauthorized('会话格式无效');
    }
  }

  /**
   * 验证用户状态
   */
  private async validateUserStatus(user: any, options: PermissionOptions, operation: string): Promise<void> {
    // 检查用户是否激活 - 修复逻辑缺陷，默认要求激活
    const requireActive = options.requireActive !== false; // 默认为true
    if (requireActive && !user.isActive) {
      await auditLogManager.logSecurityEvent('INACTIVE_USER_ACCESS_ATTEMPT', {
        userId: user.id,
        username: user.username,
        operation: options.operation,
      });
      throw TRPCErrorHandler.forbidden('用户账户未激活');
    }

    // 检查用户审核状态
    if (user.approvalStatus === 'REJECTED') {
      await auditLogManager.logSecurityEvent('REJECTED_USER_ACCESS_ATTEMPT', {
        userId: user.id,
        username: user.username,
        operation: options.operation,
      });
      throw TRPCErrorHandler.forbidden('用户审核被拒绝，无法执行操作');
    }

    // 检查用户是否验证
    if (options.requireVerified && !user.isVerified) {
      await auditLogManager.logSecurityEvent('UNVERIFIED_USER_ACCESS_ATTEMPT', {
        userId: user.id,
        username: user.username,
        operation: options.operation,
      });
      throw TRPCErrorHandler.forbidden('需要验证用户身份');
    }
  }

  /**
   * 验证用户等级
   */
  private async validateUserLevel(user: any, options: PermissionOptions, operation: string): Promise<void> {
    const hasRequiredLevel = await this.checkUserLevel(
      user.userLevel as UserLevel,
      options.requiredLevel!,
      user.id
    );

    if (!hasRequiredLevel) {
      await auditLogManager.logSecurityEvent('INSUFFICIENT_USER_LEVEL', {
        userId: user.id,
        username: user.username,
        userLevel: user.userLevel,
        requiredLevel: options.requiredLevel,
        operation: options.operation,
      });
      throw TRPCErrorHandler.forbidden(
        `需要${options.requiredLevel}级别权限才能${options.operation || '执行此操作'}`,
        {
          context: {
            userId: user.id,
            userLevel: user.userLevel,
            requiredLevel: options.requiredLevel,
            operation: options.operation
          }
        }
      );
    }
  }

  /**
   * 验证发布权限
   */
  private async validatePublishPermission(user: any, options: PermissionOptions): Promise<void> {
    const permissionConfig = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);

    if (!permissionConfig?.canPublishPosts) {
      throw TRPCErrorHandler.forbidden(
        '您没有发布作品的权限，请联系运营开通权限',
        { context: { userLevel: user.userLevel } }
      );
    }
  }

  /**
   * 验证资源访问权限
   */
  private async validateResourceAccess(user: any, options: PermissionOptions, operation: string, db: any): Promise<void> {
    const hasResourceAccess = await resourceAccessController.checkResourceAccess({
      userId: user.id,
      resourceType: options.resourceType!,
      resourceId: options.resourceId!,
      operation,
      db,
    });

    if (!hasResourceAccess) {
      if (options.enableAudit) {
        await auditLogManager.logPermissionAudit({
          userId: user.id,
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'DENIED',
          reason: 'Insufficient resource access',
          userLevel: user.userLevel as UserLevel,
          timestamp: new Date(),
        });
      }

      throw TRPCErrorHandler.forbidden(
        `没有访问该${options.resourceType}的权限`,
        {
          context: {
            userId: user.id,
            resourceType: options.resourceType,
            resourceId: options.resourceId,
            operation
          }
        }
      );
    }
  }

  /**
   * 验证具体权限
   */
  private async validateSpecificPermissions(user: any, options: PermissionOptions, operation: string): Promise<void> {
    const permissionConfig = await permissionCacheManager.getUserPermissionConfig(user.userLevel as UserLevel);

    if (!permissionConfig) {
      if (options.enableAudit) {
        await auditLogManager.logPermissionAudit({
          userId: user.id,
          operation,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          result: 'DENIED',
          reason: 'Permission config not found',
          userLevel: user.userLevel as UserLevel,
          timestamp: new Date(),
        });
      }

      throw TRPCErrorHandler.forbidden(
        '权限配置不存在，请联系管理员',
        { context: { userLevel: user.userLevel } }
      );
    }

    for (const permission of options.requiredPermissions!) {
      const hasPermission = this.checkSpecificPermission(permission, permissionConfig);
      if (!hasPermission) {
        if (options.enableAudit) {
          await auditLogManager.logPermissionAudit({
            userId: user.id,
            operation,
            resourceType: options.resourceType,
            resourceId: options.resourceId,
            result: 'DENIED',
            reason: `Missing permission: ${permission}`,
            userLevel: user.userLevel as UserLevel,
            timestamp: new Date(),
          });
        }

        throw TRPCErrorHandler.forbidden(
          `权限不足：需要${permission}权限`,
          {
            context: {
              userLevel: user.userLevel,
              requiredPermission: permission,
              operation
            }
          }
        );
      }
    }
  }

  /**
   * 检查用户等级是否满足要求
   */
  private async checkUserLevel(
    userLevel: UserLevel,
    requiredLevel: UserLevel,
    userId: string
  ): Promise<boolean> {
    try {
      const userLevelInfo = USER_LEVEL_INFO[userLevel];
      const requiredLevelInfo = USER_LEVEL_INFO[requiredLevel];

      if (!userLevelInfo || !requiredLevelInfo) {
        await auditLogManager.logSecurityEvent('INVALID_USER_LEVEL', {
          userId,
          userLevel,
          requiredLevel,
        });
        return false;
      }

      return userLevelInfo.priority >= requiredLevelInfo.priority;
    } catch (error) {
      console.error('用户等级验证失败:', error);
      return false;
    }
  }

  /**
   * 检查具体权限
   */
  private checkSpecificPermission(permission: string, config: UserPermissionConfig): boolean {
    switch (permission) {
      case 'UPLOAD_IMAGES':
        return config.canUploadImages ?? false;
      case 'UPLOAD_VIDEOS':
        return config.canUploadVideos ?? false;
      case 'PUBLISH_POSTS':
        return config.canPublishPosts ?? false;
      case 'PUBLISH_MOMENTS':
        return config.canPublishMoments ?? false;
      case 'LIKE_POSTS':
        return config.canLikePosts ?? false;
      case 'COMMENT':
        return config.canComment ?? false;
      case 'FOLLOW':
        return config.canFollow ?? false;
      case 'SHARE':
        return config.canShare ?? true;
      case 'SEARCH_CONTENT':
        return config.canSearchContent ?? true;
      case 'VIEW_TAGS':
        return config.canViewTags ?? true;
      default:
        return false;
    }
  }
}

// 创建默认的权限验证器实例
export const permissionValidator = new PermissionValidator();

/**
 * 权限验证工厂函数
 */
export function createPermissionValidator(options: PermissionOptions) {
  return async (ctx: any) => {
    return await permissionValidator.validatePermissions(ctx, options);
  };
}

/**
 * 兼容性函数 - 保持向后兼容
 */
export async function validatePermissions(
  ctx: any,
  options: PermissionOptions = {}
): Promise<PermissionContext> {
  return permissionValidator.validatePermissions(ctx, options);
}

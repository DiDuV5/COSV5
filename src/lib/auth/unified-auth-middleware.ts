/**
 * @fileoverview 统一认证中间件
 * @description 统一处理所有tRPC路由的认证和权限检查，解决认证逻辑分散问题
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^11.4.2
 * - zod: ^3.22.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2025-06-29: 创建统一认证中间件，替代分散的认证逻辑
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';

/**
 * 用户状态接口
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string | null;
  userLevel: UserLevel;
  isVerified: boolean;
  canPublish: boolean;
  isActive: boolean;
  approvalStatus: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

/**
 * 认证选项接口
 */
export interface AuthMiddlewareOptions {
  /** 需要的最低用户等级 */
  requiredLevel?: UserLevel;
  /** 需要的具体权限 */
  requiredPermissions?: string[];
  /** 是否需要验证用户 */
  requireVerified?: boolean;
  /** 是否需要激活用户 */
  requireActive?: boolean;
  /** 是否需要发布权限 */
  requirePublishPermission?: boolean;
  /** 是否需要审核通过 */
  requireApproved?: boolean;
  /** 操作描述（用于错误消息） */
  operation?: string;
  /** 是否允许待审核用户访问 */
  allowPending?: boolean;
}

/**
 * 基础上下文接口
 */
export interface BaseContext {
  session: {
    user: {
      id: string;
      username?: string;
      email?: string | null; // 修复：允许null类型
      userLevel?: string;
      [key: string]: any;
    };
  } | null;
  prisma: any; // 统一使用prisma作为数据库客户端
  db?: any; // 保持向后兼容
  [key: string]: any;
}

/**
 * 扩展的上下文接口
 */
export interface AuthenticatedContext {
  session: {
    user: {
      id: string;
      username?: string;
      email?: string | null; // 修复：允许null类型
      userLevel?: string;
      [key: string]: any;
    };
  };
  user: AuthenticatedUser;
  prisma: any; // 统一使用prisma作为数据库客户端
  db?: any; // 保持向后兼容
  [key: string]: any;
}

/**
 * 用户等级层级映射
 */
const USER_LEVEL_HIERARCHY: Record<UserLevel, number> = {
  GUEST: 0,
  USER: 1,
  VIP: 2,
  CREATOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * 统一认证中间件核心函数
 *
 * @param ctx - tRPC上下文
 * @param options - 认证选项
 * @returns 扩展的认证上下文
 */
export async function unifiedAuthMiddleware(
  ctx: BaseContext,
  options: AuthMiddlewareOptions = {}
): Promise<AuthenticatedContext> {
  // 1. 检查用户是否已登录
  if (!ctx.session || !ctx.session.user) {
    throw TRPCErrorHandler.unauthorized('请先登录');
  }

  // 2. 从数据库获取完整的用户信息
  const dbClient = ctx.prisma || ctx.db; // 优先使用prisma，向后兼容db
  const user = await dbClient.user.findUnique({
    where: { id: ctx.session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      userLevel: true,
      isVerified: true,
      canPublish: true,
      isActive: true,
      approvalStatus: true,
      avatarUrl: true,
      displayName: true,
    },
  });

  if (!user) {
    throw TRPCErrorHandler.unauthorized('用户不存在');
  }

  // 3. 检查用户是否激活
  if (options.requireActive !== false && !user.isActive) {
    throw TRPCErrorHandler.forbidden(
      '用户账户未激活',
      {
        context: {
          userId: user.id,
          username: user.username,
          operation: options.operation
        }
      }
    );
  }

  // 4. 检查用户审核状态
  if (user.approvalStatus === 'REJECTED') {
    throw TRPCErrorHandler.forbidden(
      '用户审核被拒绝，无法执行操作',
      {
        context: {
          userId: user.id,
          username: user.username,
          approvalStatus: user.approvalStatus,
          operation: options.operation
        }
      }
    );
  }

  // 5. 检查是否需要审核通过
  if (options.requireApproved && user.approvalStatus !== 'APPROVED') {
    if (!options.allowPending || user.approvalStatus !== 'PENDING') {
      throw TRPCErrorHandler.forbidden(
        '需要审核通过才能执行此操作',
        {
          context: {
            userId: user.id,
            username: user.username,
            approvalStatus: user.approvalStatus,
            operation: options.operation
          }
        }
      );
    }
  }

  // 6. 检查用户是否验证
  if (options.requireVerified && !user.isVerified) {
    throw TRPCErrorHandler.forbidden(
      '需要验证用户身份',
      {
        context: {
          userId: user.id,
          username: user.username,
          operation: options.operation
        }
      }
    );
  }

  // 7. 检查用户等级
  if (options.requiredLevel) {
    const userLevelValue = USER_LEVEL_HIERARCHY[user.userLevel as UserLevel];
    const requiredLevelValue = USER_LEVEL_HIERARCHY[options.requiredLevel];

    if (userLevelValue < requiredLevelValue) {
      throw TRPCErrorHandler.forbidden(
        `需要${options.requiredLevel}级别权限才能${options.operation || '执行此操作'}`,
        {
          context: {
            userId: user.id,
            username: user.username,
            userLevel: user.userLevel,
            requiredLevel: options.requiredLevel,
            operation: options.operation
          }
        }
      );
    }
  }

  // 8. 检查发布权限
  if (options.requirePublishPermission && !user.canPublish) {
    throw TRPCErrorHandler.forbidden(
      '您没有发布作品的权限，请联系运营开通权限',
      {
        context: {
          userId: user.id,
          username: user.username,
          userLevel: user.userLevel,
          operation: options.operation
        }
      }
    );
  }

  // 9. 检查具体权限（如果需要）
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    await validateSpecificPermissions(user, options.requiredPermissions, options.operation);
  }

  // 10. 返回扩展的认证上下文
  return {
    ...ctx,
    prisma: dbClient, // 确保返回正确的数据库客户端
    db: ctx.db, // 保持向后兼容
    session: { ...ctx.session, user: ctx.session.user },
    user: user as AuthenticatedUser,
  };
}

/**
 * 验证具体权限
 */
async function validateSpecificPermissions(
  user: any,
  requiredPermissions: string[],
  operation?: string
): Promise<void> {
  // 获取用户权限配置
  const permissionConfig = await getUserPermissionConfig(user.userLevel as UserLevel);

  if (!permissionConfig) {
    throw TRPCErrorHandler.forbidden(
      '权限配置不存在，请联系管理员',
      { context: { userLevel: user.userLevel, operation } }
    );
  }

  for (const permission of requiredPermissions) {
    const hasPermission = checkSpecificPermission(permission, permissionConfig);
    if (!hasPermission) {
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
 * 获取用户权限配置
 */
async function getUserPermissionConfig(userLevel: UserLevel): Promise<any> {
  try {
    const { prisma } = await import('@/lib/prisma');
    return await prisma.userPermissionConfig.findUnique({
      where: { userLevel },
    });
  } catch (error) {
    console.error('获取权限配置失败:', error);
    return null;
  }
}

/**
 * 检查具体权限
 */
function checkSpecificPermission(permission: string, config: any): boolean {
  const permissionMap: Record<string, string> = {
    'UPLOAD_IMAGES': 'canUploadImages',
    'UPLOAD_VIDEOS': 'canUploadVideos',
    'UPLOAD_DOCUMENTS': 'canUploadDocuments',
    'MANAGE_POSTS': 'canManagePosts',
    'MANAGE_USERS': 'canManageUsers',
    'MANAGE_TAGS': 'canManageTags',
    'VIEW_ANALYTICS': 'canViewAnalytics',
    'MODERATE_CONTENT': 'canModerateContent',
  };

  const configField = permissionMap[permission];
  return configField ? Boolean(config[configField]) : false;
}

/**
 * 创建统一认证中间件工厂
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (ctx: BaseContext) => {
    return await unifiedAuthMiddleware(ctx, options);
  };
}

/**
 * 预定义的认证中间件
 */

/** 基础认证 - 只需要登录 */
export const basicAuth = createAuthMiddleware({
  requireActive: true,
});

/** 验证用户认证 - 需要邮箱验证 */
export const verifiedAuth = createAuthMiddleware({
  requireActive: true,
  requireVerified: true,
});

/** 创作者认证 - 需要发布权限 */
export const creatorAuth = createAuthMiddleware({
  requireActive: true,
  requirePublishPermission: true,
  operation: '发布内容',
});

/** 管理员认证 */
export const adminAuth = createAuthMiddleware({
  requiredLevel: 'ADMIN',
  requireActive: true,
  operation: '管理操作',
});

/** 超级管理员认证 */
export const superAdminAuth = createAuthMiddleware({
  requiredLevel: 'SUPER_ADMIN',
  requireActive: true,
  operation: '超级管理操作',
});

/** 上传权限认证 - 修复：只需要基础上传权限，具体权限在业务逻辑中检查 */
export const uploadAuth = createAuthMiddleware({
  requireActive: true,
  operation: '上传文件',
});

/** 图片上传认证 */
export const imageUploadAuth = createAuthMiddleware({
  requireActive: true,
  requiredPermissions: ['UPLOAD_IMAGES'],
  operation: '上传图片',
});

/** 视频上传认证 */
export const videoUploadAuth = createAuthMiddleware({
  requireActive: true,
  requiredPermissions: ['UPLOAD_VIDEOS'],
  operation: '上传视频',
});

/**
 * 权限检查工具函数
 */
export const AuthUtils = {
  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { prisma } = await import('@/lib/prisma');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return false;
      }

      const config = await getUserPermissionConfig(user.userLevel as UserLevel);
      if (!config) {
        return false;
      }

      return checkSpecificPermission(permission, config);
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  },

  /**
   * 检查用户等级是否满足要求
   */
  hasRequiredLevel(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
    const userLevelValue = USER_LEVEL_HIERARCHY[userLevel];
    const requiredLevelValue = USER_LEVEL_HIERARCHY[requiredLevel];
    return userLevelValue >= requiredLevelValue;
  },

  /**
   * 获取用户等级数值
   */
  getLevelValue(userLevel: UserLevel): number {
    return USER_LEVEL_HIERARCHY[userLevel] || 0;
  },
};

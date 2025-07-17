/**
 * @fileoverview 用户路由工具函数
 * @description 包含用户相关的辅助函数和常量
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

/**
 * 支持的头像图片类型
 */
export const SUPPORTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 头像文件最大大小 (30MB)
 */
export const MAX_AVATAR_SIZE = 30 * 1024 * 1024;

/**
 * 验证用户是否存在且活跃
 */
export function validateUserExists(user: { isActive?: boolean } | null | undefined, message = "用户不存在"): void {
  if (!user || !user.isActive) {
    throw TRPCErrorHandler.notFound(message);
  }
}

/**
 * 验证用户不能对自己执行某些操作
 */
export function validateNotSelfAction(currentUserId: string, targetUserId: string, message = "不能对自己执行此操作"): void {
  if (currentUserId === targetUserId) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      message
    );
  }
}

/**
 * 验证关注关系是否存在
 */
export function validateFollowExists(follow: any, message = "未关注该用户"): void {
  if (!follow) {
    throw TRPCErrorHandler.notFound(message);
  }
}

/**
 * 验证关注关系不存在
 */
export function validateFollowNotExists(follow: any, message = "已经关注了该用户"): void {
  if (follow) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.RESOURCE_CONFLICT,
      message
    );
  }
}

/**
 * 验证base64图片数据格式
 */
export function validateAvatarData(avatarData: string): { mimeType: string; base64Data: string; sizeInBytes: number } {
  if (!avatarData.startsWith('data:image/')) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_FILE_TYPE,
      "无效的图片格式"
    );
  }

  const mimeType = avatarData.split(';')[0].split(':')[1];

  if (!SUPPORTED_AVATAR_TYPES.includes(mimeType)) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.UNSUPPORTED_FILE_TYPE,
      "不支持的图片格式，请使用 JPG、PNG 或 WebP"
    );
  }

  const base64Data = avatarData.split(',')[1];
  const sizeInBytes = (base64Data.length * 3) / 4;

  if (sizeInBytes > MAX_AVATAR_SIZE) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.FILE_TOO_LARGE,
      "文件大小不能超过 30MB"
    );
  }

  return { mimeType, base64Data, sizeInBytes };
}

/**
 * 生成头像文件名
 */
export function generateAvatarFilename(userId: string, mimeType: string): string {
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1];
  return `avatar_${userId}_${timestamp}.${extension}`;
}

/**
 * 处理分页游标
 */
export function processPaginationCursor<T extends { id: string }>(
  items: T[],
  limit: number
): { items: T[]; nextCursor: string | undefined } {
  let nextCursor: string | undefined = undefined;

  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem!.id;
  }

  return { items, nextCursor };
}

/**
 * 过滤更新数据中的undefined值
 */
export function filterUndefinedValues(data: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * 验证社交链接权限
 */
export function validateSocialLinksPermission(
  userConfig: any,
  linksCount: number,
  hasCustomLinks: boolean
): void {
  if (!userConfig?.canUseSocialLinks) {
    throw TRPCErrorHandler.forbidden("您的用户等级不允许使用社交账号功能");
  }

  if (linksCount > (userConfig.maxSocialLinks || 10)) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.QUOTA_EXCEEDED,
      `最多只能添加 ${userConfig.maxSocialLinks || 10} 个社交账号`
    );
  }

  if (hasCustomLinks && !userConfig.canUseCustomLinks) {
    throw TRPCErrorHandler.forbidden("您的用户等级不允许使用自定义链接功能");
  }
}

/**
 * 构建用户搜索条件
 */
export function buildUserSearchConditions(query: string) {
  return {
    isActive: true,
    OR: [
      { username: { contains: query } },
      { displayName: { contains: query } },
    ],
  };
}

/**
 * 合并关注用户和其他用户的搜索结果
 */
export function mergeFollowingAndOtherUsers<T>(
  followingUsers: T[],
  otherUsers: T[]
): Array<T & { isFollowing: boolean }> {
  return [
    ...followingUsers.map(user => ({ ...user, isFollowing: true })),
    ...otherUsers.map(user => ({ ...user, isFollowing: false })),
  ];
}

/**
 * 创建关注通知（异步，不影响主流程）
 */
export async function createFollowNotificationSafe(
  followingId: string,
  followerUsername: string
): Promise<void> {
  try {
    const { NotificationHelpers } = await import("@/lib/notification-helpers");
    await NotificationHelpers.createFollowNotification({
      userId: followingId,
      followerUsername,
    });
  } catch (error) {
    console.error("创建关注通知失败:", error);
    // 通知失败不影响关注功能
  }
}

/**
 * 记录操作日志
 */
export function logUserOperation(operation: string, userId: string, details?: any): void {
  console.log(`用户操作: ${operation}, 用户ID: ${userId}`, details ? `, 详情: ${JSON.stringify(details)}` : '');
}

/**
 * 处理头像上传错误
 */
export function handleAvatarUploadError(error: unknown): never {
  console.error('头像上传失败:', error);

  if (error instanceof TRPCError) {
    throw error;
  }

  throw TRPCErrorHandler.internalError("头像上传失败，请重试");
}

/**
 * 处理数据库统计查询错误
 */
export function handleStatsError(error: unknown): never {
  // 结构化日志记录
  console.error('获取统计信息失败:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  throw TRPCErrorHandler.internalError("获取统计信息失败，请稍后重试");
}

/**
 * @fileoverview 管理员功能处理器
 * @description 处理管理员相关的上传功能请求
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UnifiedUploadServiceV2 } from '@/lib/upload/core/unified-upload-service-v2';
import { checkAdminPermission } from '../middleware';
import { isTRPCError, getErrorMessage } from '../utils';
import type { CleanupSessionsResponse } from '../types';
import type { Session } from 'next-auth';
import type { PrismaClient } from '@prisma/client';
import type { UserLevel } from '@/types/user-level';

/**
 * tRPC上下文类型定义 - 兼容实际的tRPC上下文
 */
interface TRPCContext {
  session?: {
    user: {
      id: string;
      userLevel?: string;
    };
  } | null;
  user: {
    id: string;
    userLevel: string;
  };
  db: PrismaClient;
  prisma: PrismaClient;
  [key: string]: unknown; // 允许其他属性以保持兼容性
}

/**
 * 清理过期上传会话处理器（管理员功能）
 */
export async function cleanupExpiredSessionsHandler(ctx: TRPCContext): Promise<CleanupSessionsResponse> {
  try {
    // 检查管理员权限
    checkAdminPermission(
      ctx.user.userLevel as UserLevel,
      ctx.user.id,
      '清理过期上传会话'
    );

    const uploadService = new UnifiedUploadServiceV2();
    await uploadService.initialize();
    const cleanedCount = await uploadService.cleanupExpiredSessions();

    return { cleanedCount };
  } catch (error) {
    console.error('清理过期会话失败:', error);

    // 如果是TRPCErrorHandler抛出的错误，直接重新抛出
    if (isTRPCError(error)) {
      throw error;
    }

    throw TRPCErrorHandler.internalError(
      '清理过期会话失败',
      {
        context: {
          userId: ctx.user.id,
          operation: 'cleanupExpiredSessions',
          error: getErrorMessage(error)
        }
      }
    );
  }
}

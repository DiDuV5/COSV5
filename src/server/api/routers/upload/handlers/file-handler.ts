/**
 * @fileoverview 文件处理器
 * @description 处理文件相关的请求
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UnifiedUploadServiceV2 } from '@/lib/upload/core/unified-upload-service-v2';
import { checkUploadPermission } from '../middleware';
import { isTRPCError, getErrorMessage, isAdmin, isFileOwner } from '../utils';
import type {
  UpdateMediaOrderInput,
  DeleteMediaInput,
  SuccessResponse,
  UserUploadStatsResponse
} from '../types';
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

// processFileEnhancedHandler 已移除，请使用统一上传API: api.upload.upload

/**
 * 更新媒体文件顺序处理器
 */
export async function updateMediaOrderHandler(
  input: UpdateMediaOrderInput,
  ctx: TRPCContext
): Promise<SuccessResponse> {
  try {
    // 检查用户权限（使用新的函数签名）
    await checkUploadPermission(
      ctx.user.userLevel as UserLevel,
      ctx.user.id,
      'updateMediaOrder',
      'updateMediaOrder' // 使用操作名作为mimeType参数
    );

    // 使用统一上传服务V2更新媒体顺序
    const uploadService = new UnifiedUploadServiceV2();
    await uploadService.initialize();
    await uploadService.updateMediaOrder(input.mediaUpdates);

    return {
      success: true,
      message: '媒体文件顺序更新成功',
    };
  } catch (error) {
    console.error('更新媒体文件顺序失败:', error);

    // 如果是TRPCErrorHandler抛出的错误，直接重新抛出
    if (isTRPCError(error)) {
      throw error;
    }

    throw TRPCErrorHandler.internalError(
      '更新媒体文件顺序失败',
      {
        context: {
          userId: ctx.user.id,
          mediaUpdatesCount: input.mediaUpdates.length,
          operation: 'updateMediaOrder',
          error: getErrorMessage(error)
        }
      }
    );
  }
}

/**
 * 删除媒体文件处理器
 */
export async function deleteMediaHandler(
  input: DeleteMediaInput,
  ctx: TRPCContext
): Promise<SuccessResponse> {
  try {
    // 检查用户权限（使用新的函数签名）
    await checkUploadPermission(
      ctx.user.userLevel as UserLevel,
      ctx.user.id,
      'deleteMedia',
      'deleteMedia' // 使用操作名作为mimeType参数
    );

    // 获取媒体文件信息以验证权限
    const media = await ctx.db.postMedia.findUnique({
      where: { id: input.mediaId },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
          }
        }
      }
    });

    if (!media) {
      throw TRPCErrorHandler.notFound(
        '媒体文件不存在',
        {
          context: { mediaId: input.mediaId, userId: ctx.user.id }
        }
      );
    }

    // 检查是否有权限删除（文件所有者或管理员）
    const hasPermission = isFileOwner(ctx.user.id, media.post?.authorId || '') || isAdmin(ctx.user.userLevel);

    if (!hasPermission) {
      throw TRPCErrorHandler.forbidden(
        '无权限删除此媒体文件',
        {
          context: {
            mediaId: input.mediaId,
            userId: ctx.user.id,
            postAuthorId: media.post?.authorId
          }
        }
      );
    }

    // 使用统一上传服务V2删除媒体文件
    const uploadService = new UnifiedUploadServiceV2();
    await uploadService.initialize();
    await uploadService.deleteMedia(input.mediaId);

    return {
      success: true,
      message: '媒体文件删除成功',
    };
  } catch (error) {
    console.error('删除媒体文件失败:', error);

    // 如果是TRPCErrorHandler抛出的错误，直接重新抛出
    if (isTRPCError(error)) {
      throw error;
    }

    throw TRPCErrorHandler.internalError(
      '删除媒体文件失败',
      {
        context: {
          mediaId: input.mediaId,
          userId: ctx.user.id,
          operation: 'deleteMedia',
          error: getErrorMessage(error)
        }
      }
    );
  }
}

/**
 * 获取用户上传统计处理器
 */
export async function getUserUploadStatsHandler(ctx: TRPCContext): Promise<UserUploadStatsResponse> {
  try {
    const uploadService = new UnifiedUploadServiceV2();
    await uploadService.initialize();
    const stats = await uploadService.getUserUploadStats(ctx.user.id);
    return stats;
  } catch (error) {
    console.error('获取用户上传统计失败:', error);
    throw TRPCErrorHandler.internalError(
      '获取上传统计失败',
      {
        context: {
          userId: ctx.user.id,
          error: getErrorMessage(error)
        }
      }
    );
  }
}

/**
 * @fileoverview 媒体处理器
 * @description 处理媒体文件相关的请求
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import type { MediaProcessResponse } from '../types';
import { getErrorMessage, isTRPCError } from '../utils';
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
      canPublish?: boolean;
    };
  } | null;
  user: {
    id: string;
    userLevel: string;
    canPublish: boolean;
  };
  db: PrismaClient;
  prisma: PrismaClient;
  [key: string]: unknown; // 允许其他属性以保持兼容性
}

/**
 * 媒体处理输入类型
 */
interface MediaProcessInput {
  filename: string;
  fileData: string;
  mimeType?: string;
  postId?: string;
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  autoTranscode?: boolean;
  imageQuality?: number;
}

/**
 * 处理媒体高级功能处理器
 */
export async function processMediaAdvancedHandler(
  input: MediaProcessInput,
  ctx: TRPCContext
): Promise<MediaProcessResponse> {
  try {
    // 简化权限检查（临时修复）
    if (!ctx.user.canPublish) {
      throw TRPCErrorHandler.forbidden('用户没有发布权限');
    }

    // 简化文件数据处理
    const mimeType = input.mimeType || 'application/octet-stream';

    // 使用统一上传服务处理文件
    console.log('🚀 使用统一上传服务处理文件:', input.filename);

    // 解析文件数据 - 正确处理data URL格式
    const base64Data = input.fileData.includes(',') ? input.fileData.split(',')[1] : input.fileData;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const uploadRequest = {
      filename: input.filename,
      buffer: fileBuffer,
      mimeType: mimeType,
      userId: ctx.user.id,
      userLevel: ctx.user.userLevel as UserLevel,
      postId: input.postId,
      enableDeduplication: input.enableDeduplication ?? true,
      generateThumbnails: input.generateThumbnails ?? true,
      autoTranscodeVideo: input.autoTranscode ?? true, // 默认启用视频转码
      imageQuality: input.imageQuality ?? 85,
    };

    // 使用统一上传服务处理文件
    const { getUnifiedUploadService } = await import('@/lib/upload/core/unified-upload-service-v2');
    const unifiedUploadService = await getUnifiedUploadService();
    const result = await unifiedUploadService.processUpload(uploadRequest);

    // 检查上传结果
    if (!result.success) {
      throw TRPCErrorHandler.uploadError(
        'UPLOAD_FAILED',
        '媒体文件处理失败',
        {
          context: {
            filename: input.filename,
            userId: ctx.user.id,
            operation: 'processMediaAdvanced'
          }
        }
      );
    }

    // 确定媒体类型
    const mediaType = mimeType.startsWith('video/') ? 'VIDEO' :
                     mimeType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

    return {
      success: true,
      file: {
        id: result.fileId,
        filename: result.filename,
        originalName: result.originalFilename,
        url: result.url,
        cdnUrl: result.cdnUrl || result.url,
        thumbnailUrl: result.thumbnailUrl, // 确保缩略图URL被正确返回
        mediaType: mediaType,
        fileSize: result.size,
        width: result.width,
        height: result.height,
        duration: result.duration,
        isDuplicate: false,
        // 添加缩略图相关信息（如果存在）
        ...(result.thumbnailSizes && {
          thumbnails: result.thumbnailSizes.map((thumb) => ({
            url: thumb.url,
            cdnUrl: thumb.url,
            width: thumb.width,
            height: thumb.height,
            size: thumb.size
          }))
        }),
        ...(mediaType === 'IMAGE' && result.thumbnailSizes && {
          processedImages: result.thumbnailSizes.map((thumb) => ({
            url: thumb.url,
            width: thumb.width,
            height: thumb.height,
            size: thumb.size || 0,
            format: 'jpeg'
          }))
        }),
      },
    };

  } catch (error) {
    console.error('processMediaAdvanced错误:', error);

    // 如果是TRPCErrorHandler抛出的错误，直接重新抛出
    if (isTRPCError(error)) {
      throw error;
    }

    throw TRPCErrorHandler.internalError(
      getErrorMessage(error) || '处理媒体文件时发生未知错误',
      {
        context: {
          filename: input.filename,
          operation: 'processMediaAdvanced',
          error: getErrorMessage(error)
        }
      }
    );
  }
}

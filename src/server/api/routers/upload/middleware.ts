/**
 * @fileoverview 上传路由中间件
 * @description 提供上传相关的中间件和权限检查
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { validateFileStrict } from '@/lib/upload/strict-file-security-validator';
import { videoCodecValidator } from '@/lib/upload/video-codec-validator';
import { uploadConfigManager as _uploadConfigManager } from '@/lib/upload/core/upload-config-manager';
import { detectMimeTypeFromBuffer } from './utils';
import { UserLevel } from '@/types/user-level';

/**
 * 统一权限验证系统 - 完全基于UserPermissionConfig表
 */
export async function checkUploadPermission(
  userLevel: UserLevel,
  userId: string,
  operation: string,
  mimeType: string
): Promise<void> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // 获取用户权限配置
    const permissionConfig = await prisma.userPermissionConfig.findUnique({
      where: { userLevel },
      select: {
        canUploadImages: true,
        canUploadVideos: true,
        canPublishPosts: true,
        canPublishMoments: true,
        maxImagesPerUpload: true,
        maxVideosPerUpload: true,
        dailyPostsLimit: true,
        dailyMomentsLimit: true,
      },
    });

    if (!permissionConfig) {
      throw TRPCErrorHandler.forbidden(
        `用户等级 ${userLevel} 的权限配置不存在`,
        {
          context: { userId, operation, userLevel, mimeType }
        }
      );
    }

    // 检查文件类型权限
    const isVideo = mimeType.startsWith('video/');
    const isImage = mimeType.startsWith('image/');
    const isGif = mimeType === 'image/gif';

    if (isVideo && !permissionConfig.canUploadVideos) {
      throw TRPCErrorHandler.forbidden(
        '您没有上传视频的权限',
        {
          context: {
            userId,
            operation,
            userLevel,
            mimeType,
            requiredPermission: 'canUploadVideos',
            currentValue: false
          }
        }
      );
    }

    if ((isImage || isGif) && !permissionConfig.canUploadImages) {
      throw TRPCErrorHandler.forbidden(
        '您没有上传图片的权限',
        {
          context: {
            userId,
            operation,
            userLevel,
            mimeType,
            requiredPermission: 'canUploadImages',
            currentValue: false
          }
        }
      );
    }

    // 检查发布权限（上传文件通常需要发布权限）
    const hasPublishPermission = permissionConfig.canPublishPosts || permissionConfig.canPublishMoments;
    if (!hasPublishPermission) {
      throw TRPCErrorHandler.forbidden(
        '您没有发布内容的权限，无法上传文件',
        {
          context: {
            userId,
            operation,
            userLevel,
            canPublishPosts: permissionConfig.canPublishPosts,
            canPublishMoments: permissionConfig.canPublishMoments
          }
        }
      );
    }

    await prisma.$disconnect();

    console.log(`✅ 权限验证通过: 用户${userId} (${userLevel}) 可以上传 ${mimeType}`);

  } catch (error: unknown) {
    // 如果是TRPCError，直接抛出
    if (error instanceof Error && error.name === 'TRPCError') {
      throw error;
    }

    // 其他错误，包装后抛出
    console.error('❌ 权限检查系统错误:', error);
    throw TRPCErrorHandler.internalError(
      `权限检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
      {
        context: { userId, operation, userLevel, mimeType }
      }
    );
  }
}

/**
 * 检查管理员权限
 */
export function checkAdminPermission(
  userLevel: UserLevel,
  userId: string,
  operation: string
) {
  TRPCErrorHandler.validateUserLevel(
    userLevel,
    'ADMIN',
    operation,
    {
      context: { userId, operation }
    }
  );
}

/**
 * 执行文件安全验证
 */
export async function performSecurityValidation(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userLevel: UserLevel,
  userId: string,
  req: Request,
  operation: string
) {
  const securityValidation = await validateFileStrict(
    fileBuffer,
    filename,
    mimeType,
    userLevel,
    {
      strictMode: false, // 不启用严格模式，避免误拒正常文件
      throwOnError: true,
      logViolations: true,
      userId,
      ipAddress: req?.headers?.get('x-forwarded-for') || 'unknown',
      userAgent: req?.headers?.get('user-agent') || 'unknown',
    }
  );

  // 如果验证失败，记录安全事件并抛出错误
  if (!securityValidation.isValid || !securityValidation.isSafe) {
    console.warn(`文件安全验证失败: ${filename}`, {
      userId,
      errors: securityValidation.errors,
      riskLevel: securityValidation.riskLevel,
    });

    throw TRPCErrorHandler.fileSecurityError(
      filename,
      mimeType,
      securityValidation.errors.join('; '),
      '文件类型不安全，禁止上传',
      {
        userLevel,
        context: {
          securityValidation,
          userId,
          operation,
        },
      }
    );
  }

  return securityValidation;
}

/**
 * 检查视频编码并确定是否需要转码
 */
export async function checkVideoTranscoding(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<boolean> {
  let needsTranscoding = false;

  if (mimeType && mimeType.startsWith('video/')) {
    try {
      const codecValidation = await videoCodecValidator.validateVideoCodec(fileBuffer, filename);

      if (!codecValidation.isValid) {
        console.log(`检测到非H.264编码视频: ${filename}, 当前编码: ${codecValidation.currentCodec}, 将自动转码为H.264`);
        needsTranscoding = true;
      }
    } catch (error) {
      console.warn('视频编码检测失败，将尝试自动转码:', error);
      needsTranscoding = true;
    }
  }

  return needsTranscoding;
}

/**
 * 处理文件数据并获取MIME类型
 */
export function processFileData(fileData: string, filename: string, providedMimeType?: string) {
  // 正确处理data URL格式的base64数据
  const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
  const fileBuffer = Buffer.from(base64Data, 'base64');
  const mimeType = providedMimeType || detectMimeTypeFromBuffer(fileBuffer, filename);

  return { fileBuffer, mimeType };
}

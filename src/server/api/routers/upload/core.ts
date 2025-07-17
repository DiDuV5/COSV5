/**
 * @fileoverview 核心上传逻辑模块
 * @description 包含主要的上传API端点：upload, optimizedUpload, streamUpload等
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { z } from 'zod';
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
  uploadProcedure,
} from '../../trpc';

// 导入类型和处理器
import {
  cancelUploadSchema,
  getUploadProgressSchema,
  streamUploadChunkSchema,
  streamUploadInitSchema,
  streamUploadProgressSchema,
  unifiedUploadSchema,
} from './types';

/**
 * 统一上传处理函数 - 减少重复代码
 */
async function processUnifiedUpload(ctx: any, input: any, deprecatedEndpoint?: string) {
  try {
    if (deprecatedEndpoint) {
      console.warn(`⚠️ 使用了废弃的端点: ${deprecatedEndpoint}，请迁移到 upload 端点`);
    }

    console.log(`🚀 统一上传API开始处理: ${input.filename}`);

    // 使用统一上传服务V2 - 单例模式
    const { getUnifiedUploadService } = await import('@/lib/upload/core/unified-upload-service-v2');
    const processor = await getUnifiedUploadService();

    // 转换输入格式
    const uploadInput = {
      filename: input.filename,
      buffer: Buffer.from(input.fileData, 'base64'),
      mimeType: input.mimeType,
      userId: ctx.user.id,
      userLevel: ctx.user.userLevel,
      postId: input.postId,
      enableDeduplication: input.enableDeduplication,
      generateThumbnails: input.generateThumbnails,
      autoTranscodeVideo: input.autoTranscode,
      customMetadata: input.metadata,
    };

    const result = await processor.processUpload(uploadInput);

    console.log(`✅ 统一上传API处理完成: ${input.filename}`);
    console.log(`🔍 原始上传结果:`, JSON.stringify(result, null, 2));

    // 转换为前端期望的格式
    const formattedResult = {
      success: result.success,
      fileId: result.fileId,
      filename: result.filename,
      originalFilename: result.originalFilename,
      url: result.url,
      cdnUrl: result.cdnUrl || result.url,
      thumbnailUrl: result.thumbnailUrl, // 确保缩略图URL被包含
      mediaType: input.mimeType?.startsWith('video/') ? 'VIDEO' :
                 input.mimeType?.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
      // 使用处理后的文件大小（如果有压缩）
      fileSize: result.processedSize || result.size,
      originalFileSize: result.size, // 保留原始文件大小用于对比
      width: result.width,
      height: result.height,
      duration: result.duration,
      isDuplicate: false,
      // 添加压缩信息
      compressionApplied: result.compressionApplied || false,
      compressionRatio: result.compressionRatio || 0,
      // 添加缩略图相关信息（如果存在）
      ...(result.thumbnailSizes && {
        thumbnails: result.thumbnailSizes.map((thumb: any) => ({
          url: thumb.url,
          cdnUrl: thumb.url,
          width: thumb.width,
          height: thumb.height,
          size: thumb.size
        }))
      }),
      // 为图片添加处理后的图片信息
      ...(input.mimeType?.startsWith('image/') && result.thumbnailSizes && {
        processedImages: result.thumbnailSizes.map((thumb: any) => ({
          url: thumb.url,
          width: thumb.width,
          height: thumb.height,
          size: thumb.size || 0,
          format: 'jpeg'
        }))
      }),
    };

    console.log(`🎯 格式化后的上传结果:`, JSON.stringify(formattedResult, null, 2));
    return formattedResult;

  } catch (error) {
    console.error(`❌ 统一上传API处理失败: ${input.filename}`, error);
    throw TRPCErrorHandler.uploadError(
      'UPLOAD_FAILED',
      `上传失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

// 移除Handler层，直接在Router中处理逻辑
// 简化的内存存储替代复杂的Handler层
const uploadSessions = new Map<string, {
  sessionId: string;
  filename: string;
  fileSize: number;
  uploadedBytes: number;
  status: 'active' | 'completed' | 'cancelled' | 'error';
  chunks: Buffer[];
  createdAt: Date;
  lastActivity: Date;
}>();

/**
 * 核心上传路由
 */
export const coreUploadRouter = createTRPCRouter({
  // 获取上传配置（直接实现，移除Handler层）
  getUploadConfig: publicProcedure.query(async ({ ctx: _ctx }) => {
    try {
      return {
        maxFileSize: 1000 * 1024 * 1024, // 1GB
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
        enableDeduplication: true,
        imageQuality: 85,
        enableThumbnails: true,
        maxFilesPerPost: 10,
        chunkSize: 5 * 1024 * 1024, // 5MB
        maxConcurrentUploads: 3,
      };
    } catch (error) {
      console.error('获取上传配置失败:', error);
      throw TRPCErrorHandler.internalError(
        '获取上传配置失败',
        { context: { error: error instanceof Error ? error.message : String(error) } }
      );
    }
  }),

  // 获取优化上传配置（临时兼容性实现）
  getOptimizedUploadConfig: publicProcedure.query(async ({ ctx: _ctx }) => {
    return {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
      chunkSize: 5 * 1024 * 1024, // 5MB
      strategy: 'unified'
    };
  }),

  // 获取上传策略推荐
  getUploadStrategyRecommendation: publicProcedure
    .input(z.object({
      filename: z.string(),
      fileSize: z.number().positive(),
      mimeType: z.string(),
    }))
    .query(async ({ ctx: _ctx, input }) => {
      return {
        strategy: input.fileSize > 50 * 1024 * 1024 ? 'chunked' : 'direct',
        chunkSize: 5 * 1024 * 1024,
        maxConcurrency: 3
      };
    }),

  // 验证上传请求
  validateUploadRequest: publicProcedure
    .input(z.object({
      filename: z.string(),
      fileSize: z.number().positive(),
      mimeType: z.string(),
    }))
    .query(async ({ ctx: _ctx, input }) => {
      const maxSize = 1000 * 1024 * 1024; // 1000MB (1GB)
      const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];

      return {
        valid: input.fileSize <= maxSize && allowedTypes.includes(input.mimeType),
        maxSize,
        allowedTypes
      };
    }),

  // 获取统一用户配置（临时兼容性实现）
  getUserUploadConfig: authProcedure
    .query(async ({ ctx }) => {
      return {
        maxFileSize: 1000 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
        userLevel: ctx.user.userLevel
      };
    }),

  // 统一上传API - 主要上传入口
  upload: uploadProcedure
    .input(unifiedUploadSchema)
    .mutation(async ({ ctx, input }) => {
      return processUnifiedUpload(ctx, input);
    }),

  // 废弃的端点 - 保持向后兼容性
  optimizedUpload: uploadProcedure
    .input(unifiedUploadSchema)
    .mutation(async ({ ctx, input }) => {
      return processUnifiedUpload(ctx, input, 'optimizedUpload');
    }),

  // 流式上传初始化
  streamUploadInit: uploadProcedure
    .input(streamUploadInitSchema)
    .mutation(async ({ ctx: _ctx, input }) => {
      try {
        console.log(`🌊 初始化流式上传: ${input.filename} (${input.fileSize} bytes)`);

        // 创建上传会话（直接实现）
        const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session = {
          sessionId,
          filename: input.filename,
          fileSize: input.fileSize,
          uploadedBytes: 0,
          status: 'active' as const,
          chunks: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        };

        uploadSessions.set(sessionId, session);

        console.log(`✅ 流式上传会话创建成功: ${sessionId}`);
        return {
          sessionId,
          chunkSize: 5 * 1024 * 1024, // 5MB
          maxConcurrency: 3,
          session
        };

      } catch (error) {
        console.error(`❌ 初始化流式上传失败: ${input.filename}`, error);
        throw TRPCErrorHandler.uploadError(
          'UPLOAD_FAILED',
          `初始化流式上传失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),

  // 流式上传分片
  streamUploadChunk: uploadProcedure
    .input(streamUploadChunkSchema)
    .mutation(async ({ ctx: _ctx, input }) => {
      try {
        console.log(`📦 处理流式上传分片: ${input.sessionId} - 分片 ${input.chunkIndex}`);

        // 解码分片数据
        const chunkBuffer = Buffer.from(input.chunkData, 'base64');

        // 更新上传进度（直接实现）
        const session = uploadSessions.get(input.sessionId);
        if (!session) {
          throw TRPCErrorHandler.notFound('上传会话不存在');
        }

        session.chunks.push(chunkBuffer);
        session.uploadedBytes += chunkBuffer.length;
        session.lastActivity = new Date();

        if (session.uploadedBytes >= session.fileSize) {
          session.status = 'completed';
        }

        console.log(`✅ 流式上传分片处理完成: ${input.sessionId} - 分片 ${input.chunkIndex}`);
        return {
          success: true,
          chunkIndex: input.chunkIndex,
          sessionId: input.sessionId
        };

      } catch (error) {
        console.error(`❌ 处理流式上传分片失败: ${input.sessionId}`, error);
        throw TRPCErrorHandler.uploadError(
          'UPLOAD_FAILED',
          `处理分片失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),

  // 流式上传进度查询
  streamUploadProgress: authProcedure
    .input(streamUploadProgressSchema)
    .query(async ({ ctx: _ctx, input }) => {
      try {
        // 获取上传进度（直接实现）
        const session = uploadSessions.get(input.sessionId);
        if (!session) {
          throw TRPCErrorHandler.notFound('上传会话不存在');
        }

        const progress = Math.round((session.uploadedBytes / session.fileSize) * 100);
        return {
          sessionId: session.sessionId,
          progress,
          uploadedBytes: session.uploadedBytes,
          totalBytes: session.fileSize,
          status: session.status,
          filename: session.filename,
        };
      } catch (error) {
        console.error(`❌ 获取流式上传进度失败: ${input.sessionId}`, error);
        throw TRPCErrorHandler.internalError(
          `获取上传进度失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),

  // 流式上传取消
  streamUploadCancel: authProcedure
    .input(streamUploadProgressSchema)
    .mutation(async ({ ctx: _ctx, input }) => {
      try {
        console.log(`🚫 取消流式上传: ${input.sessionId}`);

        // 取消上传（直接实现）
        const session = uploadSessions.get(input.sessionId);
        if (!session) {
          throw TRPCErrorHandler.notFound('上传会话不存在');
        }

        session.status = 'cancelled';
        session.lastActivity = new Date();

        console.log(`✅ 流式上传取消成功: ${input.sessionId}`);
        return {
          success: true,
          sessionId: input.sessionId,
          message: '上传已取消',
        };

      } catch (error) {
        console.error(`❌ 取消流式上传失败: ${input.sessionId}`, error);
        throw TRPCErrorHandler.internalError(
          `取消上传失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),

  // 获取上传进度（用于分片上传）- 直接实现
  getUploadProgress: authProcedure
    .input(getUploadProgressSchema)
    .query(async ({ ctx: _ctx, input }) => {
      const session = uploadSessions.get(input.sessionId);
      if (!session) {
        throw TRPCErrorHandler.notFound('上传会话不存在');
      }

      const progress = Math.round((session.uploadedBytes / session.fileSize) * 100);
      return {
        sessionId: session.sessionId,
        progress,
        uploadedBytes: session.uploadedBytes,
        totalBytes: session.fileSize,
        status: session.status,
        filename: session.filename,
      };
    }),

  // 创建上传会话 - 直接实现
  createUploadSession: authProcedure
    .input(z.object({
      sessionId: z.string(),
      filename: z.string(),
      totalBytes: z.number()
    }))
    .mutation(async ({ ctx: _ctx, input }) => {
      const session = {
        sessionId: input.sessionId,
        filename: input.filename,
        fileSize: input.totalBytes,
        uploadedBytes: 0,
        status: 'active' as const,
        chunks: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      uploadSessions.set(input.sessionId, session);
      return { success: true, sessionId: input.sessionId };
    }),

  // 更新上传进度 - 直接实现
  updateUploadProgress: authProcedure
    .input(z.object({
      sessionId: z.string(),
      uploadedBytes: z.number(),
      stage: z.enum(['upload', 'thumbnail', 'transcode', 'finalize']).optional()
    }))
    .mutation(async ({ ctx: _ctx, input }) => {
      const session = uploadSessions.get(input.sessionId);
      if (!session) {
        throw TRPCErrorHandler.notFound('上传会话不存在');
      }

      session.uploadedBytes = input.uploadedBytes;
      session.lastActivity = new Date();

      if (session.uploadedBytes >= session.fileSize) {
        session.status = 'completed';
      }

      return { success: true, sessionId: input.sessionId };
    }),

  // 取消上传会话 - 直接实现
  cancelUpload: authProcedure
    .input(cancelUploadSchema)
    .mutation(async ({ ctx: _ctx, input }) => {
      const session = uploadSessions.get(input.sessionId);
      if (!session) {
        throw TRPCErrorHandler.notFound('上传会话不存在');
      }

      session.status = 'cancelled';
      session.lastActivity = new Date();

      return {
        success: true,
        sessionId: input.sessionId,
        message: '上传已取消',
      };
    }),
});

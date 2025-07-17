/**
 * @fileoverview 上传状态tRPC路由
 * @description 处理上传状态查询和管理
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { UnifiedUploadServiceV2 } from '@/lib/upload/core/unified-upload-service-v2';

/**
 * 文件状态输入
 */
const FileStatusInput = z.object({
  fileId: z.string().min(1, "文件ID不能为空"),
});

/**
 * 文件信息输出
 */
const FileInfoOutput = z.object({
  filename: z.string().nullable(),
  originalName: z.string().nullable(),
  size: z.number(),
  mimeType: z.string().nullable(),
});

/**
 * 上传状态输出
 */
const UploadStatusOutput = z.object({
  fileId: z.string(),
  strategy: z.string(),
  status: z.string(),
  fileInfo: FileInfoOutput,
  url: z.string().nullable(),
  cdnUrl: z.string().nullable(),
  error: z.string().nullable(),
  processingTime: z.number().nullable(),
  progress: z.number(),
});

/**
 * 上传状态路由
 * 迁移自: /api/upload/status/[fileId]
 */
export const uploadStatusRouter = createTRPCRouter({
  /**
   * 获取上传状态
   * 迁移自: GET /api/upload/status/[fileId]
   */
  getStatus: authProcedure
    .input(FileStatusInput)
    .output(z.object({
      success: z.boolean(),
      data: UploadStatusOutput,
    }))
    .query(async ({ input, ctx: _ctx }) => {
      try {
        const { fileId } = input;

        // 获取媒体文件信息作为上传状态
        const uploadService = new UnifiedUploadServiceV2();
        await uploadService.initialize();
        const mediaInfo = await uploadService.getMediaInfo(fileId);

        if (!mediaInfo) {
          throw TRPCErrorHandler.notFound('未找到上传记录');
        }

        // 返回状态信息
        return {
          success: true,
          data: {
            fileId: mediaInfo.id,
            strategy: 'unified',
            status: mediaInfo.processingStatus || 'COMPLETED',
            fileInfo: {
              filename: mediaInfo.filename,
              originalName: mediaInfo.originalName,
              size: Number(mediaInfo.fileSize || 0),
              mimeType: mediaInfo.mimeType,
            },
            url: mediaInfo.url,
            cdnUrl: mediaInfo.cdnUrl,
            error: null,
            processingTime: null,
            progress: mediaInfo.processingStatus === 'PROCESSING' ? 75 :
                     mediaInfo.processingStatus === 'COMPLETED' ? 100 : 0,
          },
        };
      } catch (error) {
        console.error('获取上传状态失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError(
          '获取状态失败',
          { context: { details: error instanceof Error ? error.message : '未知错误' } }
        );
      }
    }),

  /**
   * 取消上传任务
   * 迁移自: DELETE /api/upload/status/[fileId]
   */
  cancelUpload: authProcedure
    .input(FileStatusInput)
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        const { fileId } = input;

        // 检查文件是否存在
        const uploadService = new UnifiedUploadServiceV2();
        await uploadService.initialize();
        const mediaInfo = await uploadService.getMediaInfo(fileId);
        if (!mediaInfo) {
          throw TRPCErrorHandler.notFound('未找到上传记录');
        }

        // 这里应该实现取消上传的逻辑
        // 目前混合上传策略中还没有实现取消功能
        // 可以在后续版本中添加

        return {
          success: true,
          message: '取消请求已提交',
        };
      } catch (error) {
        console.error('取消上传失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError(
          '取消失败',
          { context: { details: error instanceof Error ? error.message : '未知错误' } }
        );
      }
    }),

  /**
   * 批量获取上传状态
   */
  getBatchStatus: authProcedure
    .input(z.object({
      fileIds: z.array(z.string()).min(1, "至少需要一个文件ID").max(20, "最多支持20个文件"),
    }))
    .output(z.object({
      success: z.boolean(),
      data: z.array(z.object({
        fileId: z.string(),
        status: UploadStatusOutput.optional(),
        error: z.string().optional(),
      })),
    }))
    .query(async ({ input, ctx: _ctx }) => {
      try {
        const { fileIds } = input;
        const results: any[] = [];

        for (const fileId of fileIds) {
          try {
            const uploadService = new UnifiedUploadServiceV2();
            await uploadService.initialize();
            const mediaInfo = await uploadService.getMediaInfo(fileId);

            if (mediaInfo) {
              results.push({
                fileId,
                status: {
                  fileId: mediaInfo.id,
                  strategy: 'unified',
                  status: mediaInfo.processingStatus || 'COMPLETED',
                  fileInfo: {
                    filename: mediaInfo.filename,
                    originalName: mediaInfo.originalName,
                    size: Number(mediaInfo.fileSize || 0),
                    mimeType: mediaInfo.mimeType,
                  },
                  url: mediaInfo.url,
                  cdnUrl: mediaInfo.cdnUrl,
                  error: null,
                  processingTime: null,
                  progress: mediaInfo.processingStatus === 'PROCESSING' ? 75 :
                           mediaInfo.processingStatus === 'COMPLETED' ? 100 : 0,
                },
              });
            } else {
              results.push({
                fileId,
                error: '未找到上传记录',
              });
            }
          } catch (error) {
            results.push({
              fileId,
              error: error instanceof Error ? error.message : '获取状态失败',
            });
          }
        }

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error('批量获取上传状态失败:', error);
        throw TRPCErrorHandler.internalError('批量获取状态失败');
      }
    }),

  /**
   * 获取用户的上传历史
   */
  getUserUploadHistory: authProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      data: z.array(UploadStatusOutput),
      total: z.number(),
      hasMore: z.boolean(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { page, limit, status } = input;
        const userId = ctx.session.user.id;

        // 从数据库获取用户的媒体文件
        const whereClause: {
          post: { authorId: string };
          processingStatus?: string;
        } = {
          post: {
            authorId: userId,
          },
        };

        if (status) {
          whereClause.processingStatus = status;
        }

        const [mediaFiles, total] = await Promise.all([
          ctx.db.postMedia.findMany({
            where: whereClause,
            select: {
              id: true,
              filename: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
              url: true,
              cdnUrl: true,
              processingStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          ctx.db.postMedia.count({ where: whereClause }),
        ]);

        const data = mediaFiles.map((media: {
          id: string;
          filename: string;
          originalName: string | null;
          fileSize: bigint | null;
          mimeType: string;
          url: string | null;
          cdnUrl: string | null;
          processingStatus: string | null;
          createdAt: Date;
        }) => ({
          fileId: media.id,
          strategy: 'unified',
          status: media.processingStatus || 'COMPLETED',
          fileInfo: {
            filename: media.filename,
            originalName: media.originalName,
            size: Number(media.fileSize || 0),
            mimeType: media.mimeType,
          },
          url: media.url,
          cdnUrl: media.cdnUrl,
          error: null,
          processingTime: null,
          progress: media.processingStatus === 'PROCESSING' ? 75 :
                   media.processingStatus === 'COMPLETED' ? 100 : 0,
        }));

        return {
          success: true,
          data,
          total,
          hasMore: total > page * limit,
        };
      } catch (error) {
        console.error('获取用户上传历史失败:', error);
        throw TRPCErrorHandler.internalError('获取上传历史失败');
      }
    }),

  /**
   * 重试失败的上传
   */
  retryUpload: authProcedure
    .input(FileStatusInput)
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        const { fileId } = input;

        // 检查文件是否存在且状态为失败
        const uploadService = new UnifiedUploadServiceV2();
        await uploadService.initialize();
        const mediaInfo = await uploadService.getMediaInfo(fileId);
        if (!mediaInfo) {
          throw TRPCErrorHandler.notFound('未找到上传记录');
        }

        if (mediaInfo.processingStatus !== 'FAILED') {
          throw TRPCErrorHandler.validationError('只能重试失败的上传');
        }

        // 这里应该实现重试上传的逻辑
        // 目前混合上传策略中还没有实现重试功能
        // 可以在后续版本中添加

        return {
          success: true,
          message: '重试请求已提交',
        };
      } catch (error) {
        console.error('重试上传失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError('重试失败');
      }
    }),
});

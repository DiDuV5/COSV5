/**
 * @fileoverview 管理员媒体管理tRPC路由
 * @description 处理管理员视频管理、存储删除等功能
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { StorageFactory } from '@/lib/storage/object-storage/storage-factory';

/**
 * 分页输入
 */
const PaginationInput = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * 视频信息输出
 */
const VideoInfoOutput = z.object({
  id: z.string(),
  filename: z.string().nullable(),
  originalName: z.string().nullable(),
  url: z.string(),
  cdnUrl: z.string().nullable(),
  storageProvider: z.string().nullable(),
  fileSize: z.number().nullable(),
  videoCodec: z.string().nullable(),
  originalCodec: z.string().nullable(),
  isTranscoded: z.boolean().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  duration: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

/**
 * 存储删除输入
 */
const StorageDeleteInput = z.object({
  key: z.string().min(1, "文件路径不能为空"),
});

/**
 * 管理员媒体管理路由
 * 迁移自: /api/admin/media/videos, /api/admin/videos, /api/admin/storage/delete
 */
export const adminMediaManagementRouter = createTRPCRouter({
  /**
   * 获取视频文件列表（用于测试页面）
   * 迁移自: GET /api/admin/media/videos
   */
  getVideos: authProcedure
    .input(PaginationInput.optional())
    .output(z.object({
      success: z.boolean(),
      videos: z.array(VideoInfoOutput),
      specialCharVideos: z.array(VideoInfoOutput),
      normalVideos: z.array(VideoInfoOutput),
      total: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { page = 1, limit = 20 } = input || {};

        // 获取最新的视频文件
        const videos = await ctx.db.postMedia.findMany({
          where: {
            mediaType: 'VIDEO'
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            cdnUrl: true,
            storageProvider: true,
            fileSize: true,
            videoCodec: true,
            originalCodec: true,
            isTranscoded: true,
            width: true,
            height: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });

        // 获取总数
        const total = await ctx.db.postMedia.count({
          where: { mediaType: 'VIDEO' }
        });

        // 分类视频
        const specialCharVideos = videos.filter((video: any) => {
          const filename = video.filename || '';
          return /[🎈🔗@\s%]/.test(filename) ||
                 /[\u4e00-\u9fff]/.test(filename) ||
                 /[^\x00-\x7F]/.test(filename);
        });

        const normalVideos = videos.filter((video: any) => {
          const filename = video.filename || '';
          return !/[🎈🔗@\s%]/.test(filename) &&
                 !/[\u4e00-\u9fff]/.test(filename) &&
                 /^[\x00-\x7F]*$/.test(filename);
        });

        return {
          success: true,
          videos,
          specialCharVideos,
          normalVideos,
          total,
        };
      } catch (error) {
        console.error('获取视频列表失败:', error);
        throw TRPCErrorHandler.internalError('获取视频列表失败');
      }
    }),

  /**
   * 获取视频管理列表
   * 迁移自: GET /api/admin/videos
   */
  getVideoManagement: authProcedure
    .input(PaginationInput.optional())
    .output(z.object({
      success: z.boolean(),
      videos: z.array(VideoInfoOutput),
      total: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { page = 1, limit = 10 } = input || {};

        // 获取最近的视频文件
        const videos = await ctx.db.postMedia.findMany({
          where: {
            mediaType: 'VIDEO',
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            cdnUrl: true,
            storageProvider: true,
            videoCodec: true,
            originalCodec: true,
            isTranscoded: true,
            width: true,
            height: true,
            duration: true,
            fileSize: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await ctx.db.postMedia.count({
          where: { mediaType: 'VIDEO' }
        });

        return {
          success: true,
          videos,
          total,
        };
      } catch (error) {
        console.error('获取视频管理列表失败:', error);
        throw TRPCErrorHandler.internalError('获取视频管理列表失败');
      }
    }),

  /**
   * 删除视频记录
   */
  deleteVideo: authProcedure
    .input(z.object({ videoId: z.string() }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { videoId } = input;

        // 检查视频是否存在
        const video = await ctx.db.postMedia.findUnique({
          where: { id: videoId },
        });

        if (!video) {
          throw TRPCErrorHandler.notFound('视频不存在');
        }

        // 删除视频记录
        await ctx.db.postMedia.delete({
          where: { id: videoId },
        });

        return {
          success: true,
          message: '视频删除成功',
        };
      } catch (error) {
        console.error('删除视频失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError('删除视频失败');
      }
    }),

  /**
   * 删除存储文件
   * 迁移自: DELETE /api/admin/storage/delete
   */
  deleteStorage: authProcedure
    .input(StorageDeleteInput)
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.object({
        key: z.string(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { key } = input;

        // 创建存储服务
        const storageManager = await StorageFactory.createStorageService();

        if (!storageManager.isReady()) {
          throw TRPCErrorHandler.internalError('存储服务未就绪');
        }

        // 删除文件
        await storageManager.deleteFile(key);

        return {
          success: true,
          message: '文件删除成功',
          data: { key },
        };
      } catch (error) {
        console.error('文件删除失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError(
          '文件删除失败',
          { context: { error: error instanceof Error ? error.message : '未知错误' } }
        );
      }
    }),

  /**
   * 批量删除存储文件
   */
  batchDeleteStorage: authProcedure
    .input(z.object({
      keys: z.array(z.string()).min(1, "至少需要一个文件路径"),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      results: z.array(z.object({
        key: z.string(),
        success: z.boolean(),
        error: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { keys } = input;

        // 创建存储服务
        const storageManager = await StorageFactory.createStorageService();

        if (!storageManager.isReady()) {
          throw TRPCErrorHandler.internalError('存储服务未就绪');
        }

        const results: Array<{ key: string; success: boolean; error?: string }> = [];
        let successCount = 0;

        // 逐个删除文件
        for (const key of keys) {
          try {
            await storageManager.deleteFile(key);
            results.push({ key, success: true });
            successCount++;
          } catch (error) {
            results.push({
              key,
              success: false,
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }

        return {
          success: true,
          message: `批量删除完成，成功删除 ${successCount}/${keys.length} 个文件`,
          results,
        };
      } catch (error) {
        console.error('批量删除文件失败:', error);
        throw TRPCErrorHandler.internalError('批量删除文件失败');
      }
    }),

  /**
   * 获取存储统计信息
   */
  getStorageStats: authProcedure
    .output(z.object({
      totalVideos: z.number(),
      totalSize: z.number(),
      transcodedVideos: z.number(),
      storageProviders: z.array(z.object({
        provider: z.string(),
        count: z.number(),
        totalSize: z.number(),
      })),
    }))
    .query(async ({ ctx }) => {
      try {
        // 获取视频统计
        const totalVideos = await ctx.db.postMedia.count({
          where: { mediaType: 'VIDEO' }
        });

        const transcodedVideos = await ctx.db.postMedia.count({
          where: {
            mediaType: 'VIDEO',
            isTranscoded: true,
          }
        });

        // 获取总大小
        const sizeResult = await ctx.db.postMedia.aggregate({
          where: { mediaType: 'VIDEO' },
          _sum: { fileSize: true },
        });

        const totalSize = sizeResult._sum.fileSize || 0;

        // 按存储提供商分组统计
        const providerStats = await ctx.db.postMedia.groupBy({
          by: ['storageProvider'],
          where: { mediaType: 'VIDEO' },
          _count: { id: true },
          _sum: { fileSize: true },
        });

        const storageProviders = providerStats.map((stat: any) => ({
          provider: stat.storageProvider || 'unknown',
          count: stat._count.id,
          totalSize: stat._sum.fileSize || 0,
        }));

        return {
          totalVideos,
          totalSize,
          transcodedVideos,
          storageProviders,
        };
      } catch (error) {
        console.error('获取存储统计失败:', error);
        throw TRPCErrorHandler.internalError('获取存储统计失败');
      }
    }),
});

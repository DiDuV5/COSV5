/**
 * @fileoverview 媒体相关的 tRPC 路由
 * @description 处理媒体文件的上传、处理、统计等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - @prisma/client: ^5.0.0
 * - zod: ^3.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure, authProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

export const mediaRouter = createTRPCRouter({
  // 记录视频播放统计
  recordPlayStats: publicProcedure
    .input(
      z.object({
        mediaId: z.string(),
        playDuration: z.number().min(0), // 播放时长（秒）
        totalDuration: z.number().min(0), // 视频总时长（秒）
        completionRate: z.number().min(0).max(1), // 完成率 (0-1)
        userAgent: z.string().optional(),
        browser: z.string().optional(),
        device: z.string().optional(),
        resolution: z.string().optional(),
        loadTime: z.number().optional(), // 加载时间（毫秒）
        bufferCount: z.number().optional(), // 缓冲次数
        errorCount: z.number().optional(), // 错误次数
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查媒体是否存在
        const media = await ctx.db.postMedia.findUnique({
          where: { id: input.mediaId },
        });

        if (!media) {
          throw TRPCErrorHandler.notFound('媒体文件不存在');
        }

        // 创建播放统计记录
        const playStats = await ctx.db.videoPlayStats.create({
          data: {
            mediaId: input.mediaId,
            userId: ctx.session?.user?.id || null, // 可选用户ID
            playDuration: input.playDuration,
            totalDuration: input.totalDuration,
            completionRate: input.completionRate,
            userAgent: input.userAgent,
            browser: input.browser,
            device: input.device,
            resolution: input.resolution,
            loadTime: input.loadTime,
            bufferCount: input.bufferCount || 0,
            errorCount: input.errorCount || 0,
          },
        });

        return {
          success: true,
          statsId: playStats.id,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('记录播放统计失败:', {
          mediaId: input.mediaId,
          userId: ctx.session?.user?.id || 'anonymous',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('记录播放统计失败，请稍后重试');
      }
    }),

  // 获取媒体播放统计
  getPlayStats: authProcedure
    .input(
      z.object({
        mediaId: z.string(),
        timeRange: z.enum(['day', 'week', 'month', 'all']).default('week'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // 计算时间范围
        const now = new Date();
        let startDate: Date;

        switch (input.timeRange) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // 所有时间
        }

        // 获取播放统计
        const stats = await ctx.db.videoPlayStats.findMany({
          where: {
            mediaId: input.mediaId,
            playedAt: {
              gte: startDate,
            },
          },
          orderBy: {
            playedAt: 'desc',
          },
        });

        // 计算汇总统计
        const totalPlays = stats.length;
        const totalPlayTime = stats.reduce((sum: any, stat: any) => sum + stat.playDuration, 0);
        const avgCompletionRate =
          totalPlays > 0
            ? stats.reduce((sum: any, stat: any) => sum + stat.completionRate, 0) / totalPlays
            : 0;
        const avgLoadTime =
          stats.length > 0
            ? stats.reduce((sum: any, stat: any) => sum + (stat.loadTime || 0), 0) / stats.length
            : 0;

        // 浏览器分布
        const browserStats = stats.reduce(
          (acc: any, stat: any) => {
            const browser = stat.browser || 'Unknown';
            acc[browser] = (acc[browser] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // 设备分布
        const deviceStats = stats.reduce(
          (acc: any, stat: any) => {
            const device = stat.device || 'Unknown';
            acc[device] = (acc[device] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          totalPlays,
          totalPlayTime,
          avgCompletionRate,
          avgLoadTime,
          browserStats,
          deviceStats,
          recentPlays: stats.slice(0, 10), // 最近10次播放
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取播放统计失败:', {
          mediaId: input.mediaId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取播放统计失败，请稍后重试');
      }
    }),

  // 获取媒体详细信息
  getMediaInfo: publicProcedure
    .input(
      z.object({
        mediaId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const media = await ctx.db.postMedia.findUnique({
          where: { id: input.mediaId },
          include: {
            post: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        });

        if (!media) {
          throw TRPCErrorHandler.notFound('媒体文件不存在');
        }

        return media;
      } catch (error) {
        // 结构化日志记录
        console.error('获取媒体信息失败:', {
          mediaId: input.mediaId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取媒体信息失败，请稍后重试');
      }
    }),

  // 创建媒体处理任务
  createProcessingTask: authProcedure
    .input(
      z.object({
        mediaId: z.string(),
        taskType: z.enum(['TRANSCODE', 'THUMBNAIL', 'COMPRESS']),
        inputPath: z.string(),
        outputPath: z.string().optional(),
        options: z.string().optional(), // JSON字符串
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查媒体是否存在
        const media = await ctx.db.postMedia.findUnique({
          where: { id: input.mediaId },
        });

        if (!media) {
          throw TRPCErrorHandler.notFound('媒体文件不存在');
        }

        // 创建处理任务
        const task = await ctx.db.mediaProcessingTask.create({
          data: {
            mediaId: input.mediaId,
            taskType: input.taskType,
            inputPath: input.inputPath,
            outputPath: input.outputPath,
            options: input.options,
            status: 'PENDING',
          },
        });

        return {
          success: true,
          taskId: task.id,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('创建处理任务失败:', {
          mediaId: input.mediaId,
          taskType: input.taskType,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('创建处理任务失败，请稍后重试');
      }
    }),

  // 更新处理任务状态
  updateProcessingTask: authProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
        progress: z.number().min(0).max(100).optional(),
        errorMessage: z.string().optional(),
        outputPath: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updateData: any = {
          status: input.status,
          updatedAt: new Date(),
        };

        if (input.progress !== undefined) {
          updateData.progress = input.progress;
        }

        if (input.errorMessage) {
          updateData.errorMessage = input.errorMessage;
        }

        if (input.outputPath) {
          updateData.outputPath = input.outputPath;
        }

        if (input.status === 'PROCESSING' && !updateData.startedAt) {
          updateData.startedAt = new Date();
        }

        if (input.status === 'COMPLETED' || input.status === 'FAILED') {
          updateData.completedAt = new Date();

          // 计算处理时长
          const task = await ctx.db.mediaProcessingTask.findUnique({
            where: { id: input.taskId },
          });

          if (task?.startedAt) {
            updateData.duration = Math.round(
              (new Date().getTime() - task.startedAt.getTime()) / 1000
            );
          }
        }

        const updatedTask = await ctx.db.mediaProcessingTask.update({
          where: { id: input.taskId },
          data: updateData,
        });

        return {
          success: true,
          task: updatedTask,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('更新处理任务失败:', {
          taskId: input.taskId,
          status: input.status,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('更新处理任务失败，请稍后重试');
      }
    }),

  // 获取测试用的媒体列表（用于调试）
  getTestMedia: publicProcedure.query(async ({ ctx }) => {
    const media = await ctx.db.postMedia.findMany({
      take: 10,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return media;
  }),

  // 媒体文件代理 - 替代REST API
  mediaProxy: publicProcedure
    .input(z.object({
      path: z.string().min(1, '文件路径不能为空'),
      // 可选参数用于缓存控制
      maxAge: z.number().optional().default(3600), // 默认1小时缓存
    }))
    .query(async ({ input }) => {
      try {
        const { path, maxAge } = input;
        console.log('🔍 tRPC媒体代理请求:', path);

        // 检查是否是测试文件，返回占位符数据
        if (path.includes('test_image_')) {
          console.log('🧪 检测到测试文件，返回占位符数据');

          const svgContent = `
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f0f0f0"/>
              <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#666">
                测试图片占位符
              </text>
              <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="#999">
                ${path}
              </text>
            </svg>
          `;

          return {
            type: 'placeholder',
            content: svgContent,
            contentType: 'image/svg+xml',
            cacheControl: `public, max-age=${maxAge}`,
          };
        }

        // 返回本地代理URL而不是直接的R2 URL，避免CORS问题
        const baseUrl = process.env.COSEREEDEN_NEXTAUTH_URL || 'http://localhost:3000';
        const proxyUrl = `${baseUrl}/api/media/${path}`;

        console.log('✅ 生成本地代理URL成功:', proxyUrl);

        const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN;
        return {
          type: 'redirect',
          url: proxyUrl,
          cacheControl: `public, max-age=${maxAge}`,
          // 提供直接CDN URL作为备选
          cdnUrl: `${cdnDomain}/${path}`,
        };

      } catch (error) {
        // 结构化日志记录
        console.error('❌ 媒体代理失败:', {
          path: input.path,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        if (error instanceof Error && error.message.includes('NoSuchKey')) {
          throw TRPCErrorHandler.notFound('文件不存在');
        }

        throw TRPCErrorHandler.internalError(
          `媒体代理失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),

  // 获取媒体文件元数据
  getMediaMetadata: publicProcedure
    .input(z.object({
      path: z.string().min(1, '文件路径不能为空'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { path } = input;

        // 从数据库查找媒体文件信息
        const media = await ctx.db.postMedia.findFirst({
          where: {
            OR: [
              { storageKey: path },
              { filename: path },
              { url: { contains: path } },
            ],
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            width: true,
            height: true,
            duration: true,
            mediaType: true,
            createdAt: true,
            thumbnailUrl: true,
          },
        });

        if (!media) {
          throw TRPCErrorHandler.notFound('媒体文件元数据不存在');
        }

        return media;
      } catch (error) {
        // 结构化日志记录
        console.error('❌ 获取媒体元数据失败:', {
          path: input.path,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError(
          `获取媒体元数据失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }),
});

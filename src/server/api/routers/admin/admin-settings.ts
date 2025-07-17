/**
 * @fileoverview 管理员系统设置路由
 * @description 处理系统设置的获取、更新和统计功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { getSettingsSchema, updateSettingsSchema, getUploadSettingsSchema, updateUploadSettingsSchema, getUploadStatsSchema } from "./admin-input-schemas";

export const adminSettingsRouter = createTRPCRouter({
  /**
   * 获取系统设置
   */
  getSettings: adminProcedure
    .input(getSettingsSchema)
    .query(async ({ ctx, input }) => {
      const where = input.category ? { category: input.category } : {};

      const settings = await ctx.db.systemSetting.findMany({
        where,
        orderBy: { key: 'asc' },
      });

      return settings;
    }),

  /**
   * 更新系统设置
   */
  updateSettings: adminProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const results: any[] = [];

      for (const setting of input.settings) {
        const result = await ctx.db.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            description: setting.description,
            category: setting.category,
            isPublic: setting.isPublic,
          },
          create: {
            key: setting.key,
            value: setting.value,
            description: setting.description || '',
            category: setting.category || 'general',
            isPublic: setting.isPublic || false,
          },
        });
        results.push(result);
      }

      return {
        success: true,
        message: `成功更新 ${results.length} 个设置`,
        settings: results,
      };
    }),

  /**
   * 获取系统统计信息
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.post.count({ where: { isPublic: true, publishedAt: { not: null } } }),
      ctx.db.comment.count(),
      ctx.db.user.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      totalPosts,
      totalComments,
      pendingComments: 0, // Comment模型暂时没有status字段
      activeUsers,
    };
  }),

  /**
   * 获取用户组统计信息
   */
  getUserGroupStats: adminProcedure.query(async ({ ctx }) => {
    // 获取各等级用户数量
    const userLevelStats = await ctx.db.user.groupBy({
      by: ['userLevel'],
      _count: {
        id: true,
      },
      orderBy: {
        userLevel: 'asc',
      },
    });

    // 获取活跃用户统计（最近30天有登录）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUserStats = await ctx.db.user.groupBy({
      by: ['userLevel'],
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // 获取内容发布统计
    const contentStats = await ctx.db.user.groupBy({
      by: ['userLevel'],
      _sum: {
        postsCount: true,
      },
      _avg: {
        postsCount: true,
      },
    });

    // 获取新用户注册统计（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUserStats = await ctx.db.user.groupBy({
      by: ['userLevel'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // 组合统计数据
    const stats = userLevelStats.map((levelStat: any) => {
      const activeCount = activeUserStats.find((s: any) => s.userLevel === levelStat.userLevel)?._count.id || 0;
      const contentStat = contentStats.find((s: any) => s.userLevel === levelStat.userLevel);
      const newUserCount = newUserStats.find((s: any) => s.userLevel === levelStat.userLevel)?._count.id || 0;

      return {
        userLevel: levelStat.userLevel,
        totalUsers: levelStat._count.id,
        activeUsers: activeCount,
        newUsers: newUserCount,
        totalPosts: contentStat?._sum.postsCount || 0,
        avgPosts: Math.round((contentStat?._avg.postsCount || 0) * 100) / 100,
        activityRate: levelStat._count.id > 0 ? Math.round((activeCount / levelStat._count.id) * 100) : 0,
      };
    });

    return stats;
  }),

  /**
   * 获取上传设置
   */
  getUploadSettings: adminProcedure
    .input(getUploadSettingsSchema)
    .query(async ({ ctx, input }) => {
      const { category } = input;

      // 构建查询条件
      const where: any = { category: 'upload' };
      if (category !== 'all') {
        where.key = { startsWith: category };
      }

      const settings = await ctx.db.systemSetting.findMany({
        where,
        orderBy: { key: 'asc' },
      });

      // 转换为配置对象格式
      const config = settings.reduce((acc: any, setting: any) => {
        try {
          // 尝试解析JSON值
          acc[setting.key] = JSON.parse(setting.value);
        } catch {
          // 如果不是JSON，直接使用字符串值
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {} as Record<string, any>);

      // 提供默认值
      const defaultConfig = {
        storageProvider: 'cloudflare-r2',
        enableDeduplication: true,
        imageQuality: 85,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
        enableThumbnails: true,
        maxFilesPerPost: 10,
        cdnUrl: process.env.COSEREEDEN_CDN_URL || '',
      };

      return { ...defaultConfig, ...config };
    }),

  /**
   * 更新上传设置
   */
  updateUploadSettings: adminProcedure
    .input(updateUploadSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const results: any[] = [];

      // 将输入转换为设置项
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

          const result = await ctx.db.systemSetting.upsert({
            where: { key: `upload_${key}` },
            update: {
              value: settingValue,
              category: 'upload',
            },
            create: {
              key: `upload_${key}`,
              value: settingValue,
              category: 'upload',
              description: `上传设置: ${key}`,
              isPublic: false,
            },
          });
          results.push(result);
        }
      }

      return {
        success: true,
        message: `成功更新 ${results.length} 个上传设置`,
        settings: results,
      };
    }),

  /**
   * 获取上传统计信息
   */
  getUploadStats: adminProcedure
    .input(getUploadStatsSchema)
    .query(async ({ ctx, input }) => {
      const { timeRange, fileType } = input;

      // 计算时间范围
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
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
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // 构建媒体类型过滤条件
      const mediaTypeFilter: any = {};
      if (fileType !== 'all') {
        mediaTypeFilter.mediaType = fileType.toUpperCase();
      }

      // 获取上传统计
      const [
        totalUploads,
        totalSize,
        recentUploads,
        uploadsByType,
        uploadsByUser,
      ] = await Promise.all([
        // 总上传数量
        ctx.db.postMedia.count({
          where: {
            createdAt: { gte: startDate },
            ...mediaTypeFilter,
          },
        }),

        // 总文件大小
        ctx.db.postMedia.aggregate({
          where: {
            createdAt: { gte: startDate },
            ...mediaTypeFilter,
          },
          _sum: { fileSize: true },
        }),

        // 最近上传
        ctx.db.postMedia.findMany({
          where: {
            createdAt: { gte: startDate },
            ...mediaTypeFilter,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            post: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        }),

        // 按类型分组统计
        ctx.db.postMedia.groupBy({
          by: ['mediaType'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: { id: true },
          _sum: { fileSize: true },
        }),

        // 按用户分组统计（前10名）
        ctx.db.postMedia.groupBy({
          by: ['postId'],
          where: {
            createdAt: { gte: startDate },
            ...mediaTypeFilter,
          },
          _count: { id: true },
          _sum: { fileSize: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      // 计算平均文件大小
      const avgFileSize = totalUploads > 0 ? (totalSize._sum.fileSize || 0) / totalUploads : 0;

      // 生成每日上传统计
      const dailyStats: Record<string, { uploads: number; size: number }> = {};
      const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dailyStats[dateKey] = { uploads: 0, size: 0 };
      }

      // 获取每日详细数据
      const dailyUploads = await ctx.db.postMedia.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          ...mediaTypeFilter,
        },
        _count: { id: true },
        _sum: { fileSize: true },
      });

      // 填充每日数据
      dailyUploads.forEach((item: any) => {
        const dateKey = item.createdAt.toISOString().split('T')[0];
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].uploads = item._count.id;
          dailyStats[dateKey].size = item._sum.fileSize || 0;
        }
      });

      return {
        summary: {
          totalUploads,
          totalSize: totalSize._sum.fileSize || 0,
          avgFileSize: Math.round(avgFileSize),
          timeRange,
        },
        dailyStats,
        uploadsByType: uploadsByType.map((item: any) => ({
          type: item.mediaType,
          count: item._count.id,
          size: item._sum.fileSize || 0,
        })),
        recentUploads: recentUploads.map((item: any) => ({
          id: item.id,
          filename: item.filename,
          fileSize: item.fileSize,
          mediaType: item.mediaType,
          createdAt: item.createdAt,
          post: item.post,
        })),
        topUploaders: uploadsByUser.slice(0, 5).map((item: any) => ({
          postId: item.postId,
          uploads: item._count.id,
          totalSize: item._sum.fileSize || 0,
        })),
      };
    }),

  /**
   * 清理未使用的文件哈希
   */
  cleanupUnusedHashes: adminProcedure
    .mutation(async ({ ctx }) => {
      // 查找孤儿文件（没有关联到任何帖子的媒体文件）
      const orphanedMedia = await ctx.db.postMedia.findMany({
        where: {
          post: null,
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
          },
        },
        select: {
          id: true,
          filename: true,
          fileHash: true,
        },
      });

      let cleanedCount = 0;
      const cleanedSize = 0;

      // 删除孤儿文件记录
      for (const media of orphanedMedia) {
        try {
          await ctx.db.postMedia.delete({
            where: { id: media.id },
          });
          cleanedCount++;
        } catch (error) {
          console.error(`清理文件失败: ${media.filename}`, error);
        }
      }

      return {
        success: true,
        message: `成功清理 ${cleanedCount} 个未使用的文件记录`,
        cleanedCount,
        cleanedSize,
      };
    }),
});

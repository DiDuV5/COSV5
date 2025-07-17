/**
 * @fileoverview Dashboard专用路由
 * @description 提供Dashboard页面所需的批量数据获取接口，优化性能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @changelog
 * - 2024-01-XX: 创建Dashboard专用批量数据获取路由
 */

import { z } from 'zod';
import { createTRPCRouter, authProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * Dashboard批量数据获取输入schema
 */
const getDashboardDataSchema = z.object({
  /** 用户ID，如果不提供则使用当前登录用户 */
  userId: z.string().optional(),
  /** 是否包含社交媒体链接 */
  includeSocialLinks: z.boolean().default(true),
  /** 是否包含罐头账户信息 */
  includeCansAccount: z.boolean().default(true),
  /** 是否包含签到状态 */
  includeCheckinStatus: z.boolean().default(true),
  /** 是否包含可用任务 */
  includeAvailableTasks: z.boolean().default(true),
});

export const dashboardRouter = createTRPCRouter({
  /**
   * 批量获取Dashboard所需的所有数据
   * 优化性能，减少客户端请求次数
   */
  getBatchData: authProcedure.input(getDashboardDataSchema).query(async ({ ctx, input }) => {
    const userId = input.userId || ctx.session.user.id;
    const username = ctx.session.user.username;

    if (!username) {
      throw TRPCErrorHandler.validationError('用户名不能为空');
    }

    // 并行获取所有数据
    const [userStats, socialLinks, cansAccount, checkinStatus, availableTasks] = await Promise.all([
      // 获取用户详细统计数据
      ctx.db.user
        .findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
            isActive: true,
            postsCount: true,
            followersCount: true,
            followingCount: true,
            likeCount: true,
            points: true,
            createdAt: true,
          },
        })
        .then(async (user: any) => {
          if (!user) {
            throw TRPCErrorHandler.notFound(`用户 ${username} 不存在`);
          }

          // 分别统计动态和作品数量
          const [momentsCount, postsCount, visitorStats] = await Promise.all([
            ctx.db.post.count({
              where: {
                authorId: user.id,
                contentType: 'MOMENT',
                publishedAt: { not: null },
              },
            }),
            ctx.db.post.count({
              where: {
                authorId: user.id,
                contentType: 'POST',
                publishedAt: { not: null },
              },
            }),
            // 获取访客统计（最近30天）
            ctx.db.profileVisitor.count({
              where: {
                profileId: user.id,
                visitedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            }),
          ]);

          return {
            ...user,
            momentsCount,
            postsCount,
            visitorsCount: visitorStats,
          };
        }),

      // 获取社交媒体链接
      input.includeSocialLinks
        ? ctx.db.userSocialLink.findMany({
            where: {
              userId,
              isPublic: true,
            },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              platform: true,
              username: true,
              url: true,
              customIcon: true,
              customTitle: true,
              isPublic: true,
              order: true,
            },
          })
        : Promise.resolve([]),

      // 获取罐头账户信息
      input.includeCansAccount
        ? (async () => {
            let account = await ctx.db.userCansAccount.findUnique({
              where: { userId },
            });

            if (!account) {
              // 创建新账户
              account = await ctx.db.userCansAccount.create({
                data: {
                  userId,
                  totalCans: 0,
                  availableCans: 0,
                  frozenCans: 0,
                  totalExperience: 0,
                  consecutiveCheckins: 0,
                  totalCheckins: 0,
                },
              });
            }

            return account;
          })()
        : Promise.resolve(null),

      // 获取签到状态
      input.includeCheckinStatus
        ? (async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [todayCheckin, account] = await Promise.all([
              ctx.db.dailyCheckin.findUnique({
                where: {
                  userId_checkinDate: {
                    userId,
                    checkinDate: today,
                  },
                },
              }),
              ctx.db.userCansAccount.findUnique({
                where: { userId },
              }),
            ]);

            return {
              hasCheckedInToday: !!todayCheckin,
              consecutiveCheckins: account?.consecutiveCheckins || 0,
              totalCheckins: account?.totalCheckins || 0,
              lastCheckinDate: account?.lastCheckinDate,
              todayCheckin,
            };
          })()
        : Promise.resolve(null),

      // 获取可用任务
      input.includeAvailableTasks
        ? (async () => {
            // 获取系统配置
            const config = await ctx.db.cansSystemConfig.findFirst({
              select: {
                dailySigninCans: true,
                publishPostCans: true,
                commentCans: true,
                dailyPostLimit: true,
                dailyCommentLimit: true,
              },
            });

            if (!config) {
              return [];
            }

            // 获取今日完成情况
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [todayPosts, todayComments, todayCheckin] = await Promise.all([
              ctx.db.post.count({
                where: {
                  authorId: userId,
                  publishedAt: {
                    gte: today,
                    lt: tomorrow,
                  },
                },
              }),
              ctx.db.comment.count({
                where: {
                  authorId: userId,
                  createdAt: {
                    gte: today,
                    lt: tomorrow,
                  },
                },
              }),
              ctx.db.dailyCheckin.findUnique({
                where: {
                  userId_checkinDate: {
                    userId,
                    checkinDate: today,
                  },
                },
              }),
            ]);

            // 构建任务列表
            const tasks = [
              {
                name: '每日签到',
                title: '每日签到',
                description: '每日签到获得罐头奖励',
                cansReward: config.dailySigninCans || 0,
                dailyLimit: 1,
                completed: todayCheckin ? 1 : 0,
                type: 'DAILY_CHECKIN' as const,
              },
              {
                name: '发布作品',
                title: '发布作品',
                description: '发布作品获得罐头奖励',
                cansReward: config.publishPostCans || 0,
                dailyLimit: config.dailyPostLimit || 0,
                completed: todayPosts,
                type: 'POST_CREATION' as const,
              },
              {
                name: '发表评论',
                title: '发表评论',
                description: '发表评论获得罐头奖励',
                cansReward: config.commentCans || 0,
                dailyLimit: config.dailyCommentLimit || 0,
                completed: todayComments,
                type: 'COMMENT_CREATION' as const,
              },
            ];

            return tasks
              .map(task => {
                const remaining = Math.max(0, task.dailyLimit - task.completed);
                const progress = task.dailyLimit > 0 ? (task.completed / task.dailyLimit) * 100 : 0;

                return {
                  ...task,
                  remaining,
                  progress: Math.round(progress),
                  status: remaining > 0 ? 'ACTIVE' : 'COMPLETED',
                  isEnabled: task.cansReward > 0 && task.dailyLimit > 0,
                  totalReward: task.cansReward * task.dailyLimit,
                };
              })
              .filter(task => task.isEnabled);
          })()
        : Promise.resolve([]),
    ]);

    return {
      userStats,
      socialLinks: socialLinks || [],
      cansAccount,
      checkinStatus,
      availableTasks: availableTasks || [],
      // 计算派生数据
      availableTasksCount: availableTasks?.filter((task: any) => task.remaining > 0).length || 0,
      canCheckin: checkinStatus && !checkinStatus.hasCheckedInToday,
    };
  }),

  /**
   * 预取Dashboard数据（用于性能优化）
   */
  prefetchData: authProcedure
    .input(getDashboardDataSchema.partial())
    .query(async ({ ctx, input }) => {
      // 这个端点主要用于数据预取，返回轻量级数据
      const userId = input.userId || ctx.session.user.id;
      const username = ctx.session.user.username;

      if (!username) {
        throw TRPCErrorHandler.validationError('用户名不能为空');
      }

      // 只获取关键数据
      const [userBasicInfo, cansAccount] = await Promise.all([
        ctx.db.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
            followersCount: true,
            followingCount: true,
            likeCount: true,
          },
        }),
        ctx.db.userCansAccount.findUnique({
          where: { userId },
          select: {
            availableCans: true,
            consecutiveCheckins: true,
          },
        }),
      ]);

      return {
        userBasicInfo,
        cansAccount,
        timestamp: new Date().toISOString(),
      };
    }),
});

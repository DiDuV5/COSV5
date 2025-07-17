/**
 * @fileoverview 用户查询路由
 * @description 处理用户信息查询、列表、统计等功能
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { createTRPCRouter, publicProcedure, authProcedure } from '@/server/api/trpc';
import { UserBatchService } from '../services/user-batch-service';
import {
  getUsersSchema,
  getByUsernameSchema,
  getByIdSchema,
  getDetailedStatsSchema,
  getRecommendedSchema,
  fullUserSelect,
  publicUserSelect,
  basicUserSelect,
  privacySettingsSelect,
} from '../schemas';
import { validateUserExists, processPaginationCursor, handleStatsError } from '../utils';

export const userQueriesRouter = createTRPCRouter({
  /**
   * 获取当前登录用户信息
   */
  getCurrent: authProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: fullUserSelect,
    });

    validateUserExists(user);
    return user;
  }),

  /**
   * 获取用户列表 - 优化版本，解决N+1查询问题
   */
  getUsers: publicProcedure.input(getUsersSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, search, userLevel } = input;

    // 使用批量查询服务优化性能
    const userBatchService = new UserBatchService(ctx.db);

    return await userBatchService.getOptimizedUserList({
      limit,
      cursor,
      search,
      userLevel,
      includeStats: false, // 基础用户列表不包含详细统计
      currentUserId: ctx.session?.user?.id,
    });
  }),

  /**
   * 根据用户名获取用户信息
   */
  getByUsername: publicProcedure.input(getByUsernameSchema).query(async ({ ctx, input }) => {
    // 首先尝试通过username查找
    let user = await ctx.db.user.findUnique({
      where: { username: input.username },
      select: publicUserSelect,
    });

    // 如果通过username没找到，尝试通过displayName查找
    if (!user) {
      user = await ctx.db.user.findFirst({
        where: {
          displayName: input.username,
          isActive: true,
        },
        select: publicUserSelect,
      });
    }

    validateUserExists(user);
    return user;
  }),

  /**
   * 根据用户ID获取用户信息
   */
  getById: publicProcedure.input(getByIdSchema).query(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: input.id },
      select: publicUserSelect,
    });

    validateUserExists(user);
    return user;
  }),

  /**
   * 获取推荐用户
   */
  getRecommended: publicProcedure.input(getRecommendedSchema).query(async ({ ctx, input }) => {
    const { limit, cursor } = input;

    // 简单的推荐算法：获取活跃的创作者
    const users = await ctx.db.user.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor } }),
      where: {
        isActive: true,
        postsCount: {
          gt: 0, // 至少发布过内容
        },
      },
      select: basicUserSelect,
      orderBy: [{ followersCount: 'desc' }, { postsCount: 'desc' }, { createdAt: 'desc' }],
    });

    const { items, nextCursor } = processPaginationCursor(users, limit);

    return {
      users: items,
      nextCursor,
    };
  }),

  /**
   * 获取用户隐私设置
   */
  getPrivacySettings: authProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: privacySettingsSelect,
    });

    validateUserExists(user);
    return user;
  }),

  /**
   * 获取用户详细统计信息（包含动态和作品分别统计）
   * 优化版本：使用单次查询获取所有统计数据，避免N+1问题
   */
  getDetailedStats: authProcedure
    .input(getDetailedStatsSchema)
    .query(async ({ ctx, input }) => {
      const username = input.username || ctx.session.user.username;

      if (!username) {
        throw TRPCErrorHandler.validationError('用户名不能为空');
      }

      // 优化：使用单次查询获取用户信息和统计数据
      const user = await ctx.db.user.findUnique({
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
          // 优化：直接在查询中包含统计信息
          _count: {
            select: {
              posts: {
                where: {
                  publishedAt: { not: null },
                  isPublic: true,
                  isDeleted: false, // 排除软删除的内容
                },
              },
              following: true,
              followers: true,
              likes: true,
            },
          },
        },
      });

      validateUserExists(user);

      // 确保user不为null后再使用
      if (!user) {
        throw new Error('User not found after validation');
      }

      // 分别统计动态和作品数量
      const [momentsCount, postsCount, visitorStats] = await Promise.all([
        ctx.db.post.count({
          where: {
            authorId: user.id,
            contentType: 'MOMENT',
            publishedAt: { not: null },
            isDeleted: false, // 排除软删除的内容
          },
        }),
        ctx.db.post.count({
          where: {
            authorId: user.id,
            contentType: 'POST',
            publishedAt: { not: null },
            isDeleted: false, // 排除软删除的内容
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

  /**
   * 获取数据库统计信息（用于调试）
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    try {
      const [totalUsers, totalPosts, totalComments, totalLikes, totalFollows] = await Promise.all([
        ctx.db.user.count(),
        ctx.db.post.count(),
        ctx.db.comment.count(),
        ctx.db.like.count(),
        ctx.db.follow.count(),
      ]);

      return {
        totalUsers,
        totalPosts,
        totalComments,
        totalLikes,
        totalFollows,
      };
    } catch (error) {
      handleStatsError(error);
    }
  }),
});

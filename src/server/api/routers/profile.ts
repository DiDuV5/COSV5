/**
 * @fileoverview 用户个人主页相关的 tRPC 路由
 * @description 处理个人主页访客记录、隐私设置等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.45.0
 * - zod: ^3.22.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { z } from "zod";
// import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

import {
  createTRPCRouter,
  publicProcedure,
  authProcedure,
} from "@/server/api/trpc";

export const profileRouter = createTRPCRouter({
  /**
   * 记录个人主页访问
   */
  recordVisit: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        userAgent: z.string().optional(),
        visitorIp: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profileId, userAgent, visitorIp } = input;
      const visitorId = ctx.session?.user?.id;

      // 检查目标用户是否存在
      const targetUser = await ctx.db.user.findUnique({
        where: { id: profileId },
        select: { id: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 如果是用户自己访问自己的主页，不记录
      if (visitorId === profileId) {
        return { success: true, message: "自己访问自己的主页" };
      }

      // 确定访客类型
      let visitorType = "GUEST";
      if (visitorId) {
        // 检查关注关系
        const [isFollower, isFollowing] = await Promise.all([
          ctx.db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: visitorId,
                followingId: profileId,
              },
            },
          }),
          ctx.db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: profileId,
                followingId: visitorId,
              },
            },
          }),
        ]);

        if (isFollower && isFollowing) {
          visitorType = "FOLLOWING"; // 互相关注，优先显示为关注
        } else if (isFollower) {
          visitorType = "FOLLOWER";
        } else if (isFollowing) {
          visitorType = "FOLLOWING";
        } else {
          visitorType = "USER";
        }
      }

      // 检查是否在24小时内已有访问记录（避免重复记录）
      const recentVisit = await ctx.db.profileVisitor.findFirst({
        where: {
          profileId,
          ...(visitorId ? { visitorId } : { visitorIp }),
          visitedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
          },
        },
      });

      if (recentVisit) {
        // 更新访问时间
        await ctx.db.profileVisitor.update({
          where: { id: recentVisit.id },
          data: {
            visitedAt: new Date(),
            visitorType,
            userAgent,
          },
        });
      } else {
        // 创建新的访问记录
        await ctx.db.profileVisitor.create({
          data: {
            profileId,
            visitorId,
            visitorIp,
            userAgent,
            visitorType,
          },
        });
      }

      return { success: true, message: "访问记录已保存" };
    }),

  /**
   * 获取个人主页访客记录
   */
  getVisitors: authProcedure
    .input(
      z.object({
        profileId: z.string(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        type: z.enum(["ALL", "GUEST", "USER", "FOLLOWER", "FOLLOWING"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { profileId, limit, cursor, type } = input;
      const currentUserId = ctx.session.user.id;

      // 检查权限：只有用户本人或管理员可以查看访客记录
      if (profileId !== currentUserId) {
        const currentUser = await ctx.db.user.findUnique({
          where: { id: currentUserId },
          select: { userLevel: true },
        });

        if (!["ADMIN", "SUPER_ADMIN"].includes(currentUser?.userLevel || "")) {
          throw TRPCErrorHandler.forbidden("无权查看他人的访客记录");
        }
      }

      // 检查目标用户的隐私设置
      const targetUser = await ctx.db.user.findUnique({
        where: { id: profileId },
        select: { showVisitorHistory: true },
      });

      if (!targetUser?.showVisitorHistory && profileId !== currentUserId) {
        throw TRPCErrorHandler.forbidden("用户已关闭访客记录显示");
      }

      const visitors = await ctx.db.profileVisitor.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          profileId,
          ...(type !== "ALL" && { visitorType: type }),
          visitedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
          },
        },
        include: {
          visitor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
        },
        orderBy: {
          visitedAt: "desc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (visitors.length > limit) {
        const nextItem = visitors.pop();
        nextCursor = nextItem!.id;
      }

      return {
        visitors,
        nextCursor,
      };
    }),

  /**
   * 获取访客统计信息
   */
  getVisitorStats: authProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { profileId } = input;
      const currentUserId = ctx.session.user.id;

      // 权限检查
      if (profileId !== currentUserId) {
        const currentUser = await ctx.db.user.findUnique({
          where: { id: currentUserId },
          select: { userLevel: true },
        });

        if (!["ADMIN", "SUPER_ADMIN"].includes(currentUser?.userLevel || "")) {
          throw TRPCErrorHandler.forbidden("无权查看他人的访客统计");
        }
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [totalVisitors, guestCount, userCount, followerCount, followingCount] = await Promise.all([
        ctx.db.profileVisitor.count({
          where: {
            profileId,
            visitedAt: { gte: thirtyDaysAgo },
          },
        }),
        ctx.db.profileVisitor.count({
          where: {
            profileId,
            visitorType: "GUEST",
            visitedAt: { gte: thirtyDaysAgo },
          },
        }),
        ctx.db.profileVisitor.count({
          where: {
            profileId,
            visitorType: "USER",
            visitedAt: { gte: thirtyDaysAgo },
          },
        }),
        ctx.db.profileVisitor.count({
          where: {
            profileId,
            visitorType: "FOLLOWER",
            visitedAt: { gte: thirtyDaysAgo },
          },
        }),
        ctx.db.profileVisitor.count({
          where: {
            profileId,
            visitorType: "FOLLOWING",
            visitedAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      return {
        totalVisitors,
        breakdown: {
          guest: guestCount,
          user: userCount,
          follower: followerCount,
          following: followingCount,
        },
      };
    }),

  /**
   * 清除访客记录
   */
  clearVisitors: authProcedure
    .input(
      z.object({
        profileId: z.string(),
        type: z.enum(["ALL", "GUEST", "USER", "FOLLOWER", "FOLLOWING"]).default("ALL"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profileId, type } = input;
      const currentUserId = ctx.session.user.id;

      // 只有用户本人可以清除自己的访客记录
      if (profileId !== currentUserId) {
        throw TRPCErrorHandler.forbidden("只能清除自己的访客记录");
      }

      const deleteResult = await ctx.db.profileVisitor.deleteMany({
        where: {
          profileId,
          ...(type !== "ALL" && { visitorType: type }),
        },
      });

      return {
        success: true,
        message: `已清除 ${deleteResult.count} 条访客记录`,
        deletedCount: deleteResult.count,
      };
    }),
});

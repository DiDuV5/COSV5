/**
 * @fileoverview 关注系统路由
 * @description 处理用户关注、取消关注、获取关注列表等功能
 */

import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import { TransactionManager } from "@/lib/transaction-manager";
import {
  followUserSchema,
  unfollowUserSchema,
  getFollowingSchema,
  getFollowersSchema,
  isFollowingSchema,
} from "../schemas";
import {
  validateUserExists,
  validateNotSelfAction,
  validateFollowExists,
  validateFollowNotExists,
  processPaginationCursor,
  createFollowNotificationSafe,
} from "../utils";
import { FollowService } from "../services";

export const followMutationsRouter = createTRPCRouter({
  /**
   * 关注用户（使用事务保护）
   */
  follow: authProcedure
    .input(followUserSchema)
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.session.user.id;
      const { userId: followingId } = input;

      validateNotSelfAction(followerId, followingId, "不能关注自己");

      // 使用事务确保关注操作的原子性
      const result = await TransactionManager.executeTransaction(async (tx) => {
        // 检查目标用户是否存在
        const targetUser = await tx.user.findUnique({
          where: { id: followingId },
          select: { id: true, isActive: true, username: true },
        });

        validateUserExists(targetUser);

        // 检查是否已经关注
        const existingFollow = await tx.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId,
            },
          },
        });

        validateFollowNotExists(existingFollow);

        // 创建关注关系
        const follow = await tx.follow.create({
          data: {
            followerId,
            followingId,
          },
        });

        // 更新关注者的关注数
        await tx.user.update({
          where: { id: followerId },
          data: {
            followingCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        // 更新被关注者的粉丝数
        await tx.user.update({
          where: { id: followingId },
          data: {
            followersCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        // 记录审计日志
        await tx.auditLog.create({
          data: {
            action: 'USER_FOLLOW',
            userId: followerId,
            message: `用户 ${ctx.session.user.username} 关注了用户 ${targetUser!.username}`,
            level: 'INFO',
            ipAddress: ctx.req?.ip || 'unknown',
            userAgent: ctx.req?.headers['user-agent'] || 'unknown',
          },
        });

        return follow;
      }, {
        maxRetries: 2,
        timeout: 8000,
        transactionId: `follow_${followerId}_${followingId}`,
      });

      if (!result.success) {
        throw new Error(result.error || '关注操作失败');
      }

      // 在事务外创建关注通知，避免事务超时
      await createFollowNotificationSafe(
        followingId,
        ctx.session.user.username || ctx.session.user.id
      );

      return {
        success: true,
        message: "关注成功",
      };
    }),

  /**
   * 取消关注用户
   */
  unfollow: authProcedure
    .input(unfollowUserSchema)
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.session.user.id;
      const { userId: followingId } = input;

      // 检查关注关系是否存在
      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      validateFollowExists(existingFollow);

      // 删除关注关系
      await FollowService.removeFollow(ctx.db, followerId, followingId);

      return {
        success: true,
        message: "取消关注成功",
      };
    }),

  /**
   * 获取用户的关注列表
   */
  getFollowing: publicProcedure
    .input(getFollowingSchema)
    .query(async ({ ctx, input }) => {
      const { userId, limit, cursor } = input;

      const following = await ctx.db.follow.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              userLevel: true,
              isVerified: true,
              followersCount: true,
              followingCount: true,
              postsCount: true,
              _count: {
                select: {
                  posts: true,
                  followers: true,
                  following: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const { items, nextCursor } = processPaginationCursor(following, limit);

      return {
        following: items.map((f: any) => ({
          id: f.following?.id,
          username: f.following?.username,
          displayName: f.following?.displayName,
          avatarUrl: f.following?.avatarUrl,
          bio: f.following?.bio,
          userLevel: f.following?.userLevel,
          isVerified: f.following?.isVerified,
          followersCount: f.following?.followersCount,
          followingCount: f.following?.followingCount,
          postsCount: f.following?.postsCount,
          _count: f.following?._count,
        })),
        nextCursor,
      };
    }),

  /**
   * 获取用户的粉丝列表
   */
  getFollowers: publicProcedure
    .input(getFollowersSchema)
    .query(async ({ ctx, input }) => {
      const { userId, limit, cursor } = input;

      const followers = await ctx.db.follow.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
              followersCount: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const { items, nextCursor } = processPaginationCursor(followers, limit);

      return {
        followers: items.map((f: any) => ({
          id: f.follower?.id,
          username: f.follower?.username,
          displayName: f.follower?.displayName,
          avatarUrl: f.follower?.avatarUrl,
          userLevel: f.follower?.userLevel,
          isVerified: f.follower?.isVerified,
          followersCount: f.follower?.followersCount,
        })),
        nextCursor,
      };
    }),

  /**
   * 检查是否关注了某个用户
   */
  isFollowing: authProcedure
    .input(isFollowingSchema)
    .query(async ({ ctx, input }) => {
      const follow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      });

      return !!follow;
    }),
});

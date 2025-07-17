/**
 * @fileoverview 用户评论查询功能
 * @description 提供用户相关的评论查询功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取用户查询功能
 * - 确保100%向后兼容性
 */

import { publicProcedure } from "@/server/api/trpc";
import { getUserCommentsInputSchema } from "../schemas/comment-input-schemas";
import type { TRPCContext, GetUserCommentsParams, CommentQueryResult, CommentData } from './types';

/**
 * 用户评论查询类
 */
export class UserCommentQueries {
  /**
   * 获取用户评论列表
   */
  static async getUserCommentsCore(
    ctx: TRPCContext,
    input: GetUserCommentsParams
  ): Promise<CommentQueryResult> {
    const { userId, username, limit, cursor } = input;
    const currentUserId = ctx.session?.user?.id;

    // 构建查询条件
    const whereCondition: any = {
      isDeleted: false,
    };

    // 根据userId或username查找用户
    if (userId) {
      whereCondition.authorId = userId;
    } else if (username) {
      whereCondition.author = {
        username: username,
      };
    } else {
      throw new Error("必须提供userId或username");
    }

    // 权限控制：只有管理员或用户本人可以看到所有状态的评论
    const isAdmin = ctx.session?.user?.userLevel === "ADMIN" || ctx.session?.user?.userLevel === "SUPER_ADMIN";
    const isOwner = currentUserId && (currentUserId === userId ||
      (username && ctx.session?.user?.username === username));

    if (!isAdmin && !isOwner) {
      // 非管理员且非本人，只能看到已审核的评论
      whereCondition.status = "APPROVED";
    }

    const comments = await ctx.prisma.comment.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: whereCondition,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            contentType: true,
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      comments: comments as CommentData[],
      nextCursor,
    };
  }
}

/**
 * 获取用户评论列表的tRPC过程
 */
export const getUserComments = publicProcedure
  .input(getUserCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return UserCommentQueries.getUserCommentsCore(ctx as unknown as TRPCContext, input);
  });

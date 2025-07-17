/**
 * @fileoverview 管理员评论查询功能
 * @description 提供管理员专用的评论查询功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取管理员查询功能
 * - 确保100%向后兼容性
 */

import { adminProcedure } from "@/server/api/trpc";
import {
  getPendingCommentsInputSchema,
  getLatestCommentsInputSchema,
  getHotCommentsInputSchema,
  getMostDislikedCommentsInputSchema,
} from "../schemas/comment-input-schemas";
import { CommentQueryBuilder } from './query-builders';
import type {
  TRPCContext,
  GetPendingCommentsParams,
  AdminQueryParams,
  CommentQueryResult,
  CommentData,
  HotCommentData,
  DislikedCommentData
} from './types';

/**
 * 管理员评论查询类
 */
export class AdminCommentQueries {
  /**
   * 获取待审核评论列表
   */
  static async getPendingCommentsCore(
    ctx: TRPCContext,
    input: GetPendingCommentsParams
  ): Promise<CommentQueryResult> {
    const { limit, cursor, status } = input;

    const comments = await ctx.prisma.comment.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        status,
        isDeleted: false,
      },
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
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
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

    // 获取总数
    const total = await ctx.prisma.comment.count({
      where: {
        status,
        isDeleted: false,
      },
    });

    return {
      comments: comments as CommentData[],
      nextCursor,
      total,
    };
  }

  /**
   * 获取最新评论列表
   */
  static async getLatestCommentsCore(
    ctx: TRPCContext,
    input: AdminQueryParams
  ): Promise<any[]> {
    const { limit, userLevel, includeGuests } = input;

    const whereCondition = CommentQueryBuilder.buildAdminWhere({
      limit,
      userLevel,
      includeGuests
    });

    const comments = await ctx.prisma.comment.findMany({
      where: whereCondition,
      take: limit,
      orderBy: { createdAt: "desc" },
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
      },
    });

    return comments;
  }

  /**
   * 获取热门评论列表
   */
  static async getHotCommentsCore(
    ctx: TRPCContext,
    input: AdminQueryParams
  ): Promise<HotCommentData[]> {
    const { limit, userLevel, includeGuests } = input;

    const whereCondition = CommentQueryBuilder.buildAdminWhere({
      limit,
      userLevel,
      includeGuests
    });

    // 获取评论，按点赞数排序（简化版热度算法）
    const comments = await ctx.prisma.comment.findMany({
      where: whereCondition,
      take: limit,
      orderBy: [
        { likeCount: "desc" },
        { createdAt: "desc" },
      ],
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
      },
    });

    // 为每个评论添加热度分数（基于现有的likeCount）
    const commentsWithHotScore = comments.map((comment: any) => ({
      ...comment,
      hotScore: comment.likeCount, // 简化的热度分数
    }));

    return commentsWithHotScore;
  }

  /**
   * 获取最多点踩评论列表
   */
  static async getMostDislikedCommentsCore(
    ctx: TRPCContext,
    input: AdminQueryParams
  ): Promise<DislikedCommentData[]> {
    const { limit, userLevel, includeGuests } = input;

    const baseWhere = CommentQueryBuilder.buildAdminWhere({
      limit,
      userLevel,
      includeGuests
    });

    const whereCondition = CommentQueryBuilder.buildDislikedCommentsWhere(baseWhere);

    // 获取有点踩反应的评论
    const commentsWithDislikes = await ctx.prisma.comment.findMany({
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
        likes: {
          where: {
            reactionType: "DISLIKE",
          },
        },
      },
      take: limit * 2, // 获取更多数据以便排序
    });

    // 计算点踩数并排序
    const commentsWithDislikeCount = commentsWithDislikes
      .map((comment: any) => ({
        ...comment,
        dislikeCount: comment.likes.length,
      }))
      .sort((a: any, b: any) => b.dislikeCount - a.dislikeCount)
      .slice(0, limit);

    return commentsWithDislikeCount;
  }
}

/**
 * 获取待审核评论列表的tRPC过程
 */
export const getPendingComments = adminProcedure
  .input(getPendingCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return AdminCommentQueries.getPendingCommentsCore(ctx as unknown as TRPCContext, input);
  });

/**
 * 获取最新评论列表的tRPC过程
 */
export const getLatestComments = adminProcedure
  .input(getLatestCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return AdminCommentQueries.getLatestCommentsCore(ctx as unknown as TRPCContext, input);
  });

/**
 * 获取热门评论列表的tRPC过程
 */
export const getHotComments = adminProcedure
  .input(getHotCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return AdminCommentQueries.getHotCommentsCore(ctx as unknown as TRPCContext, input);
  });

/**
 * 获取最多点踩评论列表的tRPC过程
 */
export const getMostDislikedComments = adminProcedure
  .input(getMostDislikedCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return AdminCommentQueries.getMostDislikedCommentsCore(ctx as unknown as TRPCContext, input);
  });

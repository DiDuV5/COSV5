/**
 * @fileoverview 公开评论查询功能
 * @description 提供公开的评论查询功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取公开查询功能
 * - 确保100%向后兼容性
 */

import { publicProcedure } from "@/server/api/trpc";
import { getCommentsInputSchema } from "../schemas/comment-input-schemas";
import { batchQueryService } from "@/lib/prisma";
import { CommentQueryBuilder } from './query-builders';
import type { TRPCContext, GetCommentsParams, CommentQueryResult } from './types';

/**
 * 公开评论查询类
 */
export class PublicCommentQueries {
  /**
   * 获取评论列表的核心逻辑
   * @param ctx tRPC上下文
   * @param input 查询参数
   */
  static async getCommentsCore(ctx: TRPCContext, input: GetCommentsParams): Promise<CommentQueryResult> {
    const { contentId, limit, cursor, parentId, includeOwn, guestSessionId, sortBy } = input;
    const userId = ctx.session?.user?.id;

    // 检查是否为管理员
    const isAdmin = ctx.session?.user?.userLevel === "ADMIN" || ctx.session?.user?.userLevel === "SUPER_ADMIN";

    // 构建查询条件
    const whereCondition = CommentQueryBuilder.buildGetCommentsWhere(
      { contentId, parentId, includeOwn, guestSessionId, sortBy, limit, cursor },
      userId,
      isAdmin
    );

    // 构建排序条件
    const orderBy = CommentQueryBuilder.buildOrderBy(sortBy);

    // 优化：先获取评论基本信息，避免N+1查询
    const comments = await ctx.prisma.comment.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: whereCondition,
      select: {
        id: true,
        postId: true,
        authorId: true,
        parentId: true,
        content: true,
        mentions: true,
        isDeleted: true,
        guestName: true,
        guestContact: true,
        guestIp: true,
        guestSessionId: true,
        likeCount: true,
        replyCount: true,
        isPinned: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem!.id;
    }

    // 批量加载作者信息，避免N+1查询
    const authorIds = comments
      .filter(comment => comment.authorId)
      .map(comment => comment.authorId!)
      .filter((id, index, arr) => arr.indexOf(id) === index); // 去重

    const authorsMap = new Map();
    if (authorIds.length > 0) {
      await Promise.all(
        authorIds.map(async (authorId) => {
          const author = await batchQueryService.userLoader.loadUser(authorId);
          if (author) {
            authorsMap.set(authorId, {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl,
              userLevel: author.userLevel,
              isVerified: author.isVerified,
            });
          }
        })
      );
    }

    // 组装最终结果
    const commentsWithAuthors = comments.map(comment => ({
      ...comment,
      author: comment.authorId ? authorsMap.get(comment.authorId) || null : null,
      _count: {
        replies: comment.replyCount || 0,
      },
    }));

    return {
      comments: commentsWithAuthors,
      nextCursor,
    };
  }
}

/**
 * 获取评论列表的tRPC过程
 */
export const getComments = publicProcedure
  .input(getCommentsInputSchema)
  .query(async ({ ctx, input }) => {
    return PublicCommentQueries.getCommentsCore(ctx as unknown as TRPCContext, input);
  });

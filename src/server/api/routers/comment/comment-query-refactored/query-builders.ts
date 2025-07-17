/**
 * @fileoverview 查询条件构建器
 * @description 提供评论查询条件的构建功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取查询条件构建功能
 * - 确保100%向后兼容性
 */

import type { GetCommentsParams, AdminQueryParams } from './types';

/**
 * 查询条件构建器
 */
export class CommentQueryBuilder {
  /**
   * 构建获取评论的查询条件
   * @param params 查询参数
   * @param userId 当前用户ID
   * @param isAdmin 是否为管理员
   */
  static buildGetCommentsWhere(
    params: GetCommentsParams,
    userId?: string,
    isAdmin: boolean = false
  ): any {
    const { contentId, parentId, includeOwn, guestSessionId } = params;

    // 基础查询条件
    const whereCondition: any = {
      postId: contentId,
      isDeleted: false,
    };

    // 如果指定了parentId，则只查询该父评论的回复
    if (parentId) {
      whereCondition.parentId = parentId;
    }

    // 管理员可以看到所有状态的评论
    if (isAdmin) {
      // 管理员不需要额外的状态过滤条件
      return whereCondition;
    }

    if (!includeOwn) {
      // 非管理员且不包含自己的评论，只显示已审核的评论
      whereCondition.status = "APPROVED";
    } else {
      // 非管理员且包含自己的评论，需要区分注册用户和游客
      const ownCommentConditions: any[] = [];

      // 已审核的评论对所有人可见
      ownCommentConditions.push({ status: "APPROVED" });

      if (userId) {
        // 注册用户：显示自己的待审核和被拒绝的评论
        ownCommentConditions.push(
          { authorId: userId, status: "PENDING" },
          { authorId: userId, status: "REJECTED" }
        );
      } else if (guestSessionId) {
        // 游客：通过会话ID识别自己的评论
        ownCommentConditions.push(
          { authorId: null, guestSessionId, status: "PENDING" },
          { authorId: null, guestSessionId, status: "REJECTED" }
        );
      }

      whereCondition.OR = ownCommentConditions;
    }

    return whereCondition;
  }

  /**
   * 构建排序条件
   * @param sortBy 排序方式
   */
  static buildOrderBy(sortBy: 'newest' | 'popular' | 'following'): any[] {
    return [
      // 置顶评论始终优先
      { isPinned: "desc" },
      // 根据排序方式决定次要排序
      ...(sortBy === "popular"
        ? [
            { likeCount: "desc" as const },
            { replyCount: "desc" as const },
            { createdAt: "desc" as const }
          ]
        : sortBy === "following"
        ? [
            // TODO: 实现关注用户优先排序
            { createdAt: "desc" as const }
          ]
        : [
            { createdAt: "desc" as const }
          ]
      )
    ];
  }

  /**
   * 构建管理员查询条件
   * @param params 管理员查询参数
   */
  static buildAdminWhere(params: AdminQueryParams): any {
    const { userLevel, includeGuests } = params;

    const whereCondition: any = {
      isDeleted: false,
      // 移除status限制，显示所有状态的评论
    };

    // 用户组筛选
    if (userLevel && userLevel !== "ALL") {
      if (userLevel === "GUEST") {
        whereCondition.authorId = null;
      } else {
        whereCondition.author = {
          userLevel: userLevel,
        };
      }
    } else if (!includeGuests) {
      whereCondition.authorId = { not: null };
    }

    return whereCondition;
  }

  /**
   * 构建点踩评论查询条件
   * @param baseWhere 基础查询条件
   */
  static buildDislikedCommentsWhere(baseWhere: any): any {
    return {
      ...baseWhere,
      likes: {
        some: {
          reactionType: "DISLIKE",
        },
      },
    };
  }
}

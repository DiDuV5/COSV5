/**
 * @fileoverview 评论查询工具函数
 * @description 评论查询的工具函数和辅助方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  CommentQueryConditionBuilder,
  CommentSortBy,
  UserLevel,
  PublicCommentQueryParams,
  AdminCommentQueryParams
} from '../types';
import { ADMIN_USER_LEVELS } from '../constants';

/**
 * 评论查询条件构建器实现
 */
export class CommentQueryConditionBuilderImpl implements CommentQueryConditionBuilder {
  /**
   * 构建WHERE条件
   * @param params 查询参数
   * @returns WHERE条件对象
   */
  buildWhereCondition(params: any): any {
    const whereCondition: any = {
      isDeleted: params.includeDeleted ? undefined : false,
    };

    // 帖子ID条件
    if (params.contentId) {
      whereCondition.postId = params.contentId;
    }

    // 父评论ID条件
    if (params.parentId) {
      whereCondition.parentId = params.parentId;
    }

    // 用户ID条件
    if (params.userId) {
      whereCondition.authorId = params.userId;
    }

    // 状态条件
    if (params.status) {
      whereCondition.status = params.status;
    }

    return whereCondition;
  }

  /**
   * 构建ORDER BY条件
   * @param sortBy 排序方式
   * @returns ORDER BY条件数组
   */
  buildOrderByCondition(sortBy: CommentSortBy = 'latest'): any[] {
    const orderBy: any[] = [
      // 置顶评论始终优先
      { isPinned: "desc" }
    ];

    switch (sortBy) {
      case 'popular':
        orderBy.push(
          { likeCount: "desc" },
          { replyCount: "desc" },
          { createdAt: "desc" }
        );
        break;
      case 'following':
        // TODO: 实现关注用户优先排序
        orderBy.push({ createdAt: "desc" });
        break;
      case 'latest':
      default:
        orderBy.push({ createdAt: "desc" });
        break;
    }

    return orderBy;
  }

  /**
   * 构建用户级别条件
   * @param userLevel 用户级别
   * @param includeGuests 是否包含游客
   * @returns 用户级别条件
   */
  buildUserLevelCondition(userLevel?: UserLevel, includeGuests: boolean = true): any {
    if (!userLevel || userLevel === "ALL") {
      return includeGuests ? {} : { authorId: { not: null } };
    }

    if (userLevel === "GUEST") {
      return { authorId: null };
    }

    return {
      author: {
        userLevel: userLevel,
      },
    };
  }

  /**
   * 构建权限相关的WHERE条件
   * @param params 查询参数
   * @param userId 当前用户ID
   * @param isAdmin 是否为管理员
   * @returns 权限相关的WHERE条件
   */
  buildPermissionWhereCondition(
    params: PublicCommentQueryParams,
    userId?: string,
    isAdmin: boolean = false
  ): any {
    const { includeOwn, guestSessionId } = params;

    // 管理员可以看到所有状态的评论
    if (isAdmin) {
      return {};
    }

    // 非管理员且不包含自己的评论，只显示已审核的评论
    if (!includeOwn) {
      return { status: "APPROVED" };
    }

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

    return { OR: ownCommentConditions };
  }
}

/**
 * 查询工具类
 */
export class CommentQueryUtils {
  /**
   * 检查是否为管理员
   * @param userLevel 用户级别
   * @returns 是否为管理员
   */
  static isAdmin(userLevel?: string): boolean {
    return userLevel ? ADMIN_USER_LEVELS.includes(userLevel as any) : false;
  }

  /**
   * 验证分页参数
   * @param limit 限制数量
   * @param maxLimit 最大限制
   * @returns 验证后的限制数量
   */
  static validateLimit(limit: number, maxLimit: number = 100): number {
    return Math.min(Math.max(limit, 1), maxLimit);
  }

  /**
   * 处理分页游标
   * @param comments 评论列表
   * @param limit 限制数量
   * @returns 下一页游标
   */
  static handlePagination<T extends { id: string }>(
    comments: T[],
    limit: number
  ): { items: T[]; nextCursor?: string } {
    let nextCursor: string | undefined = undefined;

    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      items: comments,
      nextCursor
    };
  }

  /**
   * 提取唯一的作者ID
   * @param comments 评论列表
   * @returns 唯一的作者ID列表
   */
  static extractUniqueAuthorIds(comments: any[]): string[] {
    return comments
      .filter(comment => comment.authorId)
      .map(comment => comment.authorId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);
  }

  /**
   * 构建作者信息映射
   * @param authors 作者列表
   * @returns 作者信息映射
   */
  static buildAuthorsMap(authors: any[]): Map<string, any> {
    const authorsMap = new Map();

    authors.forEach(author => {
      if (author) {
        authorsMap.set(author.id, {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          userLevel: author.userLevel,
          isVerified: author.isVerified,
        });
      }
    });

    return authorsMap;
  }

  /**
   * 组装评论和作者信息
   * @param comments 评论列表
   * @param authorsMap 作者信息映射
   * @returns 包含作者信息的评论列表
   */
  static assembleCommentsWithAuthors(comments: any[], authorsMap: Map<string, any>): any[] {
    return comments.map(comment => ({
      ...comment,
      author: comment.authorId ? authorsMap.get(comment.authorId) || null : null,
      _count: {
        replies: comment.replyCount || 0,
      },
    }));
  }
}

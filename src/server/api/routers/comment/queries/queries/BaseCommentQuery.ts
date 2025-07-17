/**
 * @fileoverview 基础评论查询类
 * @description 评论查询的基础类，提供通用查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { batchQueryService } from '@/lib/prisma';
import { 
  CommentQueryConditionBuilder,
  CommentDataFormatter,
  CommentWithDetails,
  BaseCommentQueryParams 
} from '../types';
import { CommentQueryConditionBuilderImpl } from '../utils/queryUtils';
import { CommentDataFormatterImpl } from '../utils/formatUtils';
import { 
  COMMENT_SELECT_FIELDS,
  AUTHOR_SELECT_FIELDS,
  POST_SELECT_FIELDS,
  REVIEWER_SELECT_FIELDS,
  DEFAULT_QUERY_CONFIG 
} from '../constants';

/**
 * 基础评论查询类
 */
export class BaseCommentQuery {
  protected conditionBuilder: CommentQueryConditionBuilder;
  protected formatter: CommentDataFormatter;

  constructor(protected prisma: PrismaClient) {
    this.conditionBuilder = new CommentQueryConditionBuilderImpl();
    this.formatter = new CommentDataFormatterImpl();
  }

  /**
   * 获取评论基础信息
   * @param params 查询参数
   * @returns 评论基础信息列表
   */
  protected async getCommentsBasic(params: BaseCommentQueryParams): Promise<any[]> {
    const { limit, cursor } = params;
    const validatedLimit = Math.min(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    const whereCondition = this.conditionBuilder.buildWhereCondition(params);

    return await this.prisma.comment.findMany({
      take: validatedLimit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: whereCondition,
      select: COMMENT_SELECT_FIELDS,
    });
  }

  /**
   * 获取评论详细信息
   * @param params 查询参数
   * @param includePost 是否包含帖子信息
   * @param includeReviewer 是否包含审核者信息
   * @returns 评论详细信息列表
   */
  protected async getCommentsWithDetails(
    params: BaseCommentQueryParams,
    includePost: boolean = false,
    includeReviewer: boolean = false
  ): Promise<any[]> {
    const { limit, cursor } = params;
    const validatedLimit = Math.min(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    const whereCondition = this.conditionBuilder.buildWhereCondition(params);

    const include: any = {
      author: {
        select: AUTHOR_SELECT_FIELDS,
      },
    };

    if (includePost) {
      include.post = {
        select: POST_SELECT_FIELDS,
      };
    }

    if (includeReviewer) {
      include.reviewer = {
        select: REVIEWER_SELECT_FIELDS,
      };
    }

    return await this.prisma.comment.findMany({
      take: validatedLimit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: whereCondition,
      include,
    });
  }

  /**
   * 批量加载作者信息
   * @param comments 评论列表
   * @returns 包含作者信息的评论列表
   */
  protected async loadAuthorsForComments(comments: any[]): Promise<any[]> {
    // 提取唯一的作者ID
    const authorIds = comments
      .filter(comment => comment.authorId)
      .map(comment => comment.authorId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    if (authorIds.length === 0) {
      return comments.map(comment => ({
        ...comment,
        author: null,
        _count: {
          replies: comment.replyCount || 0,
        },
      }));
    }

    // 批量加载作者信息
    const authorsMap = new Map();
    await Promise.all(
      authorIds.map(async (authorId) => {
        try {
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
        } catch (error) {
          console.warn(`Failed to load author ${authorId}:`, error);
        }
      })
    );

    // 组装最终结果
    return comments.map(comment => ({
      ...comment,
      author: comment.authorId ? authorsMap.get(comment.authorId) || null : null,
      _count: {
        replies: comment.replyCount || 0,
      },
    }));
  }

  /**
   * 获取评论总数
   * @param whereCondition WHERE条件
   * @returns 评论总数
   */
  protected async getCommentsCount(whereCondition: any): Promise<number> {
    return await this.prisma.comment.count({
      where: whereCondition,
    });
  }

  /**
   * 根据ID获取单个评论
   * @param id 评论ID
   * @param includePost 是否包含帖子信息
   * @param includeReviewer 是否包含审核者信息
   * @returns 评论详细信息
   */
  async getCommentById(
    id: string,
    includePost: boolean = false,
    includeReviewer: boolean = false
  ): Promise<CommentWithDetails | null> {
    const include: any = {
      author: {
        select: AUTHOR_SELECT_FIELDS,
      },
    };

    if (includePost) {
      include.post = {
        select: POST_SELECT_FIELDS,
      };
    }

    if (includeReviewer) {
      include.reviewer = {
        select: REVIEWER_SELECT_FIELDS,
      };
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include,
    });

    if (!comment) {
      return null;
    }

    return this.formatter.formatComment(comment);
  }

  /**
   * 检查评论是否存在
   * @param id 评论ID
   * @returns 是否存在
   */
  async commentExists(id: string): Promise<boolean> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });

    return comment !== null;
  }

  /**
   * 处理分页
   * @param comments 评论列表
   * @param limit 限制数量
   * @returns 处理后的评论列表和下一页游标
   */
  protected handlePagination<T extends { id: string }>(
    comments: T[],
    limit: number
  ): { comments: T[]; nextCursor?: string } {
    let nextCursor: string | undefined = undefined;
    
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      comments,
      nextCursor
    };
  }
}

/**
 * @fileoverview 评论数据格式化工具
 * @description 评论查询结果的格式化工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { 
  CommentDataFormatter,
  CommentWithDetails,
  CommentQueryResult,
  CommentAuthor,
  CommentPost,
  CommentReviewer 
} from '../types';

/**
 * 评论数据格式化器实现
 */
export class CommentDataFormatterImpl implements CommentDataFormatter {
  /**
   * 格式化单个评论
   * @param comment 原始评论数据
   * @returns 格式化后的评论
   */
  formatComment(comment: any): CommentWithDetails {
    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      content: comment.content,
      mentions: comment.mentions,
      isDeleted: comment.isDeleted,
      guestName: comment.guestName,
      guestContact: comment.guestContact,
      guestIp: comment.guestIp,
      guestSessionId: comment.guestSessionId,
      likeCount: comment.likeCount || 0,
      replyCount: comment.replyCount || 0,
      isPinned: comment.isPinned || false,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author ? this.formatAuthor(comment.author) : null,
      post: comment.post ? this.formatPost(comment.post) : undefined,
      reviewer: comment.reviewer ? this.formatReviewer(comment.reviewer) : undefined,
      _count: comment._count || { replies: comment.replyCount || 0 },
      hotScore: comment.hotScore,
      dislikeCount: comment.dislikeCount,
    };
  }

  /**
   * 格式化评论列表
   * @param comments 原始评论数据列表
   * @returns 格式化后的评论列表
   */
  formatComments(comments: any[]): CommentWithDetails[] {
    return comments.map(comment => this.formatComment(comment));
  }

  /**
   * 格式化查询结果
   * @param comments 评论列表
   * @param nextCursor 下一页游标
   * @param total 总数
   * @returns 格式化后的查询结果
   */
  formatQueryResult(
    comments: any[], 
    nextCursor?: string, 
    total?: number
  ): CommentQueryResult {
    return {
      comments: this.formatComments(comments),
      nextCursor,
      total,
    };
  }

  /**
   * 格式化作者信息
   * @param author 原始作者数据
   * @returns 格式化后的作者信息
   */
  private formatAuthor(author: any): CommentAuthor {
    return {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      userLevel: author.userLevel,
      isVerified: author.isVerified || false,
    };
  }

  /**
   * 格式化帖子信息
   * @param post 原始帖子数据
   * @returns 格式化后的帖子信息
   */
  private formatPost(post: any): CommentPost {
    return {
      id: post.id,
      title: post.title,
      contentType: post.contentType,
      author: post.author ? {
        username: post.author.username,
        displayName: post.author.displayName,
      } : undefined,
    };
  }

  /**
   * 格式化审核者信息
   * @param reviewer 原始审核者数据
   * @returns 格式化后的审核者信息
   */
  private formatReviewer(reviewer: any): CommentReviewer {
    return {
      id: reviewer.id,
      username: reviewer.username,
      displayName: reviewer.displayName,
    };
  }
}

/**
 * 格式化工具函数
 */
export class CommentFormatUtils {
  private static formatter = new CommentDataFormatterImpl();

  /**
   * 批量格式化评论
   * @param comments 原始评论数组
   * @returns 格式化后的评论数组
   */
  static formatComments(comments: any[]): CommentWithDetails[] {
    return this.formatter.formatComments(comments);
  }

  /**
   * 格式化查询结果
   * @param comments 评论列表
   * @param nextCursor 下一页游标
   * @param total 总数
   * @returns 格式化后的查询结果
   */
  static formatQueryResult(
    comments: any[], 
    nextCursor?: string, 
    total?: number
  ): CommentQueryResult {
    return this.formatter.formatQueryResult(comments, nextCursor, total);
  }

  /**
   * 添加热度分数
   * @param comments 评论列表
   * @returns 包含热度分数的评论列表
   */
  static addHotScore(comments: any[]): any[] {
    return comments.map(comment => ({
      ...comment,
      hotScore: this.calculateHotScore(comment),
    }));
  }

  /**
   * 添加点踩数
   * @param comments 评论列表
   * @returns 包含点踩数的评论列表
   */
  static addDislikeCount(comments: any[]): any[] {
    return comments.map(comment => ({
      ...comment,
      dislikeCount: comment.likes ? comment.likes.length : 0,
    }));
  }

  /**
   * 计算热度分数
   * @param comment 评论数据
   * @returns 热度分数
   */
  private static calculateHotScore(comment: any): number {
    // 简化的热度分数计算：基于点赞数
    return comment.likeCount || 0;
  }

  /**
   * 安全获取字符串值
   * @param value 原始值
   * @param defaultValue 默认值
   * @returns 字符串值
   */
  static safeString(value: any, defaultValue: string = ''): string {
    return value && typeof value === 'string' ? value : defaultValue;
  }

  /**
   * 安全获取数字值
   * @param value 原始值
   * @param defaultValue 默认值
   * @returns 数字值
   */
  static safeNumber(value: any, defaultValue: number = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 安全获取布尔值
   * @param value 原始值
   * @param defaultValue 默认值
   * @returns 布尔值
   */
  static safeBoolean(value: any, defaultValue: boolean = false): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
  }
}

/**
 * @fileoverview 评论查询工具函数
 * @description 提供评论查询相关的工具函数
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取工具函数
 * - 确保100%向后兼容性
 */

import type { CommentData, CommentAuthor } from './types';

/**
 * 评论查询工具类
 */
export class CommentQueryUtils {
  /**
   * 检查用户是否为管理员
   * @param userLevel 用户级别
   */
  static isAdmin(userLevel?: string): boolean {
    return userLevel === "ADMIN" || userLevel === "SUPER_ADMIN";
  }

  /**
   * 检查用户是否可以查看评论
   * @param comment 评论数据
   * @param currentUserId 当前用户ID
   * @param guestSessionId 游客会话ID
   * @param isAdmin 是否为管理员
   */
  static canViewComment(
    comment: CommentData,
    currentUserId?: string,
    guestSessionId?: string,
    isAdmin: boolean = false
  ): boolean {
    // 管理员可以查看所有评论
    if (isAdmin) {
      return true;
    }

    // 已审核的评论对所有人可见
    if (comment.status === "APPROVED") {
      return true;
    }

    // 检查是否为评论作者
    if (currentUserId && comment.authorId === currentUserId) {
      return true;
    }

    // 检查游客评论
    if (!comment.authorId && guestSessionId && comment.guestSessionId === guestSessionId) {
      return true;
    }

    return false;
  }

  /**
   * 格式化评论作者信息
   * @param author 原始作者数据
   */
  static formatAuthor(author: any): CommentAuthor | null {
    if (!author) return null;

    return {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      userLevel: author.userLevel,
      isVerified: author.isVerified,
    };
  }

  /**
   * 计算评论热度分数
   * @param comment 评论数据
   */
  static calculateHotScore(comment: CommentData): number {
    const now = new Date();
    const createdAt = new Date(comment.createdAt);
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // 简化的热度算法：点赞数 / (时间衰减因子)
    const timeDecay = Math.max(1, ageInHours / 24); // 每24小时衰减一半
    const hotScore = (comment.likeCount || 0) / timeDecay;

    return Math.round(hotScore * 100) / 100; // 保留两位小数
  }

  /**
   * 过滤敏感信息
   * @param comment 评论数据
   * @param isAdmin 是否为管理员
   */
  static sanitizeComment(comment: CommentData, isAdmin: boolean = false): CommentData {
    const sanitized = { ...comment };

    // 非管理员不能看到敏感信息
    if (!isAdmin) {
      sanitized.guestIp = null;
      sanitized.guestContact = null;
    }

    return sanitized;
  }
}

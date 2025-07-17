/**
 * @fileoverview 评论统计查询类
 * @description 处理评论相关的统计分析查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { BaseCommentQuery } from './BaseCommentQuery';
import { CommentStatus, UserLevel } from '../types';

/**
 * 评论统计查询类
 */
export class StatsCommentQuery extends BaseCommentQuery {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * 获取评论总体统计
   * @returns 评论总体统计
   */
  async getOverallStats(): Promise<{
    totalComments: number;
    totalApproved: number;
    totalPending: number;
    totalRejected: number;
    totalDeleted: number;
    totalGuests: number;
    totalRegistered: number;
  }> {
    try {
      const [
        totalComments,
        statusStats,
        guestComments,
        registeredComments,
        deletedComments
      ] = await Promise.all([
        // 总评论数（不包括已删除）
        this.prisma.comment.count({
          where: { isDeleted: false },
        }),

        // 按状态统计
        this.prisma.comment.groupBy({
          by: ['status'],
          where: { isDeleted: false },
          _count: { id: true },
        }),

        // 游客评论数
        this.prisma.comment.count({
          where: {
            isDeleted: false,
            authorId: null,
          },
        }),

        // 注册用户评论数
        this.prisma.comment.count({
          where: {
            isDeleted: false,
            authorId: { not: null },
          },
        }),

        // 已删除评论数
        this.prisma.comment.count({
          where: { isDeleted: true },
        }),
      ]);

      const statusMap = new Map(statusStats.map(stat => [stat.status, stat._count.id]));

      return {
        totalComments,
        totalApproved: statusMap.get('APPROVED') || 0,
        totalPending: statusMap.get('PENDING') || 0,
        totalRejected: statusMap.get('REJECTED') || 0,
        totalDeleted: deletedComments,
        totalGuests: guestComments,
        totalRegistered: registeredComments,
      };

    } catch (error) {
      console.error('获取评论总体统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论趋势统计
   * @param days 统计天数
   * @returns 评论趋势统计
   */
  async getTrendStats(days: number = 30): Promise<Array<{
    date: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await this.prisma.$queryRaw`
        SELECT
          DATE(createdAt) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
        FROM Comment
        WHERE createdAt >= ${startDate} AND isDeleted = false
        GROUP BY DATE(createdAt)
        ORDER BY date
      ` as any[];

      return stats.map(stat => ({
        date: stat.date,
        total: Number(stat.total),
        approved: Number(stat.approved),
        pending: Number(stat.pending),
        rejected: Number(stat.rejected),
      }));

    } catch (error) {
      console.error('获取评论趋势统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门帖子评论统计
   * @param limit 限制数量
   * @returns 热门帖子评论统计
   */
  async getHotPostsCommentStats(limit: number = 10): Promise<Array<{
    postId: string;
    postTitle: string;
    commentCount: number;
    approvedCount: number;
    pendingCount: number;
    averageLikes: number;
  }>> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          c.postId,
          p.title as postTitle,
          COUNT(*) as commentCount,
          SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
          SUM(CASE WHEN c.status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount,
          AVG(c.likeCount) as averageLikes
        FROM Comment c
        LEFT JOIN Post p ON c.postId = p.id
        WHERE c.isDeleted = false
        GROUP BY c.postId, p.title
        ORDER BY commentCount DESC
        LIMIT ${limit}
      ` as any[];

      return stats.map(stat => ({
        postId: stat.postId,
        postTitle: stat.postTitle || '未知帖子',
        commentCount: Number(stat.commentCount),
        approvedCount: Number(stat.approvedCount),
        pendingCount: Number(stat.pendingCount),
        averageLikes: Number(stat.averageLikes) || 0,
      }));

    } catch (error) {
      console.error('获取热门帖子评论统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃用户评论统计
   * @param limit 限制数量
   * @param days 统计天数
   * @returns 活跃用户评论统计
   */
  async getActiveUsersCommentStats(
    limit: number = 10,
    days: number = 30
  ): Promise<Array<{
    userId: string;
    username: string;
    displayName: string | null;
    commentCount: number;
    approvedCount: number;
    totalLikes: number;
    averageLikes: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await this.prisma.$queryRaw`
        SELECT
          c.authorId as userId,
          u.username,
          u.displayName,
          COUNT(*) as commentCount,
          SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
          SUM(c.likeCount) as totalLikes,
          AVG(c.likeCount) as averageLikes
        FROM Comment c
        LEFT JOIN User u ON c.authorId = u.id
        WHERE c.isDeleted = false
          AND c.authorId IS NOT NULL
          AND c.createdAt >= ${startDate}
        GROUP BY c.authorId, u.username, u.displayName
        ORDER BY commentCount DESC
        LIMIT ${limit}
      ` as any[];

      return stats.map(stat => ({
        userId: stat.userId,
        username: stat.username || '未知用户',
        displayName: stat.displayName,
        commentCount: Number(stat.commentCount),
        approvedCount: Number(stat.approvedCount),
        totalLikes: Number(stat.totalLikes) || 0,
        averageLikes: Number(stat.averageLikes) || 0,
      }));

    } catch (error) {
      console.error('获取活跃用户评论统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论审核效率统计
   * @param days 统计天数
   * @returns 评论审核效率统计
   */
  async getModerationEfficiencyStats(days: number = 30): Promise<{
    totalReviewed: number;
    totalApproved: number;
    totalRejected: number;
    approvalRate: number;
    averageReviewTime: number;
    pendingCount: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [reviewedStats, pendingCount] = await Promise.all([
        this.prisma.$queryRaw`
          SELECT
            COUNT(*) as totalReviewed,
            SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as totalApproved,
            SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as totalRejected,
            AVG(CASE
              WHEN reviewedAt IS NOT NULL AND createdAt IS NOT NULL
              THEN EXTRACT(EPOCH FROM (reviewedAt - createdAt))/3600
              ELSE NULL
            END) as averageReviewTime
          FROM Comment
          WHERE isDeleted = false
            AND status IN ('APPROVED', 'REJECTED')
            AND createdAt >= ${startDate}
        ` as unknown as any[],

        this.prisma.comment.count({
          where: {
            isDeleted: false,
            status: 'PENDING',
          },
        }),
      ]);

      const stats = reviewedStats[0];
      const totalReviewed = Number(stats.totalReviewed);
      const totalApproved = Number(stats.totalApproved);
      const totalRejected = Number(stats.totalRejected);

      return {
        totalReviewed,
        totalApproved,
        totalRejected,
        approvalRate: totalReviewed > 0 ? (totalApproved / totalReviewed) * 100 : 0,
        averageReviewTime: Number(stats.averageReviewTime) || 0,
        pendingCount,
      };

    } catch (error) {
      console.error('获取评论审核效率统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论互动统计
   * @param days 统计天数
   * @returns 评论互动统计
   */
  async getInteractionStats(days: number = 30): Promise<{
    totalLikes: number;
    totalReplies: number;
    averageLikesPerComment: number;
    averageRepliesPerComment: number;
    mostLikedComment: {
      id: string;
      content: string;
      likeCount: number;
      authorName: string;
    } | null;
    mostRepliedComment: {
      id: string;
      content: string;
      replyCount: number;
      authorName: string;
    } | null;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        aggregateStats,
        mostLikedComment,
        mostRepliedComment
      ] = await Promise.all([
        // 聚合统计
        this.prisma.comment.aggregate({
          where: {
            isDeleted: false,
            status: 'APPROVED',
            createdAt: { gte: startDate },
          },
          _sum: {
            likeCount: true,
            replyCount: true,
          },
          _avg: {
            likeCount: true,
            replyCount: true,
          },
        }),

        // 最多点赞的评论
        this.prisma.comment.findFirst({
          where: {
            isDeleted: false,
            status: 'APPROVED',
            createdAt: { gte: startDate },
          },
          orderBy: { likeCount: 'desc' },
          select: {
            id: true,
            content: true,
            likeCount: true,
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
            guestName: true,
          },
        }),

        // 最多回复的评论
        this.prisma.comment.findFirst({
          where: {
            isDeleted: false,
            status: 'APPROVED',
            createdAt: { gte: startDate },
          },
          orderBy: { replyCount: 'desc' },
          select: {
            id: true,
            content: true,
            replyCount: true,
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
            guestName: true,
          },
        }),
      ]);

      return {
        totalLikes: aggregateStats._sum.likeCount || 0,
        totalReplies: aggregateStats._sum.replyCount || 0,
        averageLikesPerComment: aggregateStats._avg.likeCount || 0,
        averageRepliesPerComment: aggregateStats._avg.replyCount || 0,
        mostLikedComment: mostLikedComment ? {
          id: mostLikedComment.id,
          content: mostLikedComment.content.substring(0, 100) + '...',
          likeCount: mostLikedComment.likeCount,
          authorName: mostLikedComment.author?.displayName ||
                     mostLikedComment.author?.username ||
                     mostLikedComment.guestName ||
                     '匿名用户',
        } : null,
        mostRepliedComment: mostRepliedComment ? {
          id: mostRepliedComment.id,
          content: mostRepliedComment.content.substring(0, 100) + '...',
          replyCount: mostRepliedComment.replyCount,
          authorName: mostRepliedComment.author?.displayName ||
                     mostRepliedComment.author?.username ||
                     mostRepliedComment.guestName ||
                     '匿名用户',
        } : null,
      };

    } catch (error) {
      console.error('获取评论互动统计失败:', error);
      throw error;
    }
  }
}

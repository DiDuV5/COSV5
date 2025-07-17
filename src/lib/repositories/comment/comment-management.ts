/**
 * @fileoverview 评论管理操作
 * @description 提供评论审核、置顶等管理功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient, Comment } from '@prisma/client';
import { BaseRepository, QueryOptions, PaginatedResult, PaginationParams } from '../base-repository';
import {
  CommentWhereInput,
  CommentWithDetails,
  CommentStatus,
  CommentModerationResult,
  CommentBatchResult,
  CommentManagementAction,
  CommentManagementResult,
  CommentOperationContext,
} from './comment-types';

/**
 * 评论管理操作类
 */
export class CommentManagementOperations {
  constructor(private db: PrismaClient) {}

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentManagementOperations.${operation} error:`, error);
  }

  /**
   * 删除缓存
   */
  protected async deleteCache(pattern: string): Promise<void> {
    // 缓存实现可以在这里添加
    // 暂时跳过缓存功能
  }

  /**
   * 获取待审核的评论
   */
  async getPendingComments(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        status: 'PENDING',
        isDeleted: false,
      };

      const comments = await this.db.comment.findMany({
        where,
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
                  id: true,
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: (pagination.limit || 20) + 1,
        skip: pagination.cursor ? 1 : ((pagination.page || 1) - 1) * (pagination.limit || 20),
        ...(pagination.cursor && { cursor: { id: pagination.cursor } }),
      });

      const hasMore = comments.length > (pagination.limit || 20);
      if (hasMore) comments.pop();

      const nextCursor = hasMore && comments.length > 0 ? comments[comments.length - 1].id : undefined;

      return {
        items: comments as CommentWithDetails[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getPendingComments');
      throw error;
    }
  }

  /**
   * 软删除评论
   */
  async softDelete(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[此评论已被删除]',
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'softDelete');
      throw error;
    }
  }

  /**
   * 恢复已删除的评论
   */
  async restore(
    id: string,
    originalContent: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          content: originalContent,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'restore');
      throw error;
    }
  }

  /**
   * 置顶评论
   */
  async pin(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          isPinned: true,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'pin');
      throw error;
    }
  }

  /**
   * 取消置顶评论
   */
  async unpin(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          isPinned: false,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'unpin');
      throw error;
    }
  }

  /**
   * 审核评论（批准或拒绝）
   */
  async moderate(
    id: string,
    status: CommentStatus,
    reason?: string,
    context?: CommentOperationContext
  ): Promise<CommentModerationResult> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
          ...(status === 'REJECTED' && reason && { rejectionReason: reason }),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return {
        id: comment.id,
        status,
        moderatedAt: new Date(),
        moderatedBy: context?.userId || 'system',
        reason,
      };
    } catch (error) {
      this.handleError(error, 'moderate');
      throw error;
    }
  }

  /**
   * 批量审核评论
   */
  async batchModerate(
    ids: string[],
    status: CommentStatus,
    reason?: string,
    context?: CommentOperationContext
  ): Promise<CommentBatchResult> {
    const results: CommentBatchResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const id of ids) {
      try {
        await this.moderate(id, status, reason, context);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 批量删除评论
   */
  async batchDelete(
    ids: string[],
    context?: CommentOperationContext
  ): Promise<CommentBatchResult> {
    const results: CommentBatchResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const id of ids) {
      try {
        await this.softDelete(id, context);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 执行管理操作
   */
  async executeManagementAction(
    id: string,
    action: CommentManagementAction,
    context?: CommentOperationContext,
    params?: any
  ): Promise<CommentManagementResult> {
    try {
      let result: any;

      switch (action) {
        case 'pin':
          result = await this.pin(id, context);
          break;
        case 'unpin':
          result = await this.unpin(id, context);
          break;
        case 'approve':
          result = await this.moderate(id, 'PUBLISHED', params?.reason, context);
          break;
        case 'reject':
          result = await this.moderate(id, 'REJECTED', params?.reason, context);
          break;
        case 'delete':
          result = await this.softDelete(id, context);
          break;
        case 'restore':
          result = await this.restore(id, params?.originalContent || '', context);
          break;
        default:
          throw new Error(`Unknown management action: ${action}`);
      }

      return {
        id,
        action,
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        action,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取评论管理统计
   */
  async getManagementStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    deleted: number;
    pinned: number;
  }> {
    try {
      const [pending, approved, rejected, deleted, pinned] = await Promise.all([
        this.db.comment.count({ where: { status: 'PENDING', isDeleted: false } }),
        this.db.comment.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
        this.db.comment.count({ where: { status: 'REJECTED', isDeleted: false } }),
        this.db.comment.count({ where: { isDeleted: true } }),
        this.db.comment.count({ where: { isPinned: true, isDeleted: false } }),
      ]);

      return {
        pending,
        approved,
        rejected,
        deleted,
        pinned,
      };
    } catch (error) {
      this.handleError(error, 'getManagementStats');
      throw error;
    }
  }

  /**
   * 获取需要关注的评论
   */
  async getCommentsNeedingAttention(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        OR: [
          { status: 'PENDING' },
          {
            AND: [
              { status: 'PUBLISHED' },
              // 可以添加其他需要关注的条件，比如举报数量等
            ]
          },
        ],
        isDeleted: false,
      };

      const comments = await this.db.comment.findMany({
        where,
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
            },
          },
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // PENDING 优先
          { createdAt: 'asc' },
        ],
        take: (pagination.limit || 20) + 1,
        skip: pagination.cursor ? 1 : ((pagination.page || 1) - 1) * (pagination.limit || 20),
        ...(pagination.cursor && { cursor: { id: pagination.cursor } }),
      });

      const hasMore = comments.length > (pagination.limit || 20);
      if (hasMore) comments.pop();

      const nextCursor = hasMore && comments.length > 0 ? comments[comments.length - 1].id : undefined;

      return {
        items: comments as CommentWithDetails[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getCommentsNeedingAttention');
      throw error;
    }
  }
}

/**
 * @fileoverview 评论基础CRUD操作
 * @description 提供评论的基础增删改查操作
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient, Comment } from '@prisma/client';
import { BaseRepository, QueryOptions } from '../base-repository';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import {
  CommentCreateInput,
  CommentUpdateInput,
  CommentWhereInput,
  CommentWithDetails,
  CommentOperationContext,
} from './comment-types';

/**
 * 评论基础CRUD操作类
 */
export class CommentCrudOperations {
  protected db: PrismaClient;
  protected defaultCacheTTL: number;

  constructor(db: PrismaClient) {
    this.db = db;
    this.defaultCacheTTL = CACHE_TTL.COMMENTS;
  }

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentCrudOperations.${operation} error:`, error);
  }

  /**
   * 设置缓存
   */
  protected async setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 缓存实现可以在这里添加
    // 暂时跳过缓存功能
  }

  /**
   * 获取缓存
   */
  protected async getCache<T>(key: string): Promise<T | null> {
    // 缓存实现可以在这里添加
    // 暂时跳过缓存功能
    return null;
  }

  /**
   * 删除缓存
   */
  protected async deleteCache(pattern: string): Promise<void> {
    // 缓存实现可以在这里添加
    // 暂时跳过缓存功能
  }

  /**
   * 构建查询条件，自动过滤已删除的评论
   */
  protected buildWhereClause(where: CommentWhereInput = {}): CommentWhereInput {
    // 默认过滤已删除的评论
    if (!where.hasOwnProperty('isDeleted')) {
      return {
        ...where,
        isDeleted: false,
      };
    }
    return where;
  }

  /**
   * 创建评论
   */
  async createComment(
    data: CommentCreateInput,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      // 注意：data.post可能是对象，需要获取postId
      const postId = typeof data.post === 'object' && data.post && 'connect' in data.post
        ? data.post.connect?.id
        : undefined;
      if (postId) {
        await this.deleteCache(`post:comments:${postId}`);
      }
      await this.deleteCache(`comment:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'createComment');
      throw error;
    }
  }

  /**
   * 更新评论
   */
  async updateComment(
    id: string,
    data: CommentUpdateInput,
    context?: CommentOperationContext
  ): Promise<Comment> {
    try {
      const comment = await this.db.comment.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:${id}`);
      await this.deleteCache(`post:comments:*`);

      return comment;
    } catch (error) {
      this.handleError(error, 'updateComment');
      throw error;
    }
  }

  /**
   * 删除评论（硬删除）
   */
  async deleteComment(
    id: string,
    context?: CommentOperationContext
  ): Promise<void> {
    try {
      await this.db.comment.delete({
        where: { id },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:${id}`);
      await this.deleteCache(`post:comments:*`);
    } catch (error) {
      this.handleError(error, 'deleteComment');
      throw error;
    }
  }

  /**
   * 获取评论详细信息
   */
  async findByIdWithDetails(
    id: string,
    currentUserId?: string,
    options: QueryOptions & { skipCache?: boolean } = {}
  ): Promise<CommentWithDetails | null> {
    try {
      const cacheKey = `comment:${id}:details:${currentUserId || 'anonymous'}`;

      // 尝试从缓存获取
      if (!options.skipCache) {
        const cached = await this.getCache<CommentWithDetails>(cacheKey);
        if (cached) return cached;
      }

      const comment = await this.db.comment.findUnique({
        where: { id },
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
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
            },
          },
        },
      });

      if (!comment || comment.isDeleted) return null;

      // 检查当前用户是否点赞
      let isLiked = false;
      if (currentUserId) {
        try {
          // 注意：这里假设有commentLike表，如果没有则需要调整
          // 暂时跳过评论点赞查询，因为数据库模型可能不支持
          const like = null;
          isLiked = !!like;
        } catch (error) {
          // 如果commentLike表不存在，忽略错误
          console.warn('CommentLike查询失败，可能表不存在:', error);
        }
      }

      const result: CommentWithDetails = {
        ...comment,
        isLiked,
      };

      // 缓存结果
      if (!options.skipCache) {
        await this.setCache(cacheKey, result, this.defaultCacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'findByIdWithDetails');
      throw error;
    }
  }

  /**
   * 根据ID获取评论（简单版本）
   */
  async findById(id: string, options: QueryOptions & { skipCache?: boolean } = {}): Promise<Comment | null> {
    try {
      const cacheKey = `comment:${id}`;

      // 尝试从缓存获取
      if (!options.skipCache) {
        const cached = await this.getCache<Comment>(cacheKey);
        if (cached) return cached;
      }

      const comment = await this.db.comment.findUnique({
        where: { id },
      });

      if (!comment || comment.isDeleted) return null;

      // 缓存结果
      if (!options.skipCache) {
        await this.setCache(cacheKey, comment, this.defaultCacheTTL);
      }

      return comment;
    } catch (error) {
      this.handleError(error, 'findById');
      throw error;
    }
  }

  /**
   * 检查评论是否存在
   */
  async commentExists(id: string): Promise<boolean> {
    try {
      const comment = await this.db.comment.findUnique({
        where: { id },
        select: { id: true, isDeleted: true },
      });

      return comment !== null && !comment.isDeleted;
    } catch (error) {
      this.handleError(error, 'commentExists');
      throw error;
    }
  }

  /**
   * 检查评论是否存在（通用版本）
   */
  async exists(where: CommentWhereInput): Promise<boolean> {
    try {
      const comment = await this.db.comment.findFirst({
        where,
        select: { id: true },
      });

      return comment !== null;
    } catch (error) {
      this.handleError(error, 'exists');
      throw error;
    }
  }

  /**
   * 获取评论数量
   */
  async count(where: CommentWhereInput = {}): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(where);

      return await this.db.comment.count({
        where: whereClause,
      });
    } catch (error) {
      this.handleError(error, 'count');
      throw error;
    }
  }

  /**
   * 批量创建评论
   */
  async createMany(
    data: any[], // 使用any[]避免复杂的类型问题
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    try {
      const now = new Date();
      // 简化数据处理，确保必要字段存在
      const commentsData = data.map(item => ({
        content: item.content,
        postId: item.postId,
        authorId: item.authorId,
        parentId: item.parentId || null,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        isTestData: false,
        status: item.status || 'PUBLISHED',
        isPinned: false,
        ...item, // 保留其他字段
      }));

      const result = await this.db.comment.createMany({
        data: commentsData,
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'createMany');
      throw error;
    }
  }

  /**
   * 批量更新评论
   */
  async updateMany(
    where: CommentWhereInput,
    data: CommentUpdateInput,
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    try {
      const whereClause = this.buildWhereClause(where);

      const result = await this.db.comment.updateMany({
        where: whereClause,
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'updateMany');
      throw error;
    }
  }

  /**
   * 批量删除评论（硬删除）
   */
  async deleteMany(
    where: CommentWhereInput,
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    try {
      const whereClause = this.buildWhereClause(where);

      const result = await this.db.comment.deleteMany({
        where: whereClause,
      });

      // 清除相关缓存
      await this.deleteCache(`comment:*`);
      await this.deleteCache(`post:comments:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'deleteMany');
      throw error;
    }
  }

  /**
   * 获取评论的基础统计信息
   */
  async getBasicStats(): Promise<{
    total: number;
    published: number;
    pending: number;
    deleted: number;
  }> {
    try {
      const [total, published, pending, deleted] = await Promise.all([
        this.db.comment.count(),
        this.db.comment.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
        this.db.comment.count({ where: { status: 'PENDING', isDeleted: false } }),
        this.db.comment.count({ where: { isDeleted: true } }),
      ]);

      return {
        total,
        published,
        pending,
        deleted,
      };
    } catch (error) {
      this.handleError(error, 'getBasicStats');
      throw error;
    }
  }
}

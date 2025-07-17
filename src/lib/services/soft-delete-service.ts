/**
 * @fileoverview 软删除管理服务
 * @description 提供统一的软删除管理功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import {
  SoftDeleteMiddleware,
  SoftDeleteOptions,
  SoftDeleteUtils,
  SoftDeleteQueryBuilder
} from '@/lib/middleware/soft-delete-middleware';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 软删除管理服务
 */
export class SoftDeleteService {
  /**
   * 软删除帖子
   */
  static async deletePost(
    postId: string,
    options: SoftDeleteOptions = {}
  ): Promise<any> {
    try {
      // 检查帖子是否存在且未被删除
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, title: true },
      });

      if (!post) {
        throw TRPCErrorHandler.validationError('帖子不存在');
      }

      if ((post as any).isDeleted) {
        throw TRPCErrorHandler.validationError('帖子已被删除');
      }

      // 执行软删除
      const updateData = SoftDeleteMiddleware.createSoftDeleteData(options);

      const deletedPost = await prisma.post.update({
        where: { id: postId },
        data: updateData as any,
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'POST_SOFT_DELETE',
          userId: options.deletedBy || 'system',
          message: `帖子 "${post.title}" 被软删除`,
          level: 'INFO',
        } as any,
      });

      return deletedPost;
    } catch (error) {
      console.error('软删除帖子失败:', error);
      throw error;
    }
  }

  /**
   * 恢复帖子
   */
  static async restorePost(postId: string, restoredBy?: string): Promise<any> {
    try {
      // 检查帖子是否存在且已被删除
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, title: true },
      });

      if (!post) {
        throw TRPCErrorHandler.validationError('帖子不存在');
      }

      if (!(post as any).isDeleted) {
        throw TRPCErrorHandler.validationError('帖子未被删除');
      }

      // 执行恢复
      const restoreData = SoftDeleteMiddleware.createRestoreData();

      const restoredPost = await prisma.post.update({
        where: { id: postId },
        data: restoreData as any,
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'POST_RESTORE',
          userId: restoredBy || 'system',
          message: `帖子 "${post.title}" 被恢复`,
          level: 'INFO',
        } as any,
      });

      return restoredPost;
    } catch (error) {
      console.error('恢复帖子失败:', error);
      throw error;
    }
  }

  /**
   * 软删除评论
   */
  static async deleteComment(
    commentId: string,
    options: SoftDeleteOptions = {}
  ): Promise<any> {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, isDeleted: true, content: true },
      });

      if (!comment) {
        throw TRPCErrorHandler.validationError('评论不存在');
      }

      if (comment.isDeleted) {
        throw TRPCErrorHandler.validationError('评论已被删除');
      }

      const updateData = {
        ...SoftDeleteMiddleware.createSoftDeleteData(options),
        content: '[此评论已被删除]', // 隐藏评论内容
      };

      const deletedComment = await prisma.comment.update({
        where: { id: commentId },
        data: updateData,
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'COMMENT_SOFT_DELETE',
          userId: options.deletedBy || 'system',
          message: `评论被软删除`,
          level: 'INFO',
        } as any,
      });

      return deletedComment;
    } catch (error) {
      console.error('软删除评论失败:', error);
      throw error;
    }
  }

  /**
   * 批量软删除
   */
  static async batchDelete(
    model: 'post' | 'comment' | 'user',
    ids: string[],
    options: SoftDeleteOptions = {}
  ): Promise<{ count: number }> {
    try {
      let result;

      switch (model) {
        case 'post':
          result = await SoftDeleteUtils.batchSoftDelete(prisma.post, ids, options);
          break;
        case 'comment':
          result = await SoftDeleteUtils.batchSoftDelete(prisma.comment, ids, options);
          break;
        case 'user':
          result = await SoftDeleteUtils.batchSoftDelete(prisma.user, ids, options);
          break;
        default:
          throw TRPCErrorHandler.validationError('不支持的模型类型');
      }

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'BATCH_SOFT_DELETE',
          userId: options.deletedBy || 'system',
          message: `批量软删除 ${model}: ${ids.length} 条记录`,
          level: 'INFO',
        } as any,
      });

      return result;
    } catch (error) {
      console.error('批量软删除失败:', error);
      throw error;
    }
  }

  /**
   * 批量恢复
   */
  static async batchRestore(
    model: 'post' | 'comment' | 'user',
    ids: string[],
    restoredBy?: string
  ): Promise<{ count: number }> {
    try {
      let result;

      switch (model) {
        case 'post':
          result = await SoftDeleteUtils.batchRestore(prisma.post, ids);
          break;
        case 'comment':
          result = await SoftDeleteUtils.batchRestore(prisma.comment, ids);
          break;
        case 'user':
          result = await SoftDeleteUtils.batchRestore(prisma.user, ids);
          break;
        default:
          throw TRPCErrorHandler.validationError('不支持的模型类型');
      }

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'BATCH_RESTORE',
          userId: restoredBy || 'system',
          message: `批量恢复 ${model}: ${ids.length} 条记录`,
          level: 'INFO',
        } as any,
      });

      return result;
    } catch (error) {
      console.error('批量恢复失败:', error);
      throw error;
    }
  }

  /**
   * 永久删除
   */
  static async permanentDelete(
    model: 'post' | 'comment' | 'user',
    ids: string[],
    deletedBy?: string
  ): Promise<{ count: number }> {
    try {
      let result;

      switch (model) {
        case 'post':
          result = await SoftDeleteUtils.permanentDelete(prisma.post, ids);
          break;
        case 'comment':
          result = await SoftDeleteUtils.permanentDelete(prisma.comment, ids);
          break;
        case 'user':
          result = await SoftDeleteUtils.permanentDelete(prisma.user, ids);
          break;
        default:
          throw TRPCErrorHandler.validationError('不支持的模型类型');
      }

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'PERMANENT_DELETE',
          userId: deletedBy || 'system',
          message: `永久删除 ${model}: ${ids.length} 条记录`,
          level: 'WARN',
        } as any,
      });

      return result;
    } catch (error) {
      console.error('永久删除失败:', error);
      throw error;
    }
  }

  /**
   * 获取软删除统计信息
   */
  static async getStats(): Promise<{
    posts: any;
    comments: any;
    users: any;
  }> {
    try {
      const [posts, comments, users] = await Promise.all([
        SoftDeleteUtils.getStats(prisma.post),
        SoftDeleteUtils.getStats(prisma.comment),
        SoftDeleteUtils.getStats(prisma.user),
      ]);

      return { posts, comments, users };
    } catch (error) {
      console.error('获取软删除统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期的软删除记录
   */
  static async cleanupExpired(daysOld: number = 30): Promise<{
    posts: number;
    comments: number;
    users: number;
  }> {
    try {
      const [posts, comments, users] = await Promise.all([
        SoftDeleteUtils.cleanupExpiredDeleted(prisma.post, daysOld),
        SoftDeleteUtils.cleanupExpiredDeleted(prisma.comment, daysOld),
        SoftDeleteUtils.cleanupExpiredDeleted(prisma.user, daysOld),
      ]);

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          action: 'CLEANUP_EXPIRED_DELETED',
          userId: 'system',
          message: `清理 ${daysOld} 天前的软删除记录`,
          level: 'INFO',
        } as any,
      });

      return {
        posts: posts.count,
        comments: comments.count,
        users: users.count,
      };
    } catch (error) {
      console.error('清理过期软删除记录失败:', error);
      throw error;
    }
  }

  /**
   * 创建软删除查询构建器
   */
  static createQueryBuilder(initialWhere: any = {}): SoftDeleteQueryBuilder {
    return new SoftDeleteQueryBuilder(initialWhere);
  }
}

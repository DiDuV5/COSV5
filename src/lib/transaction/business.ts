/**
 * @fileoverview 业务事务操作
 * @description 提供具体的业务事务操作方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client';
import { TransactionCore } from './core';
import {
  TransactionResult,
  PostWithMediaResult,
  PostDeleteResult,
  UserProfileUpdateResult,
  UserRegistrationResult
} from './types';

/**
 * 业务事务操作类
 */
export class BusinessTransactions {
  /**
   * 创建帖子和媒体记录的事务
   */
  static async createPostWithMedia(
    postData: Prisma.PostCreateInput,
    mediaData: Prisma.PostMediaCreateManyInput[]
  ): Promise<TransactionResult<PostWithMediaResult>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 创建帖子
      const post = await tx.post.create({
        data: postData,
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
              likes: true,
              comments: true,
            },
          },
        },
      });

      // 2. 更新媒体记录的postId
      const updatedMediaData = mediaData.map(media => ({
        ...media,
        postId: post.id,
      }));

      // 3. 批量创建媒体记录
      await tx.postMedia.createMany({
        data: updatedMediaData,
      });

      // 4. 获取创建的媒体记录
      const media = await tx.postMedia.findMany({
        where: { postId: post.id },
        orderBy: { order: 'asc' },
      });

      console.log(`📝 事务成功创建帖子 ${post.id} 和 ${media.length} 个媒体记录`);

      return { post, media };
    });
  }

  /**
   * 软删除帖子的事务
   */
  static async softDeletePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<PostDeleteResult>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 验证帖子存在和权限
      const post = await tx.post.findUnique({
        where: {
          id: postId,
          isDeleted: false // 只能软删除未删除的帖子
        },
        include: {
          media: true,
          author: { select: { id: true, userLevel: true } },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('帖子不存在或已被删除');
      }

      // 检查权限：作者本人或管理员
      const isOwner = post.authorId === userId;
      const currentUserIsAdmin = await tx.user.findUnique({
        where: { id: userId },
        select: { userLevel: true },
      });

      if (!isOwner && !['ADMIN', 'SUPER_ADMIN'].includes(currentUserIsAdmin?.userLevel || '')) {
        throw new Error('没有删除权限');
      }

      // 2. 获取统计信息
      const mediaCount = post.media.length;
      const commentCount = post._count.comments;
      const likeCount = post._count.likes;

      // 3. 软删除帖子（不删除关联数据，只标记为已删除）
      const deletedPost = await tx.post.update({
        where: { id: postId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          deletionReason: reason || '未提供原因',
        },
      });

      // 4. 记录审计日志
      await tx.auditLog.create({
        data: {
          action: 'SOFT_DELETE_POST',
          userId: userId,
          message: `软删除帖子: ${post.title} (ID: ${postId})${reason ? `, 原因: ${reason}` : ''}`,
          level: 'WARN',
          details: JSON.stringify({
            postId: postId,
            postTitle: post.title,
            authorId: post.authorId,
            deletedBy: userId,
            reason: reason || '未提供原因',
            isOwnerDelete: isOwner,
            associatedCounts: {
              media: mediaCount,
              comments: commentCount,
              likes: likeCount,
            },
          }),
        },
      });

      console.log(`🗑️ 事务成功软删除帖子 ${postId}，关联数据保留`);

      return {
        post: deletedPost,
        deletedMedia: [], // 软删除不删除媒体文件
        deletedCounts: {
          media: 0, // 软删除不删除媒体文件
          comments: 0, // 软删除不删除评论
          likes: 0, // 软删除不删除点赞
        },
      };
    });
  }

  /**
   * 恢复软删除的帖子
   */
  static async restorePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<{ post: any }>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 验证帖子存在且已被软删除
      const post = await tx.post.findUnique({
        where: {
          id: postId,
          isDeleted: true // 只能恢复已软删除的帖子
        },
        select: {
          id: true,
          title: true,
          authorId: true,
          deletedBy: true,
        },
      });

      if (!post) {
        throw new Error('帖子不存在或未被删除');
      }

      // 2. 检查权限：只有管理员可以恢复
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { userLevel: true },
      });

      if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.userLevel || '')) {
        throw new Error('只有管理员可以恢复已删除的帖子');
      }

      // 3. 恢复帖子
      const restoredPost = await tx.post.update({
        where: { id: postId },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      });

      // 4. 记录审计日志
      await tx.auditLog.create({
        data: {
          action: 'RESTORE_POST',
          userId: userId,
          message: `恢复帖子: ${post.title} (ID: ${postId})${reason ? `, 原因: ${reason}` : ''}`,
          level: 'INFO',
          details: JSON.stringify({
            postId: postId,
            postTitle: post.title,
            authorId: post.authorId,
            restoredBy: userId,
            originalDeletedBy: post.deletedBy,
            reason: reason || '未提供原因',
          }),
        },
      });

      console.log(`♻️ 事务成功恢复帖子 ${postId}`);

      return { post: restoredPost };
    });
  }

  /**
   * 永久删除帖子和相关数据（管理员专用）
   */
  static async permanentDeletePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<PostDeleteResult>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 验证帖子存在
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          media: true,
          author: { select: { id: true, userLevel: true } },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('帖子不存在');
      }

      // 2. 检查权限：只有管理员可以永久删除
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { userLevel: true },
      });

      if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.userLevel || '')) {
        throw new Error('只有管理员可以永久删除帖子');
      }

      // 3. 获取要删除的媒体记录
      const mediaToDelete = [...post.media];

      // 4. 删除关联数据（按依赖关系顺序）

      // 4.1 删除评论的点赞记录
      await tx.commentLike.deleteMany({
        where: {
          comment: {
            postId: postId,
          },
        },
      });

      // 4.2 删除评论记录
      const deletedComments = await tx.comment.deleteMany({
        where: { postId },
      });

      // 4.3 删除帖子的点赞记录
      const deletedLikes = await tx.like.deleteMany({
        where: { postId },
      });

      // 4.4 删除媒体记录
      const deletedMedia = await tx.postMedia.deleteMany({
        where: { postId },
      });

      // 4.5 永久删除帖子本身
      const deletedPost = await tx.post.delete({
        where: { id: postId },
      });

      // 5. 记录审计日志
      await tx.auditLog.create({
        data: {
          action: 'PERMANENT_DELETE_POST',
          userId: userId,
          message: `永久删除帖子: ${post.title} (ID: ${postId})${reason ? `, 原因: ${reason}` : ''}`,
          level: 'ERROR', // 永久删除是高风险操作
          details: JSON.stringify({
            postId: postId,
            postTitle: post.title,
            authorId: post.authorId,
            deletedBy: userId,
            reason: reason || '未提供原因',
            deletedCounts: {
              media: mediaToDelete.length,
              comments: deletedComments.count,
              likes: deletedLikes.count,
            },
          }),
        },
      });

      console.log(`💀 事务成功永久删除帖子 ${postId} 和 ${mediaToDelete.length} 个媒体记录`);

      return {
        post: deletedPost,
        deletedMedia: mediaToDelete,
        deletedCounts: {
          media: mediaToDelete.length,
          comments: deletedComments.count,
          likes: deletedLikes.count,
        },
      };
    });
  }

  /**
   * 更新用户信息的事务
   */
  static async updateUserProfile(
    userId: string,
    userData: Prisma.UserUpdateInput,
    avatarData?: Prisma.PostMediaCreateInput
  ): Promise<TransactionResult<UserProfileUpdateResult>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 更新用户信息
      const user = await tx.user.update({
        where: { id: userId },
        data: userData,
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          location: true,
          website: true,
          avatarUrl: true,
          userLevel: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      // 2. 如果有头像数据，创建头像记录
      const avatar = null;
      if (avatarData) {
        // 头像功能暂时跳过，因为需要复杂的关联设置
        // avatar = await tx.postMedia.create({
        //   data: {
        //     ...avatarData,
        //     postId: null, // 头像不属于任何帖子
        //   },
        // });

        // 3. 更新用户的头像URL（暂时跳过，因为avatar未创建）
        // await tx.user.update({
        //   where: { id: userId },
        //   data: { avatarUrl: avatar?.url },
        // });
      }

      console.log(`👤 事务成功更新用户 ${userId} 的信息`);

      return { user, avatar };
    });
  }

  /**
   * 用户注册事务
   */
  static async registerUser(
    userData: Prisma.UserCreateInput,
    initialPermissions?: any // 暂时使用any类型，因为UserPermission表可能不存在
  ): Promise<TransactionResult<UserRegistrationResult>> {
    return TransactionCore.executeTransaction(async (tx) => {
      // 1. 创建用户
      const user = await tx.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          userLevel: true,
          isVerified: true,
          createdAt: true,
        },
      });

      const permissions = null;

      // 2. 权限配置功能暂时跳过，因为UserPermission表可能不存在
      // if (initialPermissions) {
      //   permissions = await tx.userPermission.create({
      //     data: {
      //       ...initialPermissions,
      //       userId: user.id,
      //     },
      //   });
      // }

      // 3. 记录审计日志
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTER',
          message: `用户注册: ${user.username}`,
          details: JSON.stringify({
            userLevel: user.userLevel,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: 'unknown',
        },
      });

      console.log(`🎉 事务成功注册用户 ${user.username}`);

      return { user, permissions };
    });
  }
}

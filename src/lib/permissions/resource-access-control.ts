/**
 * @fileoverview 资源访问控制模块
 * @description 细粒度资源权限检查
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { type ResourceAccessParams, RESOURCE_TYPES, OPERATIONS } from './types';

/**
 * 资源访问控制器
 */
export class ResourceAccessController {
  /**
   * 检查资源访问权限（细粒度控制）
   */
  async checkResourceAccess(params: ResourceAccessParams): Promise<boolean> {
    const { userId, resourceType, resourceId, operation, db } = params;

    try {
      // 根据资源类型进行细粒度权限检查
      switch (resourceType) {
        case 'post':
          return await this.checkPostAccess(userId, resourceId, operation, db);
        case 'comment':
          return await this.checkCommentAccess(userId, resourceId, operation, db);
        case 'user':
          return await this.checkUserAccess(userId, resourceId, operation, db);
        case 'media':
          return await this.checkMediaAccess(userId, resourceId, operation, db);
        case 'system':
          return await this.checkSystemAccess(userId, resourceId, operation, db);
        default:
          console.warn(`未知的资源类型: ${resourceType}`);
          return true; // 默认允许访问
      }
    } catch (error) {
      console.error('资源访问权限检查失败:', error);
      return false;
    }
  }

  /**
   * 检查帖子访问权限
   */
  private async checkPostAccess(
    userId: string,
    postId: string,
    operation: string,
    db: any
  ): Promise<boolean> {
    try {
      const post = await db.post.findUnique({
        where: { id: postId },
        select: {
          authorId: true,
          isPublic: true,
          visibility: true,
          status: true,
          isDeleted: true,
        },
      });

      if (!post || post.isDeleted) {
        return false;
      }

      // 作者总是有权限
      if (post.authorId === userId) {
        return true;
      }

      // 根据操作类型检查权限
      switch (operation) {
        case 'view':
          return this.canViewPost(post);
        case 'edit':
        case 'delete':
          return post.authorId === userId;
        case 'like':
        case 'comment':
          return this.canInteractWithPost(post);
        case 'share':
          return this.canSharePost(post);
        default:
          return this.canViewPost(post);
      }
    } catch (error) {
      console.error('检查帖子访问权限失败:', error);
      return false;
    }
  }

  /**
   * 检查评论访问权限
   */
  private async checkCommentAccess(
    userId: string,
    commentId: string,
    operation: string,
    db: any
  ): Promise<boolean> {
    try {
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        select: {
          authorId: true,
          isDeleted: true,
          status: true,
          post: {
            select: {
              isPublic: true,
              visibility: true,
              authorId: true,
            },
          },
        },
      });

      if (!comment || comment.isDeleted) {
        return false;
      }

      // 作者总是有权限
      if (comment.authorId === userId) {
        return true;
      }

      // 帖子作者可以管理评论
      if (comment.post?.authorId === userId) {
        return true;
      }

      // 根据操作类型检查权限
      switch (operation) {
        case 'view':
          return this.canViewComment(comment);
        case 'edit':
        case 'delete':
          return comment.authorId === userId;
        case 'like':
          return this.canLikeComment(comment);
        case 'reply':
          return this.canReplyToComment(comment);
        default:
          return this.canViewComment(comment);
      }
    } catch (error) {
      console.error('检查评论访问权限失败:', error);
      return false;
    }
  }

  /**
   * 检查用户访问权限
   */
  private async checkUserAccess(
    currentUserId: string,
    targetUserId: string,
    operation: string,
    db: any
  ): Promise<boolean> {
    try {
      // 用户总是可以访问自己的信息
      if (currentUserId === targetUserId) {
        return true;
      }

      const targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: {
          isActive: true,
          isPublic: true,
          privacySettings: true,
        },
      });

      if (!targetUser || !targetUser.isActive) {
        return false;
      }

      // 根据操作类型检查权限
      switch (operation) {
        case 'view_profile':
          return this.canViewUserProfile(targetUser, currentUserId);
        case 'edit_profile':
        case 'delete_account':
          return currentUserId === targetUserId;
        case 'follow':
          return this.canFollowUser(targetUser);
        case 'message':
          return this.canMessageUser(targetUser, currentUserId);
        default:
          return this.canViewUserProfile(targetUser, currentUserId);
      }
    } catch (error) {
      console.error('检查用户访问权限失败:', error);
      return false;
    }
  }

  /**
   * 检查媒体访问权限
   */
  private async checkMediaAccess(
    userId: string,
    mediaId: string,
    operation: string,
    db: any
  ): Promise<boolean> {
    try {
      const media = await db.media.findUnique({
        where: { id: mediaId },
        select: {
          uploaderId: true,
          isPublic: true,
          accessLevel: true,
          status: true,
          isDeleted: true,
        },
      });

      if (!media || media.isDeleted) {
        return false;
      }

      // 上传者总是有权限
      if (media.uploaderId === userId) {
        return true;
      }

      // 根据操作类型检查权限
      switch (operation) {
        case 'view':
        case 'download':
          return this.canAccessMedia(media);
        case 'edit':
        case 'delete':
          return media.uploaderId === userId;
        case 'share':
          return this.canShareMedia(media);
        default:
          return this.canAccessMedia(media);
      }
    } catch (error) {
      console.error('检查媒体访问权限失败:', error);
      return false;
    }
  }

  /**
   * 检查系统访问权限
   */
  private async checkSystemAccess(
    userId: string,
    resourceId: string,
    operation: string,
    db: any
  ): Promise<boolean> {
    try {
      // 获取用户信息
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          userLevel: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return false;
      }

      // 根据操作类型和用户等级检查权限
      switch (operation) {
        case 'admin_panel':
          return ['ADMIN', 'SUPER_ADMIN'].includes(user.userLevel);
        case 'user_management':
          return ['ADMIN', 'SUPER_ADMIN'].includes(user.userLevel);
        case 'content_moderation':
          return ['CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.userLevel);
        case 'system_settings':
          return user.userLevel === 'SUPER_ADMIN';
        default:
          return false;
      }
    } catch (error) {
      console.error('检查系统访问权限失败:', error);
      return false;
    }
  }

  // 帖子相关权限检查辅助方法
  private canViewPost(post: any): boolean {
    return post.isPublic && post.visibility === 'PUBLIC' && post.status === 'PUBLISHED';
  }

  private canInteractWithPost(post: any): boolean {
    return this.canViewPost(post);
  }

  private canSharePost(post: any): boolean {
    return this.canViewPost(post);
  }

  // 评论相关权限检查辅助方法
  private canViewComment(comment: any): boolean {
    return comment.status === 'PUBLISHED' && this.canViewPost(comment.post);
  }

  private canLikeComment(comment: any): boolean {
    return this.canViewComment(comment);
  }

  private canReplyToComment(comment: any): boolean {
    return this.canViewComment(comment);
  }

  // 用户相关权限检查辅助方法
  private canViewUserProfile(user: any, currentUserId: string): boolean {
    if (user.isPublic) {
      return true;
    }

    // 检查隐私设置
    if (user.privacySettings?.profileVisibility === 'PRIVATE') {
      return false;
    }

    return true;
  }

  private canFollowUser(user: any): boolean {
    return user.isActive && user.privacySettings?.allowFollow !== false;
  }

  private canMessageUser(user: any, currentUserId: string): boolean {
    return user.isActive && user.privacySettings?.allowMessages !== false;
  }

  // 媒体相关权限检查辅助方法
  private canAccessMedia(media: any): boolean {
    if (!media.isPublic) {
      return false;
    }

    return media.status === 'ACTIVE' && media.accessLevel !== 'PRIVATE';
  }

  private canShareMedia(media: any): boolean {
    return this.canAccessMedia(media) && media.accessLevel !== 'NO_SHARE';
  }
}

// 创建默认的资源访问控制器实例
export const resourceAccessController = new ResourceAccessController();

/**
 * 兼容性函数 - 保持向后兼容
 */
export async function checkResourceAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  operation: string,
  db: any
): Promise<boolean> {
  return resourceAccessController.checkResourceAccess({
    userId,
    resourceType,
    resourceId,
    operation,
    db,
  });
}

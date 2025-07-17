/**
 * @fileoverview 下载链接权限验证处理器
 * @description 处理下载链接相关的权限验证逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import type {
  UserPermission,
  PostInfo,
  DownloadLinkDetail,
  ERROR_MESSAGES
} from './types';
import {
  createUserPermission,
  checkContentPermission,
  checkLinkPermission
} from './utils';

/**
 * 权限验证处理器
 */
export class PermissionHandler {
  /**
   * 验证内容权限
   */
  public static async validateContentPermission(
    db: any,
    postId: string,
    userPermission: UserPermission
  ): Promise<PostInfo> {
    // 验证内容是否存在
    const post = await db.post.findFirst({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
      },
    });

    if (!post) {
      throw TRPCErrorHandler.notFound("内容不存在");
    }

    // 检查权限：内容作者或管理员
    if (!checkContentPermission(post, userPermission)) {
      throw TRPCErrorHandler.forbidden("无权限管理此内容的下载链接");
    }

    return post;
  }

  /**
   * 验证下载链接权限
   */
  public static async validateLinkPermission(
    db: any,
    linkId: string,
    userPermission: UserPermission
  ): Promise<DownloadLinkDetail> {
    // 验证链接是否存在
    const existingLink = await db.downloadLink.findFirst({
      where: {
        id: linkId,
        deletedAt: null,
      },
      select: {
        id: true,
        postId: true,
        userId: true,
        platform: true,
        url: true,
        extractCode: true,
        cansPrice: true,
        title: true,
        description: true,
        isActive: true,
        sortOrder: true,
        downloadCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existingLink) {
      throw TRPCErrorHandler.notFound("下载链接不存在");
    }

    // 检查权限：链接创建者或管理员
    if (!checkLinkPermission(existingLink, userPermission)) {
      throw TRPCErrorHandler.forbidden("无权限管理此下载链接");
    }

    return existingLink;
  }

  /**
   * 验证下载链接访问权限（用于兑换和查看）
   */
  public static async validateLinkAccess(
    db: any,
    linkId: string
  ): Promise<DownloadLinkDetail> {
    const downloadLink = await db.downloadLink.findFirst({
      where: {
        id: linkId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        postId: true,
        userId: true,
        platform: true,
        url: true,
        extractCode: true,
        cansPrice: true,
        title: true,
        description: true,
        isActive: true,
        sortOrder: true,
        downloadCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!downloadLink) {
      throw TRPCErrorHandler.notFound("下载链接不存在或已禁用");
    }

    return downloadLink;
  }

  /**
   * 批量验证下载链接访问权限
   */
  public static async validateBatchLinkAccess(
    db: any,
    linkIds: string[]
  ): Promise<DownloadLinkDetail[]> {
    if (!linkIds || linkIds.length === 0) {
      return [];
    }

    const downloadLinks = await db.downloadLink.findMany({
      where: {
        id: { in: linkIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        postId: true,
        userId: true,
        platform: true,
        url: true,
        extractCode: true,
        cansPrice: true,
        title: true,
        description: true,
        isActive: true,
        sortOrder: true,
        downloadCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return downloadLinks;
  }

  /**
   * 创建用户权限对象
   */
  public static createUserPermission(userId: string, userLevel: string): UserPermission {
    return createUserPermission(userId, userLevel);
  }

  /**
   * 验证管理员权限
   */
  public static validateAdminPermission(userPermission: UserPermission): void {
    if (!userPermission.isAdmin) {
      throw TRPCErrorHandler.forbidden("需要管理员权限");
    }
  }

  /**
   * 验证用户身份
   */
  public static validateUserIdentity(
    targetUserId: string,
    userPermission: UserPermission
  ): void {
    if (targetUserId !== userPermission.userId && !userPermission.isAdmin) {
      throw TRPCErrorHandler.forbidden("无权限访问其他用户的数据");
    }
  }

  /**
   * 检查用户是否可以创建下载链接
   */
  public static validateCreatePermission(
    post: PostInfo,
    userPermission: UserPermission
  ): void {
    // 检查权限：内容作者或管理员
    if (!checkContentPermission(post, userPermission)) {
      throw TRPCErrorHandler.forbidden("无权限为此内容创建下载链接");
    }
  }

  /**
   * 检查用户是否可以更新下载链接
   */
  public static validateUpdatePermission(
    link: DownloadLinkDetail,
    userPermission: UserPermission
  ): void {
    if (!checkLinkPermission(link, userPermission)) {
      throw TRPCErrorHandler.forbidden("无权限更新此下载链接");
    }
  }

  /**
   * 检查用户是否可以删除下载链接
   */
  public static validateDeletePermission(
    link: DownloadLinkDetail,
    userPermission: UserPermission
  ): void {
    if (!checkLinkPermission(link, userPermission)) {
      throw TRPCErrorHandler.forbidden("无权限删除此下载链接");
    }
  }

  /**
   * 验证兑换权限（检查用户是否可以兑换）
   */
  public static validatePurchasePermission(
    link: DownloadLinkDetail,
    userPermission: UserPermission
  ): void {
    // 用户不能兑换自己创建的下载链接
    if (link.userId === userPermission.userId) {
      throw TRPCErrorHandler.validationError("不能兑换自己创建的下载链接");
    }
  }

  /**
   * 验证批量操作权限
   */
  public static validateBatchOperationPermission(
    itemCount: number,
    maxItems: number = 50
  ): void {
    if (itemCount > maxItems) {
      throw TRPCErrorHandler.validationError(`一次最多操作${maxItems}个项目`);
    }
  }
}

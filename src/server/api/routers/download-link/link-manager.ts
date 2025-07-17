/**
 * @fileoverview 下载链接管理处理器
 * @description 处理下载链接的创建、更新、删除等操作
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import {
  type DownloadLinkInfo,
  type DownloadLinkDetail,
  type UserPermission,
  type PostInfo,
  type CreateDownloadLinkResponse,
  type UpdateDownloadLinkResponse,
  type DeleteDownloadLinkResponse,
  type GetDownloadLinksResponse,
  downloadLinkSelectFields
} from './types';
import {
  validatePlatform,
  validateUrl,
  encryptSensitiveData,
  buildUpdatePayload,
  validateUpdateData,
  formatDownloadLinkInfo
} from './utils';
import { PermissionHandler } from './permission-handler';

/**
 * 下载链接管理处理器
 */
export class LinkManager {
  /**
   * 创建下载链接
   */
  public static async createDownloadLink(
    db: any,
    input: {
      postId: string;
      platform: string;
      url: string;
      extractCode?: string;
      cansPrice: number;
      title: string;
      description?: string;
      sortOrder: number;
    },
    userPermission: UserPermission
  ): Promise<CreateDownloadLinkResponse> {
    // 验证内容权限
    const post = await PermissionHandler.validateContentPermission(
      db,
      input.postId,
      userPermission
    );

    // 验证平台
    if (!validatePlatform(input.platform)) {
      throw TRPCErrorHandler.validationError("不支持的平台类型");
    }

    // 验证URL格式
    if (!validateUrl(input.url)) {
      throw TRPCErrorHandler.validationError("无效的下载链接格式");
    }

    // 加密敏感信息
    const { encryptedUrl, encryptedExtractCode } = encryptSensitiveData({
      url: input.url,
      extractCode: input.extractCode,
    });

    // 创建下载链接
    const downloadLink = await db.downloadLink.create({
      data: {
        postId: input.postId,
        userId: post.authorId, // 使用内容作者ID
        platform: input.platform,
        url: encryptedUrl,
        extractCode: encryptedExtractCode,
        cansPrice: input.cansPrice,
        title: input.title,
        description: input.description,
        sortOrder: input.sortOrder,
      },
      select: downloadLinkSelectFields,
    });

    return {
      success: true,
      data: formatDownloadLinkInfo(downloadLink),
      message: '下载链接创建成功',
    };
  }

  /**
   * 获取内容的下载链接列表 - 需要用户登录
   */
  public static async getDownloadLinksByPostId(
    db: any,
    postId: string,
    userPermission: UserPermission
  ): Promise<GetDownloadLinksResponse> {
    // 验证用户已登录
    if (!userPermission.userId) {
      throw TRPCErrorHandler.unauthorized("需要登录才能查看下载资源");
    }

    const downloadLinks = await db.downloadLink.findMany({
      where: {
        postId,
        isActive: true,
        deletedAt: null,
      },
      select: downloadLinkSelectFields,
      orderBy: { sortOrder: 'asc' },
    });

    // 对于非管理员和非创建者，隐藏敏感信息（URL和提取码）
    const secureDownloadLinks = downloadLinks.map((link: DownloadLinkDetail) => {
      const isOwnerOrAdmin = link.userId === userPermission.userId || userPermission.isAdmin;

      if (isOwnerOrAdmin) {
        // 管理员和创建者可以看到完整信息
        return formatDownloadLinkInfo(link);
      } else {
        // 普通用户只能看到基本信息，URL和提取码需要兑换后才能获取
        const formattedLink = formatDownloadLinkInfo(link);
        return {
          ...formattedLink,
          url: '', // 隐藏URL
          extractCode: '', // 隐藏提取码
        };
      }
    });

    return {
      success: true,
      data: secureDownloadLinks,
    };
  }

  /**
   * 更新下载链接
   */
  public static async updateDownloadLink(
    db: any,
    input: {
      id: string;
      platform?: string;
      url?: string;
      extractCode?: string;
      cansPrice?: number;
      title?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    userPermission: UserPermission
  ): Promise<UpdateDownloadLinkResponse> {
    const { id, ...updateData } = input;

    // 验证链接权限
    const existingLink = await PermissionHandler.validateLinkPermission(
      db,
      id,
      userPermission
    );

    // 验证更新数据
    const validation = validateUpdateData({
      platform: updateData.platform,
      url: updateData.url,
    });

    if (!validation.isValid) {
      throw TRPCErrorHandler.validationError();
    }

    // 构建更新数据
    const updatePayload = buildUpdatePayload(updateData);

    // 如果没有要更新的数据，直接返回
    if (Object.keys(updatePayload).length === 0) {
      return {
        success: true,
        data: formatDownloadLinkInfo(existingLink),
        message: '没有需要更新的数据',
      };
    }

    // 更新链接
    const updatedLink = await db.downloadLink.update({
      where: { id },
      data: updatePayload,
      select: {
        ...downloadLinkSelectFields,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: formatDownloadLinkInfo(updatedLink),
      message: '下载链接更新成功',
    };
  }

  /**
   * 删除下载链接（软删除）
   */
  public static async deleteDownloadLink(
    db: any,
    linkId: string,
    userPermission: UserPermission
  ): Promise<DeleteDownloadLinkResponse> {
    // 验证链接权限
    await PermissionHandler.validateLinkPermission(
      db,
      linkId,
      userPermission
    );

    // 软删除链接
    await db.downloadLink.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      success: true,
      message: '下载链接删除成功',
    };
  }

  /**
   * 获取用户创建的下载链接列表
   */
  public static async getUserDownloadLinks(
    db: any,
    userId: string,
    userPermission: UserPermission,
    options: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<GetDownloadLinksResponse> {
    // 验证权限
    PermissionHandler.validateUserIdentity(userId, userPermission);

    const { includeInactive = false, limit = 50, offset = 0 } = options;

    const whereClause: any = {
      userId,
      deletedAt: null,
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const downloadLinks = await db.downloadLink.findMany({
      where: whereClause,
      select: downloadLinkSelectFields,
      orderBy: [
        { createdAt: 'desc' },
        { sortOrder: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    return {
      success: true,
      data: downloadLinks.map(formatDownloadLinkInfo),
    };
  }

  /**
   * 批量更新下载链接状态
   */
  public static async batchUpdateLinkStatus(
    db: any,
    linkIds: string[],
    isActive: boolean,
    userPermission: UserPermission
  ): Promise<{ success: boolean; updatedCount: number; message: string }> {
    // 验证批量操作权限
    PermissionHandler.validateBatchOperationPermission(linkIds.length);

    // 验证所有链接的权限
    const links = await db.downloadLink.findMany({
      where: {
        id: { in: linkIds },
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    // 检查每个链接的权限
    for (const link of links) {
      if (!userPermission.isAdmin && link.userId !== userPermission.userId) {
        throw TRPCErrorHandler.forbidden(`无权限管理链接 ${link.id}`);
      }
    }

    // 批量更新状态
    const result = await db.downloadLink.updateMany({
      where: {
        id: { in: linkIds },
        deletedAt: null,
      },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      updatedCount: result.count,
      message: `成功更新 ${result.count} 个下载链接的状态`,
    };
  }

  /**
   * 获取下载链接统计信息
   */
  public static async getLinkStatistics(
    db: any,
    userId?: string,
    userPermission?: UserPermission
  ): Promise<{
    totalLinks: number;
    activeLinks: number;
    inactiveLinks: number;
    totalDownloads: number;
    totalEarnings: number;
  }> {
    const whereClause: any = {
      deletedAt: null,
    };

    // 如果指定了用户ID，添加用户过滤
    if (userId) {
      if (userPermission) {
        PermissionHandler.validateUserIdentity(userId, userPermission);
      }
      whereClause.userId = userId;
    }

    const [totalLinks, activeLinks, downloadStats] = await Promise.all([
      db.downloadLink.count({
        where: whereClause,
      }),
      db.downloadLink.count({
        where: {
          ...whereClause,
          isActive: true,
        },
      }),
      db.downloadLink.aggregate({
        where: whereClause,
        _sum: {
          downloadCount: true,
        },
      }),
    ]);

    // 计算总收入（需要从兑换记录中统计）
    const earningsResult = await db.downloadPurchase.aggregate({
      where: {
        downloadLink: {
          ...whereClause,
        },
      },
      _sum: {
        cansSpent: true,
      },
    });

    return {
      totalLinks,
      activeLinks,
      inactiveLinks: totalLinks - activeLinks,
      totalDownloads: downloadStats._sum.downloadCount || 0,
      totalEarnings: earningsResult._sum.cansSpent || 0,
    };
  }
}

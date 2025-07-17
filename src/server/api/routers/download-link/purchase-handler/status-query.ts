/**
 * @fileoverview 兑换状态查询模块
 * @description 处理兑换状态查询相关的业务逻辑
 */

import { PermissionHandler } from '../permission-handler';
import { DatabaseOperations } from './database-operations';
import {
  buildPurchaseStatusResponse,
  buildBatchPurchaseStatusResponse,
  createPurchaseMap
} from '../utils';
import type {
  StatusQueryParams,
  BatchStatusQueryParams,
  GetPurchaseStatusResponse,
  GetBatchPurchaseStatusResponse
} from './types';

/**
 * 状态查询处理器
 */
export class StatusQuery {
  /**
   * 获取单个链接的兑换状态
   */
  public static async getPurchaseStatus(
    params: StatusQueryParams
  ): Promise<GetPurchaseStatusResponse> {
    const { db, linkId, userPermission } = params;

    // 验证下载链接访问权限
    const downloadLink = await PermissionHandler.validateLinkAccess(db, linkId);

    // 检查兑换记录
    const purchase = await DatabaseOperations.checkExistingPurchase(
      db,
      userPermission.userId,
      downloadLink.id
    );

    if (purchase) {
      // 更新访问记录
      await DatabaseOperations.updateAccessRecord(db, purchase.id);
    }

    const response = buildPurchaseStatusResponse(downloadLink, purchase || undefined);

    return {
      success: true,
      data: response,
    };
  }

  /**
   * 批量获取兑换状态
   */
  public static async getBatchPurchaseStatus(
    params: BatchStatusQueryParams
  ): Promise<GetBatchPurchaseStatusResponse> {
    const { db, linkIds, userPermission } = params;

    // 验证批量下载链接访问权限
    const downloadLinks = await PermissionHandler.validateBatchLinkAccess(db, linkIds);

    if (downloadLinks.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // 获取用户的兑换记录
    const purchases = await DatabaseOperations.getBatchPurchaseRecords(
      db,
      userPermission.userId,
      linkIds
    );

    // 创建兑换记录映射
    const purchaseMap = createPurchaseMap(purchases);

    // 构建结果
    const results = buildBatchPurchaseStatusResponse(downloadLinks, purchaseMap);

    return {
      success: true,
      data: results,
    };
  }

  /**
   * 获取用户兑换历史
   */
  public static async getUserPurchaseHistory(
    db: any,
    userId: string,
    userPermission: any,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      downloadLink: {
        id: string;
        title: string;
        platform: string;
      };
      cansSpent: number;
      accessCount: number;
      createdAt: Date;
      lastAccessAt: Date | null;
    }>;
  }> {
    // 验证权限
    PermissionHandler.validateUserIdentity(userId, userPermission);

    const purchases = await DatabaseOperations.getUserPurchaseHistory(
      db,
      userId,
      options
    );

    return {
      success: true,
      data: purchases,
    };
  }

  /**
   * 获取下载链接的兑换统计
   */
  public static async getDownloadLinkPurchaseStats(
    db: any,
    linkId: string,
    userPermission: any
  ): Promise<{
    success: boolean;
    data: {
      totalPurchases: number;
      totalRevenue: number;
      uniquePurchasers: number;
      recentPurchases: Array<{
        userId: string;
        cansSpent: number;
        createdAt: Date;
      }>;
    };
  }> {
    // 验证下载链接权限
    const downloadLink = await PermissionHandler.validateLinkPermission(db, linkId, userPermission);

    // 获取统计信息
    const stats = await DatabaseOperations.getDownloadLinkStats(db, downloadLink.id);

    // 获取最近的兑换记录
    const recentPurchases = await db.downloadPurchase.findMany({
      where: { downloadLinkId: downloadLink.id },
      select: {
        userId: true,
        cansSpent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      data: {
        ...stats,
        recentPurchases,
      },
    };
  }

  /**
   * 检查用户是否已兑换指定链接
   */
  public static async checkUserPurchaseStatus(
    db: any,
    userId: string,
    linkId: string
  ): Promise<{
    hasPurchased: boolean;
    purchaseDate?: Date;
    accessCount?: number;
  }> {
    const purchase = await DatabaseOperations.checkExistingPurchase(
      db,
      userId,
      linkId
    );

    if (purchase) {
      return {
        hasPurchased: true,
        purchaseDate: purchase.createdAt,
        accessCount: purchase.accessCount,
      };
    }

    return {
      hasPurchased: false,
    };
  }

  /**
   * 获取用户的兑换统计摘要
   */
  public static async getUserPurchaseSummary(
    db: any,
    userId: string,
    userPermission: any
  ): Promise<{
    success: boolean;
    data: {
      totalPurchases: number;
      totalSpent: number;
      freePurchases: number;
      paidPurchases: number;
      mostRecentPurchase?: Date;
    };
  }> {
    // 验证权限
    PermissionHandler.validateUserIdentity(userId, userPermission);

    const summary = await db.downloadPurchase.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { cansSpent: true },
      _max: { createdAt: true },
    });

    const freePurchases = await db.downloadPurchase.count({
      where: { 
        userId,
        cansSpent: 0,
      },
    });

    const paidPurchases = summary._count.id - freePurchases;

    return {
      success: true,
      data: {
        totalPurchases: summary._count.id || 0,
        totalSpent: summary._sum.cansSpent || 0,
        freePurchases,
        paidPurchases,
        mostRecentPurchase: summary._max.createdAt || undefined,
      },
    };
  }
}

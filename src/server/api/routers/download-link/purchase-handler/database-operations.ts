/**
 * @fileoverview 兑换相关数据库操作
 * @description 处理兑换相关的数据库查询和更新操作
 */

import type {
  PurchaseRecord,
  CansAccountInfo,
  DatabaseQueryOptions
} from './types';

/**
 * 数据库操作类
 */
export class DatabaseOperations {
  /**
   * 检查现有兑换记录
   */
  public static async checkExistingPurchase(
    db: any,
    userId: string,
    downloadLinkId: string
  ): Promise<PurchaseRecord | null> {
    return await db.downloadPurchase.findUnique({
      where: {
        userId_downloadLinkId: {
          userId,
          downloadLinkId,
        },
      },
      select: {
        id: true,
        userId: true,
        downloadLinkId: true,
        cansSpent: true,
        accessCount: true,
        lastAccessAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * 获取批量兑换记录
   */
  public static async getBatchPurchaseRecords(
    db: any,
    userId: string,
    linkIds: string[]
  ): Promise<Array<{
    downloadLinkId: string;
    createdAt: Date;
    accessCount: number;
  }>> {
    return await db.downloadPurchase.findMany({
      where: {
        userId,
        downloadLinkId: { in: linkIds },
      },
      select: {
        downloadLinkId: true,
        createdAt: true,
        accessCount: true,
      },
    });
  }

  /**
   * 获取用户罐头账户
   */
  public static async getUserCansAccount(
    db: any,
    userId: string
  ): Promise<CansAccountInfo | null> {
    return await db.userCansAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        availableCans: true,
        totalCans: true,
      },
    });
  }

  /**
   * 更新下载次数
   */
  public static async incrementDownloadCount(
    db: any,
    downloadLinkId: string
  ): Promise<void> {
    await db.downloadLink.update({
      where: { id: downloadLinkId },
      data: { downloadCount: { increment: 1 } },
    });
  }

  /**
   * 更新访问记录
   */
  public static async updateAccessRecord(
    db: any,
    purchaseId: string
  ): Promise<void> {
    await db.downloadPurchase.update({
      where: { id: purchaseId },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
      },
    });
  }

  /**
   * 创建免费兑换记录
   */
  public static async createFreePurchaseRecord(
    db: any,
    userId: string,
    downloadLinkId: string
  ): Promise<PurchaseRecord> {
    return await db.downloadPurchase.create({
      data: {
        userId,
        downloadLinkId,
        cansSpent: 0,
      },
    });
  }

  /**
   * 获取用户兑换历史
   */
  public static async getUserPurchaseHistory(
    db: any,
    userId: string,
    options: DatabaseQueryOptions = {}
  ): Promise<Array<{
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
  }>> {
    const { limit = 50, offset = 0 } = options;

    return await db.downloadPurchase.findMany({
      where: { userId },
      include: {
        downloadLink: {
          select: {
            id: true,
            title: true,
            platform: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * 批量检查兑换记录是否存在
   */
  public static async checkBatchPurchaseExists(
    db: any,
    userId: string,
    linkIds: string[]
  ): Promise<Map<string, boolean>> {
    const purchases = await db.downloadPurchase.findMany({
      where: {
        userId,
        downloadLinkId: { in: linkIds },
      },
      select: {
        downloadLinkId: true,
      },
    });

    const existsMap = new Map<string, boolean>();
    linkIds.forEach(linkId => existsMap.set(linkId, false));
    purchases.forEach((purchase: { downloadLinkId: string }) => existsMap.set(purchase.downloadLinkId, true));

    return existsMap;
  }

  /**
   * 获取下载链接统计信息
   */
  public static async getDownloadLinkStats(
    db: any,
    downloadLinkId: string
  ): Promise<{
    totalPurchases: number;
    totalRevenue: number;
    uniquePurchasers: number;
  }> {
    const stats = await db.downloadPurchase.aggregate({
      where: { downloadLinkId },
      _count: { id: true },
      _sum: { cansSpent: true },
    });

    const uniquePurchasers = await db.downloadPurchase.groupBy({
      by: ['userId'],
      where: { downloadLinkId },
    });

    return {
      totalPurchases: stats._count.id || 0,
      totalRevenue: stats._sum.cansSpent || 0,
      uniquePurchasers: uniquePurchasers.length,
    };
  }
}

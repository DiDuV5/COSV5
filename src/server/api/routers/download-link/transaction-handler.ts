/**
 * @fileoverview 下载链接交易处理器
 * @description 处理下载链接兑换相关的罐头交易逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { 
  PurchaseRecord,
  CansAccountInfo,
  TransactionRecord 
} from './types';
import { generateTransactionDescription } from './utils';

/**
 * 交易处理器
 */
export class TransactionHandler {
  /**
   * 处理兑换交易
   */
  public static async processPurchaseTransaction(
    tx: any,
    params: {
      buyerId: string;
      sellerId: string;
      downloadLinkId: string;
      amount: number;
      title: string;
    }
  ): Promise<PurchaseRecord> {
    const { buyerId, sellerId, downloadLinkId, amount, title } = params;

    // 1. 扣除兑换者罐头（只减少可用罐头，不减少总罐头）
    await this.deductBuyerCans(tx, buyerId, amount);

    // 2. 增加创建者罐头
    await this.addSellerCans(tx, sellerId, amount);

    // 3. 创建兑换记录
    const purchase = await this.createPurchaseRecord(tx, {
      buyerId,
      downloadLinkId,
      amount,
    });

    // 4. 记录罐头交易 - 兑换者
    await this.recordBuyerTransaction(tx, buyerId, purchase.id, amount, title);

    // 5. 记录罐头交易 - 创建者
    await this.recordSellerTransaction(tx, sellerId, purchase.id, amount, title);

    return purchase;
  }

  /**
   * 扣除兑换者罐头
   */
  private static async deductBuyerCans(
    tx: any,
    buyerId: string,
    amount: number
  ): Promise<void> {
    await tx.userCansAccount.update({
      where: { userId: buyerId },
      data: {
        availableCans: { decrement: amount },
      },
    });
  }

  /**
   * 增加创建者罐头
   */
  private static async addSellerCans(
    tx: any,
    sellerId: string,
    amount: number
  ): Promise<void> {
    await tx.userCansAccount.upsert({
      where: { userId: sellerId },
      update: {
        availableCans: { increment: amount },
        totalCans: { increment: amount },
      },
      create: {
        userId: sellerId,
        availableCans: amount,
        totalCans: amount,
      },
    });
  }

  /**
   * 创建兑换记录
   */
  private static async createPurchaseRecord(
    tx: any,
    params: {
      buyerId: string;
      downloadLinkId: string;
      amount: number;
    }
  ): Promise<PurchaseRecord> {
    return await tx.downloadPurchase.create({
      data: {
        userId: params.buyerId,
        downloadLinkId: params.downloadLinkId,
        cansSpent: params.amount,
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
   * 记录兑换者交易
   */
  private static async recordBuyerTransaction(
    tx: any,
    buyerId: string,
    purchaseId: string,
    amount: number,
    title: string
  ): Promise<void> {
    // 获取兑换者账户信息
    const buyerAccount = await tx.userCansAccount.findUnique({
      where: { userId: buyerId },
      select: { id: true },
    });

    if (buyerAccount) {
      await tx.cansTransaction.create({
        data: {
          userId: buyerId,
          accountId: buyerAccount.id,
          transactionType: 'SPEND',
          amount: -amount,
          sourceType: 'DOWNLOAD_PURCHASE',
          sourceId: purchaseId,
          description: generateTransactionDescription('purchase', title),
        },
      });
    }
  }

  /**
   * 记录创建者交易
   */
  private static async recordSellerTransaction(
    tx: any,
    sellerId: string,
    purchaseId: string,
    amount: number,
    title: string
  ): Promise<void> {
    // 获取创建者账户信息
    const sellerAccount = await tx.userCansAccount.findUnique({
      where: { userId: sellerId },
      select: { id: true },
    });

    if (sellerAccount) {
      await tx.cansTransaction.create({
        data: {
          userId: sellerId,
          accountId: sellerAccount.id,
          transactionType: 'EARN',
          amount: amount,
          sourceType: 'DOWNLOAD_SALE',
          sourceId: purchaseId,
          description: generateTransactionDescription('sale', title),
        },
      });
    }
  }

  /**
   * 获取用户罐头账户信息
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
   * 创建或更新用户罐头账户
   */
  public static async upsertUserCansAccount(
    db: any,
    userId: string,
    initialCans: number = 0
  ): Promise<CansAccountInfo> {
    return await db.userCansAccount.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        availableCans: initialCans,
        totalCans: initialCans,
      },
      select: {
        id: true,
        userId: true,
        availableCans: true,
        totalCans: true,
      },
    });
  }

  /**
   * 获取用户交易历史
   */
  public static async getUserTransactionHistory(
    db: any,
    userId: string,
    options: {
      transactionType?: 'SPEND' | 'EARN';
      sourceType?: 'DOWNLOAD_PURCHASE' | 'DOWNLOAD_SALE';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Array<{
    id: string;
    transactionType: string;
    amount: number;
    sourceType: string;
    description: string;
    createdAt: Date;
  }>> {
    const { transactionType, sourceType, limit = 50, offset = 0 } = options;

    const whereClause: any = { userId };

    if (transactionType) {
      whereClause.transactionType = transactionType;
    }

    if (sourceType) {
      whereClause.sourceType = sourceType;
    }

    return await db.cansTransaction.findMany({
      where: whereClause,
      select: {
        id: true,
        transactionType: true,
        amount: true,
        sourceType: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * 获取交易统计信息
   */
  public static async getTransactionStatistics(
    db: any,
    userId: string
  ): Promise<{
    totalSpent: number;
    totalEarned: number;
    downloadPurchases: number;
    downloadSales: number;
  }> {
    const [spentResult, earnedResult, purchaseCount, saleCount] = await Promise.all([
      db.cansTransaction.aggregate({
        where: {
          userId,
          transactionType: 'SPEND',
          sourceType: 'DOWNLOAD_PURCHASE',
        },
        _sum: { amount: true },
      }),
      db.cansTransaction.aggregate({
        where: {
          userId,
          transactionType: 'EARN',
          sourceType: 'DOWNLOAD_SALE',
        },
        _sum: { amount: true },
      }),
      db.cansTransaction.count({
        where: {
          userId,
          transactionType: 'SPEND',
          sourceType: 'DOWNLOAD_PURCHASE',
        },
      }),
      db.cansTransaction.count({
        where: {
          userId,
          transactionType: 'EARN',
          sourceType: 'DOWNLOAD_SALE',
        },
      }),
    ]);

    return {
      totalSpent: Math.abs(spentResult._sum.amount || 0),
      totalEarned: earnedResult._sum.amount || 0,
      downloadPurchases: purchaseCount,
      downloadSales: saleCount,
    };
  }

  /**
   * 验证交易完整性
   */
  public static async validateTransactionIntegrity(
    db: any,
    purchaseId: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 获取兑换记录
    const purchase = await db.downloadPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        downloadLink: {
          select: {
            userId: true,
            cansPrice: true,
          },
        },
      },
    });

    if (!purchase) {
      issues.push('兑换记录不存在');
      return { isValid: false, issues };
    }

    // 检查兑换者交易记录
    const buyerTransaction = await db.cansTransaction.findFirst({
      where: {
        userId: purchase.userId,
        sourceType: 'DOWNLOAD_PURCHASE',
        sourceId: purchaseId,
        transactionType: 'SPEND',
      },
    });

    if (!buyerTransaction) {
      issues.push('兑换者交易记录缺失');
    } else if (Math.abs(buyerTransaction.amount) !== purchase.cansSpent) {
      issues.push('兑换者交易金额不匹配');
    }

    // 检查创建者交易记录
    const sellerTransaction = await db.cansTransaction.findFirst({
      where: {
        userId: purchase.downloadLink.userId,
        sourceType: 'DOWNLOAD_SALE',
        sourceId: purchaseId,
        transactionType: 'EARN',
      },
    });

    if (!sellerTransaction) {
      issues.push('创建者交易记录缺失');
    } else if (sellerTransaction.amount !== purchase.cansSpent) {
      issues.push('创建者交易金额不匹配');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

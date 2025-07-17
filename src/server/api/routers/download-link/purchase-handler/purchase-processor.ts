/**
 * @fileoverview 兑换处理核心逻辑
 * @description 处理下载链接兑换的核心业务逻辑
 */

import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { PermissionHandler } from '../permission-handler';
import { TransactionHandler } from '../transaction-handler';
import { AccessLogger } from '../access-logger';
import { DatabaseOperations } from './database-operations';
import {
  checkCansBalance,
  decryptSensitiveData,
  isFreeDownload
} from '../utils';
import type {
  DownloadLinkDetail,
  UserPermission,
  PurchaseDownloadLinkResponse,
  DownloadProcessParams
} from './types';

/**
 * 兑换处理器
 */
export class PurchaseProcessor {
  /**
   * 处理管理员/创建者直接访问
   */
  public static async processOwnerAccess(
    db: any,
    downloadLink: DownloadLinkDetail,
    userPermission: UserPermission
  ): Promise<PurchaseDownloadLinkResponse> {
    // 检查是否已有兑换记录
    let existingPurchase = await DatabaseOperations.checkExistingPurchase(
      db,
      userPermission.userId,
      downloadLink.id
    );

    // 如果没有兑换记录，为管理员/创建者创建一个免费记录
    if (!existingPurchase) {
      existingPurchase = await DatabaseOperations.createFreePurchaseRecord(
        db,
        userPermission.userId,
        downloadLink.id
      );
    }

    const decryptedData = decryptSensitiveData({
      url: downloadLink.url,
      extractCode: downloadLink.extractCode,
    });

    // 确保 existingPurchase 不为空
    if (!existingPurchase) {
      throw TRPCErrorHandler.internalError('兑换记录创建失败');
    }

    return {
      success: true,
      data: {
        purchaseId: existingPurchase.id,
        url: decryptedData.url,
        extractCode: decryptedData.extractCode,
        platform: downloadLink.platform,
        title: downloadLink.title,
        cansPrice: downloadLink.cansPrice,
        purchaseDate: existingPurchase.createdAt,
        isOwnerAccess: true,
      },
      message: userPermission.isAdmin ? '管理员直接访问' : '创建者直接访问',
    };
  }

  /**
   * 处理已兑换用户的重复访问
   */
  public static async processExistingPurchase(
    downloadLink: DownloadLinkDetail,
    existingPurchase: any
  ): Promise<PurchaseDownloadLinkResponse> {
    const decryptedData = decryptSensitiveData({
      url: downloadLink.url,
      extractCode: downloadLink.extractCode,
    });

    return {
      success: true,
      data: {
        purchaseId: existingPurchase.id,
        url: decryptedData.url,
        extractCode: decryptedData.extractCode,
        platform: downloadLink.platform,
        title: downloadLink.title,
        cansPrice: downloadLink.cansPrice,
        purchaseDate: existingPurchase.createdAt,
        alreadyPurchased: true,
      },
      message: '您已兑换过此下载链接',
    };
  }

  /**
   * 处理免费下载
   */
  public static async processFreeDownload(
    params: DownloadProcessParams
  ): Promise<PurchaseDownloadLinkResponse> {
    const { db, downloadLink, userId, ipAddress, userAgent } = params;

    const purchase = await DatabaseOperations.createFreePurchaseRecord(
      db,
      userId,
      downloadLink.id
    );

    // 更新下载次数
    await DatabaseOperations.incrementDownloadCount(db, downloadLink.id);

    // 记录兑换成功日志
    await AccessLogger.logPurchaseSuccess(db, {
      userId,
      downloadLinkId: downloadLink.id,
      postId: downloadLink.postId,
      purchaseId: purchase.id,
      cansSpent: 0,
      ipAddress,
      userAgent,
    });

    const decryptedData = decryptSensitiveData({
      url: downloadLink.url,
      extractCode: downloadLink.extractCode,
    });

    return {
      success: true,
      data: {
        purchaseId: purchase.id,
        url: decryptedData.url,
        extractCode: decryptedData.extractCode,
        platform: downloadLink.platform,
        title: downloadLink.title,
        cansPrice: 0,
        purchaseDate: purchase.createdAt,
      },
      message: '获取成功',
    };
  }

  /**
   * 处理付费下载
   */
  public static async processPaidDownload(
    params: DownloadProcessParams
  ): Promise<PurchaseDownloadLinkResponse> {
    const { db, downloadLink, userId, ipAddress, userAgent } = params;

    // 检查用户罐头余额
    const userCansAccount = await DatabaseOperations.getUserCansAccount(db, userId);
    const balanceCheck = checkCansBalance(userCansAccount, downloadLink.cansPrice);

    if (!balanceCheck.sufficient) {
      throw TRPCErrorHandler.validationError();
    }

    // 使用事务处理兑换流程
    const purchase = await db.$transaction(async (tx: any) => {
      // 处理交易
      const purchaseRecord = await TransactionHandler.processPurchaseTransaction(
        tx,
        {
          buyerId: userId,
          sellerId: downloadLink.userId,
          downloadLinkId: downloadLink.id,
          amount: downloadLink.cansPrice,
          title: downloadLink.title,
        }
      );

      // 更新下载次数
      await DatabaseOperations.incrementDownloadCount(tx, downloadLink.id);

      return purchaseRecord;
    });

    // 记录兑换成功日志
    await AccessLogger.logPurchaseSuccess(db, {
      userId,
      downloadLinkId: downloadLink.id,
      postId: downloadLink.postId,
      purchaseId: purchase.id,
      cansSpent: downloadLink.cansPrice,
      ipAddress,
      userAgent,
    });

    const decryptedData = decryptSensitiveData({
      url: downloadLink.url,
      extractCode: downloadLink.extractCode,
    });

    return {
      success: true,
      data: {
        purchaseId: purchase.id,
        url: decryptedData.url,
        extractCode: decryptedData.extractCode,
        platform: downloadLink.platform,
        title: downloadLink.title,
        cansPrice: downloadLink.cansPrice,
        purchaseDate: purchase.createdAt,
      },
      message: '兑换成功',
    };
  }

  /**
   * 验证兑换权限和条件
   */
  public static validatePurchaseConditions(
    downloadLink: DownloadLinkDetail,
    userPermission: UserPermission
  ): void {
    // 验证兑换权限（普通用户不能兑换自己的链接）
    PermissionHandler.validatePurchasePermission(downloadLink, userPermission);

    // 可以添加其他验证逻辑，如链接是否激活等
    if (!downloadLink.isActive) {
      throw TRPCErrorHandler.validationError("下载链接已被禁用");
    }
  }

  /**
   * 检查是否为创建者或管理员
   */
  public static isOwnerOrAdmin(
    downloadLink: DownloadLinkDetail,
    userPermission: UserPermission
  ): boolean {
    return downloadLink.userId === userPermission.userId || userPermission.isAdmin;
  }

  /**
   * 确定下载类型（免费/付费）
   */
  public static getDownloadType(downloadLink: DownloadLinkDetail): 'free' | 'paid' {
    return isFreeDownload(downloadLink.cansPrice) ? 'free' : 'paid';
  }
}

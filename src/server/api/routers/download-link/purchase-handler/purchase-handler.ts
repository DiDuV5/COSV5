/**
 * @fileoverview 下载链接兑换处理器 - 重构版本
 * @description 处理下载链接的兑换和访问逻辑，采用模块化架构
 */

import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { PermissionHandler } from '../permission-handler';
import { AccessLogger } from '../access-logger';
import { PurchaseProcessor } from './purchase-processor';
import { StatusQuery } from './status-query';
import { DatabaseOperations } from './database-operations';
import type {
  PurchaseParams,
  StatusQueryParams,
  BatchStatusQueryParams,
  UserHistoryParams,
  PurchaseDownloadLinkResponse,
  GetPurchaseStatusResponse,
  GetBatchPurchaseStatusResponse
} from './types';

/**
 * 兑换处理器 - 重构版本
 */
export class PurchaseHandler {
  /**
   * 兑换下载链接
   */
  public static async purchaseDownloadLink(
    params: PurchaseParams
  ): Promise<PurchaseDownloadLinkResponse> {
    const { db, linkId, userPermission, requestContext } = params;
    const ipAddress = requestContext?.ipAddress || 'unknown';
    const userAgent = requestContext?.userAgent || 'unknown';
    let downloadLink: any = null;

    try {
      // 验证下载链接访问权限
      downloadLink = await PermissionHandler.validateLinkAccess(db, linkId);

      // 检查是否为链接创建者或管理员
      if (PurchaseProcessor.isOwnerOrAdmin(downloadLink, userPermission)) {
        return await PurchaseProcessor.processOwnerAccess(db, downloadLink, userPermission);
      }

      // 验证兑换权限和条件
      PurchaseProcessor.validatePurchaseConditions(downloadLink, userPermission);

      // 检查是否已经兑换过
      const existingPurchase = await DatabaseOperations.checkExistingPurchase(
        db,
        userPermission.userId,
        downloadLink.id
      );

      if (existingPurchase) {
        return await PurchaseProcessor.processExistingPurchase(downloadLink, existingPurchase);
      }

      // 根据下载类型处理兑换
      const downloadType = PurchaseProcessor.getDownloadType(downloadLink);
      const processParams = {
        db,
        downloadLink,
        userId: userPermission.userId,
        ipAddress,
        userAgent,
      };

      if (downloadType === 'free') {
        return await PurchaseProcessor.processFreeDownload(processParams);
      } else {
        return await PurchaseProcessor.processPaidDownload(processParams);
      }

    } catch (error) {
      // 记录兑换失败日志
      await AccessLogger.logPurchaseFailure(db, {
        userId: userPermission.userId,
        downloadLinkId: linkId,
        postId: downloadLink?.postId,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        ipAddress,
        userAgent,
        details: {
          userLevel: userPermission.userLevel,
          isAdmin: userPermission.isAdmin,
        },
      });

      // 重新抛出错误
      throw error;
    }
  }

  /**
   * 获取兑换状态和下载信息
   */
  public static async getPurchaseStatus(
    params: StatusQueryParams
  ): Promise<GetPurchaseStatusResponse> {
    return await StatusQuery.getPurchaseStatus(params);
  }

  /**
   * 批量获取兑换状态
   */
  public static async getBatchPurchaseStatus(
    params: BatchStatusQueryParams
  ): Promise<GetBatchPurchaseStatusResponse> {
    return await StatusQuery.getBatchPurchaseStatus(params);
  }

  /**
   * 获取用户兑换历史
   */
  public static async getUserPurchaseHistory(
    params: UserHistoryParams
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
    const { db, userId, userPermission, options = {} } = params;
    return await StatusQuery.getUserPurchaseHistory(db, userId, userPermission, options);
  }

  /**
   * 获取下载链接兑换统计
   */
  public static async getDownloadLinkPurchaseStats(
    db: any,
    linkId: string,
    userPermission: any
  ) {
    return await StatusQuery.getDownloadLinkPurchaseStats(db, linkId, userPermission);
  }

  /**
   * 获取用户兑换统计摘要
   */
  public static async getUserPurchaseSummary(
    db: any,
    userId: string,
    userPermission: any
  ) {
    return await StatusQuery.getUserPurchaseSummary(db, userId, userPermission);
  }

  /**
   * 检查用户兑换状态
   */
  public static async checkUserPurchaseStatus(
    db: any,
    userId: string,
    linkId: string
  ) {
    return await StatusQuery.checkUserPurchaseStatus(db, userId, linkId);
  }

  // 保持向后兼容的静态方法
  /**
   * @deprecated 使用新的参数对象格式
   */
  public static async purchaseDownloadLinkLegacy(
    db: any,
    linkId: string,
    userPermission: any,
    requestContext?: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<PurchaseDownloadLinkResponse> {
    return await this.purchaseDownloadLink({
      db,
      linkId,
      userPermission,
      requestContext,
    });
  }

  /**
   * @deprecated 使用新的参数对象格式
   */
  public static async getPurchaseStatusLegacy(
    db: any,
    linkId: string,
    userPermission: any
  ): Promise<GetPurchaseStatusResponse> {
    return await this.getPurchaseStatus({
      db,
      linkId,
      userPermission,
    });
  }

  /**
   * @deprecated 使用新的参数对象格式
   */
  public static async getBatchPurchaseStatusLegacy(
    db: any,
    linkIds: string[],
    userPermission: any
  ): Promise<GetBatchPurchaseStatusResponse> {
    return await this.getBatchPurchaseStatus({
      db,
      linkIds,
      userPermission,
    });
  }
}

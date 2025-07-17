/**
 * @fileoverview 下载链接访问日志记录器
 * @description 记录下载链接的访问、兑换和异常行为
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

/**
 * 访问日志类型
 */
export enum AccessLogType {
  PURCHASE = 'PURCHASE',           // 兑换下载链接
  ACCESS = 'ACCESS',               // 访问下载信息
  DOWNLOAD = 'DOWNLOAD',           // 实际下载
  FAILED_PURCHASE = 'FAILED_PURCHASE', // 兑换失败
  SUSPICIOUS = 'SUSPICIOUS',       // 可疑行为
  RATE_LIMITED = 'RATE_LIMITED'    // 被限流
}

/**
 * 访问日志数据接口
 */
export interface AccessLogData {
  userId?: string;
  downloadLinkId: string;
  postId: string;
  logType: AccessLogType;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * 下载链接访问日志记录器
 */
export class AccessLogger {
  /**
   * 记录兑换成功日志
   */
  public static async logPurchaseSuccess(
    db: any,
    data: {
      userId: string;
      downloadLinkId: string;
      postId: string;
      purchaseId: string;
      cansSpent: number;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<void> {
    try {
      await db.downloadAccessLog.create({
        data: {
          userId: data.userId,
          downloadLinkId: data.downloadLinkId,
          postId: data.postId,
          logType: AccessLogType.PURCHASE,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          details: {
            purchaseId: data.purchaseId,
            cansSpent: data.cansSpent,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('记录兑换成功日志失败:', error);
    }
  }

  /**
   * 记录访问下载信息日志
   */
  public static async logDownloadAccess(
    db: any,
    data: {
      userId: string;
      downloadLinkId: string;
      postId: string;
      purchaseId: string;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<void> {
    try {
      await db.downloadAccessLog.create({
        data: {
          userId: data.userId,
          downloadLinkId: data.downloadLinkId,
          postId: data.postId,
          logType: AccessLogType.ACCESS,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          details: {
            purchaseId: data.purchaseId,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('记录访问日志失败:', error);
    }
  }

  /**
   * 记录兑换失败日志
   */
  public static async logPurchaseFailure(
    db: any,
    data: {
      userId?: string;
      downloadLinkId: string;
      postId: string;
      errorMessage: string;
      ipAddress: string;
      userAgent: string;
      details?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await db.downloadAccessLog.create({
        data: {
          userId: data.userId,
          downloadLinkId: data.downloadLinkId,
          postId: data.postId,
          logType: AccessLogType.FAILED_PURCHASE,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          errorMessage: data.errorMessage,
          details: {
            ...data.details,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('记录兑换失败日志失败:', error);
    }
  }

  /**
   * 记录可疑行为日志
   */
  public static async logSuspiciousActivity(
    db: any,
    data: {
      userId?: string;
      downloadLinkId?: string;
      postId?: string;
      suspiciousReason: string;
      ipAddress: string;
      userAgent: string;
      details?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await db.downloadAccessLog.create({
        data: {
          userId: data.userId,
          downloadLinkId: data.downloadLinkId,
          postId: data.postId,
          logType: AccessLogType.SUSPICIOUS,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          errorMessage: data.suspiciousReason,
          details: {
            ...data.details,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('记录可疑行为日志失败:', error);
    }
  }

  /**
   * 记录限流日志
   */
  public static async logRateLimit(
    db: any,
    data: {
      userId?: string;
      ipAddress: string;
      userAgent: string;
      endpoint: string;
      details?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await db.downloadAccessLog.create({
        data: {
          userId: data.userId,
          logType: AccessLogType.RATE_LIMITED,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          errorMessage: `访问频率过高: ${data.endpoint}`,
          details: {
            endpoint: data.endpoint,
            ...data.details,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('记录限流日志失败:', error);
    }
  }

  /**
   * 获取用户访问统计
   */
  public static async getUserAccessStats(
    db: any,
    userId: string,
    timeRange: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<{
    totalAccess: number;
    purchaseCount: number;
    failedPurchaseCount: number;
    suspiciousCount: number;
    recentIPs: string[];
  }> {
    try {
      const logs = await db.downloadAccessLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: {
          logType: true,
          ipAddress: true,
        },
      });

      const stats = {
        totalAccess: logs.length,
        purchaseCount: logs.filter((log: { logType: AccessLogType }) => log.logType === AccessLogType.PURCHASE).length,
        failedPurchaseCount: logs.filter((log: { logType: AccessLogType }) => log.logType === AccessLogType.FAILED_PURCHASE).length,
        suspiciousCount: logs.filter((log: { logType: AccessLogType }) => log.logType === AccessLogType.SUSPICIOUS).length,
        recentIPs: [...new Set(logs.map((log: { ipAddress: string }) => log.ipAddress))].slice(0, 10) as string[],
      };

      return stats;
    } catch (error) {
      console.error('获取用户访问统计失败:', error);
      return {
        totalAccess: 0,
        purchaseCount: 0,
        failedPurchaseCount: 0,
        suspiciousCount: 0,
        recentIPs: [],
      };
    }
  }

  /**
   * 获取下载链接访问统计
   */
  public static async getLinkAccessStats(
    db: any,
    downloadLinkId: string,
    timeRange: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<{
    totalAccess: number;
    uniqueUsers: number;
    purchaseCount: number;
    failedPurchaseCount: number;
    topIPs: Array<{ ip: string; count: number }>;
  }> {
    try {
      const logs = await db.downloadAccessLog.findMany({
        where: {
          downloadLinkId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: {
          logType: true,
          userId: true,
          ipAddress: true,
        },
      });

      // 统计IP访问次数
      const ipCounts = logs.reduce((acc: Record<string, number>, log: { ipAddress: string }) => {
        acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topIPs = Object.entries(ipCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count: count as number }));

      const stats = {
        totalAccess: logs.length,
        uniqueUsers: new Set(logs.filter((log: { userId?: string }) => log.userId).map((log: { userId: string }) => log.userId)).size,
        purchaseCount: logs.filter((log: { logType: AccessLogType }) => log.logType === AccessLogType.PURCHASE).length,
        failedPurchaseCount: logs.filter((log: { logType: AccessLogType }) => log.logType === AccessLogType.FAILED_PURCHASE).length,
        topIPs,
      };

      return stats;
    } catch (error) {
      console.error('获取下载链接访问统计失败:', error);
      return {
        totalAccess: 0,
        uniqueUsers: 0,
        purchaseCount: 0,
        failedPurchaseCount: 0,
        topIPs: [],
      };
    }
  }
}

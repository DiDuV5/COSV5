/**
 * @fileoverview 一次性访问令牌管理器
 * @description 为下载链接生成和验证一次性访问令牌，增强安全性
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import crypto from 'crypto';
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

/**
 * 访问令牌数据接口
 */
export interface AccessTokenData {
  id: string;
  userId: string;
  downloadLinkId: string;
  purchaseId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
  isUsed: boolean;
  downloadLink: {
    id: string;
    url: string;
    extractCode?: string;
    platform: string;
    title: string;
    postId: string;
  };
  user: {
    id: string;
    username: string;
  };
}

/**
 * 令牌生成选项
 */
export interface TokenGenerateOptions {
  userId: string;
  downloadLinkId: string;
  purchaseId: string;
  ipAddress: string;
  userAgent: string;
  expirationHours?: number; // 默认24小时
}

/**
 * 一次性访问令牌管理器
 */
export class AccessTokenManager {
  private static readonly DEFAULT_EXPIRATION_HOURS = 24;
  private static readonly TOKEN_LENGTH = 32;

  /**
   * 生成一次性访问令牌
   */
  public static async generateAccessToken(
    db: any,
    options: TokenGenerateOptions
  ): Promise<{
    token: string;
    expiresAt: Date;
    downloadUrl: string;
  }> {
    const {
      userId,
      downloadLinkId,
      purchaseId,
      ipAddress,
      userAgent,
      expirationHours = this.DEFAULT_EXPIRATION_HOURS
    } = options;

    // 生成安全的随机令牌
    const token = this.generateSecureToken();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    try {
      // 先清理该用户对该下载链接的过期令牌
      await this.cleanupExpiredTokens(db, userId, downloadLinkId);

      // 创建新的访问令牌记录
      await db.downloadAccessToken.create({
        data: {
          userId,
          downloadLinkId,
          purchaseId,
          token,
          expiresAt,
          ipAddress,
          userAgent,
          isUsed: false,
        },
      });

      // 生成下载URL
      const downloadUrl = this.generateDownloadUrl(token);

      return {
        token,
        expiresAt,
        downloadUrl,
      };
    } catch (error) {
      console.error('生成访问令牌失败:', error);
      throw TRPCErrorHandler.internalError('生成访问令牌失败');
    }
  }

  /**
   * 验证并使用访问令牌
   */
  public static async validateAndUseToken(
    db: any,
    token: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    isValid: boolean;
    tokenData?: AccessTokenData;
    errorMessage?: string;
  }> {
    try {
      // 查找令牌记录
      const tokenRecord = await db.downloadAccessToken.findUnique({
        where: { token },
        include: {
          downloadLink: {
            select: {
              id: true,
              url: true,
              extractCode: true,
              platform: true,
              title: true,
              postId: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!tokenRecord) {
        return {
          isValid: false,
          errorMessage: '访问令牌不存在或已失效',
        };
      }

      // 检查令牌是否已过期
      if (new Date() > tokenRecord.expiresAt) {
        return {
          isValid: false,
          errorMessage: '访问令牌已过期',
        };
      }

      // 检查令牌是否已使用
      if (tokenRecord.isUsed) {
        return {
          isValid: false,
          errorMessage: '访问令牌已使用，每个令牌只能使用一次',
        };
      }

      // 可选：检查IP地址是否匹配（增强安全性）
      const enableIPCheck = process.env.COSEREEDEN_ENABLE_TOKEN_IP_CHECK === 'true';
      if (enableIPCheck && tokenRecord.ipAddress !== ipAddress) {
        // 记录可疑活动但不阻止访问（考虑到用户可能切换网络）
        console.warn(`令牌IP不匹配: 原IP=${tokenRecord.ipAddress}, 当前IP=${ipAddress}`);
      }

      // 标记令牌为已使用
      await db.downloadAccessToken.update({
        where: { token },
        data: {
          isUsed: true,
          usedAt: new Date(),
          lastAccessIP: ipAddress,
          lastAccessUserAgent: userAgent,
        },
      });

      return {
        isValid: true,
        tokenData: tokenRecord as AccessTokenData,
      };
    } catch (error) {
      console.error('验证访问令牌失败:', error);
      return {
        isValid: false,
        errorMessage: '令牌验证失败',
      };
    }
  }

  /**
   * 清理过期的访问令牌
   */
  public static async cleanupExpiredTokens(
    db: any,
    userId?: string,
    downloadLinkId?: string
  ): Promise<number> {
    try {
      const whereCondition: any = {
        expiresAt: {
          lt: new Date(),
        },
      };

      if (userId) {
        whereCondition.userId = userId;
      }

      if (downloadLinkId) {
        whereCondition.downloadLinkId = downloadLinkId;
      }

      const result = await db.downloadAccessToken.deleteMany({
        where: whereCondition,
      });

      return result.count;
    } catch (error) {
      console.error('清理过期令牌失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户的活跃令牌数量
   */
  public static async getUserActiveTokenCount(
    db: any,
    userId: string
  ): Promise<number> {
    try {
      return await db.downloadAccessToken.count({
        where: {
          userId,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('获取用户活跃令牌数量失败:', error);
      return 0;
    }
  }

  /**
   * 撤销用户的所有未使用令牌
   */
  public static async revokeUserTokens(
    db: any,
    userId: string,
    downloadLinkId?: string
  ): Promise<number> {
    try {
      const whereCondition: any = {
        userId,
        isUsed: false,
      };

      if (downloadLinkId) {
        whereCondition.downloadLinkId = downloadLinkId;
      }

      const result = await db.downloadAccessToken.updateMany({
        where: whereCondition,
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      console.error('撤销用户令牌失败:', error);
      return 0;
    }
  }

  /**
   * 生成安全的随机令牌
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * 生成下载URL
   */
  private static generateDownloadUrl(token: string): string {
    const baseUrl = process.env.COSEREEDEN_NEXTAUTH_URL || 'http://localhost:3000';
    return `${baseUrl}/api/download/secure/${token}`;
  }

  /**
   * 获取令牌统计信息
   */
  public static async getTokenStats(
    db: any,
    timeRange: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<{
    totalGenerated: number;
    totalUsed: number;
    totalExpired: number;
    usageRate: number;
  }> {
    try {
      const [totalGenerated, totalUsed, totalExpired] = await Promise.all([
        db.downloadAccessToken.count({
          where: {
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          },
        }),
        db.downloadAccessToken.count({
          where: {
            isUsed: true,
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          },
        }),
        db.downloadAccessToken.count({
          where: {
            expiresAt: {
              lt: new Date(),
            },
            isUsed: false,
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          },
        }),
      ]);

      const usageRate = totalGenerated > 0 ? (totalUsed / totalGenerated) * 100 : 0;

      return {
        totalGenerated,
        totalUsed,
        totalExpired,
        usageRate: Math.round(usageRate * 100) / 100,
      };
    } catch (error) {
      console.error('获取令牌统计失败:', error);
      return {
        totalGenerated: 0,
        totalUsed: 0,
        totalExpired: 0,
        usageRate: 0,
      };
    }
  }
}

/**
 * @fileoverview 下载链接安全中间件
 * @description 专门针对下载链接的安全防护，包括防爬虫、限流、异常检测
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { AccessLogger, AccessLogType } from './access-logger';

/**
 * 用户行为模式分析
 */
interface UserBehaviorPattern {
  userId: string;
  recentRequests: Date[];
  suspiciousScore: number;
  lastWarningTime?: Date;
}

/**
 * 安全检查结果
 */
interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  suspiciousScore: number;
  shouldLog: boolean;
}

/**
 * 下载链接安全中间件
 */
export class DownloadSecurityMiddleware {
  private static userBehaviorMap = new Map<string, UserBehaviorPattern>();
  
  // 配置参数
  private static readonly MAX_REQUESTS_PER_MINUTE = 10;
  private static readonly MAX_REQUESTS_PER_HOUR = 50;
  private static readonly SUSPICIOUS_SCORE_THRESHOLD = 80;
  private static readonly BEHAVIOR_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时

  /**
   * 检查用户访问安全性
   */
  public static async checkUserSecurity(
    db: any,
    userId: string,
    ipAddress: string,
    userAgent: string,
    action: 'purchase' | 'access' | 'download'
  ): Promise<SecurityCheckResult> {
    const now = new Date();
    
    // 获取或创建用户行为模式
    let userPattern = this.userBehaviorMap.get(userId);
    if (!userPattern) {
      userPattern = {
        userId,
        recentRequests: [],
        suspiciousScore: 0,
      };
      this.userBehaviorMap.set(userId, userPattern);
    }

    // 清理过期的请求记录
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    userPattern.recentRequests = userPattern.recentRequests.filter(
      time => time > oneHourAgo
    );

    // 添加当前请求
    userPattern.recentRequests.push(now);

    // 计算可疑分数
    const suspiciousScore = await this.calculateSuspiciousScore(
      db,
      userPattern,
      ipAddress,
      userAgent,
      action
    );

    userPattern.suspiciousScore = suspiciousScore;

    // 检查是否超过阈值
    if (suspiciousScore >= this.SUSPICIOUS_SCORE_THRESHOLD) {
      // 记录可疑活动
      await AccessLogger.logSuspiciousActivity(db, {
        userId,
        suspiciousReason: `可疑分数过高: ${suspiciousScore}`,
        ipAddress,
        userAgent,
        details: {
          action,
          recentRequestCount: userPattern.recentRequests.length,
          suspiciousFactors: await this.getSuspiciousFactors(userPattern, ipAddress, userAgent),
        },
      });

      return {
        allowed: false,
        reason: '检测到异常行为，请稍后再试',
        suspiciousScore,
        shouldLog: true,
      };
    }

    // 检查频率限制
    const rateLimitCheck = this.checkRateLimit(userPattern);
    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        reason: rateLimitCheck.reason,
        suspiciousScore,
        shouldLog: true,
      };
    }

    return {
      allowed: true,
      suspiciousScore,
      shouldLog: suspiciousScore > 50, // 中等可疑分数也记录日志
    };
  }

  /**
   * 计算可疑分数
   */
  private static async calculateSuspiciousScore(
    db: any,
    userPattern: UserBehaviorPattern,
    ipAddress: string,
    userAgent: string,
    action: string
  ): Promise<number> {
    let score = 0;

    // 1. 请求频率检查 (0-30分)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMinuteRequests = userPattern.recentRequests.filter(
      time => time > oneMinuteAgo
    ).length;

    if (recentMinuteRequests > this.MAX_REQUESTS_PER_MINUTE) {
      score += 30;
    } else if (recentMinuteRequests > this.MAX_REQUESTS_PER_MINUTE * 0.7) {
      score += 15;
    }

    // 2. User-Agent检查 (0-20分)
    const suspiciousUserAgents = [
      'bot', 'crawler', 'spider', 'scraper', 'wget', 'curl',
      'python', 'requests', 'urllib', 'scrapy'
    ];
    
    const lowerUserAgent = userAgent.toLowerCase();
    if (suspiciousUserAgents.some(pattern => lowerUserAgent.includes(pattern))) {
      score += 20;
    }

    // 3. 行为模式检查 (0-25分)
    if (userPattern.recentRequests.length > this.MAX_REQUESTS_PER_HOUR) {
      score += 25;
    }

    // 4. 历史记录检查 (0-15分)
    try {
      const recentSuspiciousLogs = await db.downloadAccessLog.count({
        where: {
          userId: userPattern.userId,
          logType: AccessLogType.SUSPICIOUS,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
          },
        },
      });

      if (recentSuspiciousLogs > 5) {
        score += 15;
      } else if (recentSuspiciousLogs > 2) {
        score += 8;
      }
    } catch (error) {
      console.error('检查历史记录失败:', error);
    }

    // 5. IP地址检查 (0-10分)
    // 检查是否来自已知的代理/VPN服务
    if (this.isKnownProxyIP(ipAddress)) {
      score += 10;
    }

    return Math.min(score, 100); // 最高100分
  }

  /**
   * 检查频率限制
   */
  private static checkRateLimit(userPattern: UserBehaviorPattern): {
    allowed: boolean;
    reason?: string;
  } {
    const now = new Date();
    
    // 检查每分钟限制
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentMinuteRequests = userPattern.recentRequests.filter(
      time => time > oneMinuteAgo
    ).length;

    if (recentMinuteRequests > this.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        reason: '请求过于频繁，请稍后再试',
      };
    }

    // 检查每小时限制
    if (userPattern.recentRequests.length > this.MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        reason: '您今天的下载次数已达上限，请明天再试',
      };
    }

    return { allowed: true };
  }

  /**
   * 获取可疑因素列表
   */
  private static async getSuspiciousFactors(
    userPattern: UserBehaviorPattern,
    ipAddress: string,
    userAgent: string
  ): Promise<string[]> {
    const factors: string[] = [];

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMinuteRequests = userPattern.recentRequests.filter(
      time => time > oneMinuteAgo
    ).length;

    if (recentMinuteRequests > this.MAX_REQUESTS_PER_MINUTE) {
      factors.push('请求频率过高');
    }

    if (userPattern.recentRequests.length > this.MAX_REQUESTS_PER_HOUR) {
      factors.push('小时请求量超限');
    }

    const suspiciousUserAgents = ['bot', 'crawler', 'spider', 'scraper'];
    if (suspiciousUserAgents.some(pattern => userAgent.toLowerCase().includes(pattern))) {
      factors.push('可疑User-Agent');
    }

    if (this.isKnownProxyIP(ipAddress)) {
      factors.push('代理/VPN IP');
    }

    return factors;
  }

  /**
   * 检查是否为已知代理IP
   */
  private static isKnownProxyIP(ipAddress: string): boolean {
    // 这里可以集成第三方IP检测服务
    // 目前只做简单的本地检查
    const knownProxyRanges = [
      '10.', '172.16.', '192.168.', // 私有IP
      '127.', // 本地回环
    ];

    return knownProxyRanges.some(range => ipAddress.startsWith(range));
  }

  /**
   * 清理过期的用户行为数据
   */
  public static cleanupExpiredBehaviorData(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [userId, pattern] of this.userBehaviorMap.entries()) {
      // 清理过期请求
      pattern.recentRequests = pattern.recentRequests.filter(
        time => time > oneHourAgo
      );

      // 如果没有最近的请求，删除整个记录
      if (pattern.recentRequests.length === 0) {
        this.userBehaviorMap.delete(userId);
      }
    }
  }

  /**
   * 获取用户行为统计
   */
  public static getUserBehaviorStats(userId: string): {
    recentRequestCount: number;
    suspiciousScore: number;
    lastRequestTime?: Date;
  } {
    const pattern = this.userBehaviorMap.get(userId);
    
    if (!pattern) {
      return {
        recentRequestCount: 0,
        suspiciousScore: 0,
      };
    }

    return {
      recentRequestCount: pattern.recentRequests.length,
      suspiciousScore: pattern.suspiciousScore,
      lastRequestTime: pattern.recentRequests[pattern.recentRequests.length - 1],
    };
  }

  /**
   * 重置用户行为数据
   */
  public static resetUserBehavior(userId: string): void {
    this.userBehaviorMap.delete(userId);
  }
}

// 定期清理过期数据
setInterval(() => {
  DownloadSecurityMiddleware.cleanupExpiredBehaviorData();
}, DownloadSecurityMiddleware['BEHAVIOR_CLEANUP_INTERVAL']);

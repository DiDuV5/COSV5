/**
 * @fileoverview 速率限制检查服务
 * @description 检查用户上传请求是否符合速率限制规则
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import type { UserLevelConfig } from './rate-limit-config-service';
import type { AdvancedUploadSession, UserStats } from './rate-limit-session-service';

/**
 * 速率限制检查结果接口
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  estimatedWaitTime?: number;
  batchInfo?: {
    recommendedBatchSize: number;
    estimatedBatches: number;
    estimatedTotalTime: number;
  };
  currentLimits?: {
    concurrentUploads: number;
    maxConcurrentUploads: number;
    minuteUsage: { files: number; size: number; limit: { files: number; size: number } };
    hourUsage: { files: number; size: number; limit: { files: number; size: number } };
  };
}

/**
 * 速率限制检查服务类
 */
export class RateLimitCheckerService {
  /**
   * 检查上传请求是否允许
   */
  checkUploadRequest(
    userId: string,
    userLevel: UserLevel,
    fileCount: number,
    totalSize: number,
    config: UserLevelConfig,
    activeSessions: AdvancedUploadSession[],
    userStats?: UserStats
  ): RateLimitCheckResult {
    const now = Date.now();

    // 1. 检查并发限制
    const userActiveSessions = activeSessions.filter(
      session => session.userId === userId && session.status === 'active'
    );

    if (userActiveSessions.length >= config.maxConcurrentUploads) {
      const estimatedWaitTime = this.estimateWaitTime(userActiveSessions, config);
      
      return {
        allowed: false,
        reason: `超过最大并发上传数限制 (${config.maxConcurrentUploads})`,
        retryAfter: Math.ceil(estimatedWaitTime),
        estimatedWaitTime,
        currentLimits: this.getCurrentLimits(config, userActiveSessions, userStats),
      };
    }

    // 2. 检查速率限制（如果有用户统计）
    if (userStats) {
      const rateLimitResult = this.checkRateLimits(userStats, fileCount, totalSize, config, now);
      if (!rateLimitResult.allowed) {
        return {
          ...rateLimitResult,
          currentLimits: this.getCurrentLimits(config, userActiveSessions, userStats),
        };
      }
    }

    // 3. 计算批处理建议
    const batchInfo = this.calculateBatchInfo(fileCount, totalSize, config);

    return {
      allowed: true,
      batchInfo,
      currentLimits: this.getCurrentLimits(config, userActiveSessions, userStats),
    };
  }

  /**
   * 检查速率限制
   */
  private checkRateLimits(
    stats: UserStats,
    fileCount: number,
    totalSize: number,
    config: UserLevelConfig,
    now: number
  ): Pick<RateLimitCheckResult, 'allowed' | 'reason' | 'retryAfter' | 'estimatedWaitTime'> {
    // 检查每分钟限制
    if (this.isWithinTimeWindow(stats.minuteStats.timestamp, now, 60 * 1000)) {
      if (stats.minuteStats.count + fileCount > config.maxFilesPerMinute) {
        return {
          allowed: false,
          reason: `超过每分钟文件数限制 (${config.maxFilesPerMinute})`,
          retryAfter: 60,
          estimatedWaitTime: 60 - Math.floor((now - stats.minuteStats.timestamp) / 1000),
        };
      }

      if (stats.minuteStats.size + totalSize > config.maxSizePerMinute) {
        return {
          allowed: false,
          reason: `超过每分钟上传大小限制 (${Math.round(config.maxSizePerMinute / 1024 / 1024)}MB)`,
          retryAfter: 60,
          estimatedWaitTime: 60 - Math.floor((now - stats.minuteStats.timestamp) / 1000),
        };
      }
    }

    // 检查每小时限制
    if (this.isWithinTimeWindow(stats.hourStats.timestamp, now, 60 * 60 * 1000)) {
      if (stats.hourStats.count + fileCount > config.maxFilesPerHour) {
        return {
          allowed: false,
          reason: `超过每小时文件数限制 (${config.maxFilesPerHour})`,
          retryAfter: 3600,
          estimatedWaitTime: 3600 - Math.floor((now - stats.hourStats.timestamp) / 1000),
        };
      }

      if (stats.hourStats.size + totalSize > config.maxSizePerHour) {
        return {
          allowed: false,
          reason: `超过每小时上传大小限制 (${Math.round(config.maxSizePerHour / 1024 / 1024)}MB)`,
          retryAfter: 3600,
          estimatedWaitTime: 3600 - Math.floor((now - stats.hourStats.timestamp) / 1000),
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 计算批处理信息
   */
  private calculateBatchInfo(fileCount: number, totalSize: number, config: UserLevelConfig) {
    const recommendedBatchSize = Math.min(config.batchSize, fileCount);
    const estimatedBatches = Math.ceil(fileCount / recommendedBatchSize);
    
    // 考虑文件大小对处理时间的影响
    const avgFileSize = totalSize / fileCount;
    const processingTimePerFile = Math.max(300, avgFileSize / (1024 * 1024) * 100);
    const estimatedTotalTime = estimatedBatches * config.batchInterval + (fileCount * processingTimePerFile);

    return {
      recommendedBatchSize,
      estimatedBatches,
      estimatedTotalTime,
    };
  }

  /**
   * 估算等待时间
   */
  private estimateWaitTime(userSessions: AdvancedUploadSession[], config: UserLevelConfig): number {
    if (userSessions.length === 0) return 0;

    // 估算最早完成的会话时间，考虑用户等级的处理速度
    const processingSpeedMultiplier = config.priorityLevel >= 4 ? 0.8 : 1.0;
    const earliestCompletion = Math.min(
      ...userSessions.map(session => {
        const elapsed = Date.now() - session.startTime;
        const estimated = session.fileCount * 300 * processingSpeedMultiplier;
        return Math.max(0, estimated - elapsed);
      })
    );

    return Math.ceil(earliestCompletion / 1000); // 转换为秒
  }

  /**
   * 获取当前限制状态
   */
  private getCurrentLimits(
    config: UserLevelConfig,
    activeSessions: AdvancedUploadSession[],
    userStats?: UserStats
  ) {
    const minuteUsage = userStats ? {
      files: userStats.minuteStats.count,
      size: userStats.minuteStats.size,
      limit: {
        files: config.maxFilesPerMinute,
        size: config.maxSizePerMinute,
      },
    } : {
      files: 0,
      size: 0,
      limit: {
        files: config.maxFilesPerMinute,
        size: config.maxSizePerMinute,
      },
    };

    const hourUsage = userStats ? {
      files: userStats.hourStats.count,
      size: userStats.hourStats.size,
      limit: {
        files: config.maxFilesPerHour,
        size: config.maxSizePerHour,
      },
    } : {
      files: 0,
      size: 0,
      limit: {
        files: config.maxFilesPerHour,
        size: config.maxSizePerHour,
      },
    };

    return {
      concurrentUploads: activeSessions.length,
      maxConcurrentUploads: config.maxConcurrentUploads,
      minuteUsage,
      hourUsage,
    };
  }

  /**
   * 检查时间窗口
   */
  private isWithinTimeWindow(timestamp: number, now: number, windowMs: number): boolean {
    return now - timestamp < windowMs;
  }

  /**
   * 检查用户是否可以跳过某些限制
   */
  canSkipLimits(userLevel: UserLevel, config: UserLevelConfig): {
    canSkipSecurity: boolean;
    canSkipQueue: boolean;
    hasHighPriority: boolean;
  } {
    return {
      canSkipSecurity: config.skipSecurityOptimizations,
      canSkipQueue: config.priorityLevel >= 5,
      hasHighPriority: config.priorityLevel >= 4,
    };
  }

  /**
   * 计算用户的有效限制（考虑VIP加成）
   */
  calculateEffectiveLimits(
    baseConfig: UserLevelConfig,
    isVIP: boolean,
    vipMultiplier: number = 1.5
  ): UserLevelConfig {
    if (!isVIP) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      maxConcurrentUploads: Math.floor(baseConfig.maxConcurrentUploads * vipMultiplier),
      maxFilesPerMinute: Math.floor(baseConfig.maxFilesPerMinute * vipMultiplier),
      maxSizePerMinute: Math.floor(baseConfig.maxSizePerMinute * vipMultiplier),
      maxFilesPerHour: Math.floor(baseConfig.maxFilesPerHour * vipMultiplier),
      maxSizePerHour: Math.floor(baseConfig.maxSizePerHour * vipMultiplier),
    };
  }

  /**
   * 生成限制报告
   */
  generateLimitReport(
    userId: string,
    userLevel: UserLevel,
    config: UserLevelConfig,
    activeSessions: AdvancedUploadSession[],
    userStats?: UserStats
  ): {
    userId: string;
    userLevel: UserLevel;
    currentUsage: {
      concurrentUploads: number;
      minuteFiles: number;
      minuteSize: string;
      hourFiles: number;
      hourSize: string;
    };
    limits: {
      maxConcurrentUploads: number;
      maxFilesPerMinute: number;
      maxSizePerMinute: string;
      maxFilesPerHour: number;
      maxSizePerHour: string;
    };
    utilization: {
      concurrency: number;
      minuteFiles: number;
      minuteSize: number;
      hourFiles: number;
      hourSize: number;
    };
  } {
    const userActiveSessions = activeSessions.filter(s => s.userId === userId);
    
    const currentUsage = {
      concurrentUploads: userActiveSessions.length,
      minuteFiles: userStats?.minuteStats.count || 0,
      minuteSize: `${((userStats?.minuteStats.size || 0) / 1024 / 1024).toFixed(2)}MB`,
      hourFiles: userStats?.hourStats.count || 0,
      hourSize: `${((userStats?.hourStats.size || 0) / 1024 / 1024).toFixed(2)}MB`,
    };

    const limits = {
      maxConcurrentUploads: config.maxConcurrentUploads,
      maxFilesPerMinute: config.maxFilesPerMinute,
      maxSizePerMinute: `${(config.maxSizePerMinute / 1024 / 1024).toFixed(2)}MB`,
      maxFilesPerHour: config.maxFilesPerHour,
      maxSizePerHour: `${(config.maxSizePerHour / 1024 / 1024).toFixed(2)}MB`,
    };

    const utilization = {
      concurrency: Math.round((currentUsage.concurrentUploads / config.maxConcurrentUploads) * 100),
      minuteFiles: Math.round((currentUsage.minuteFiles / config.maxFilesPerMinute) * 100),
      minuteSize: Math.round(((userStats?.minuteStats.size || 0) / config.maxSizePerMinute) * 100),
      hourFiles: Math.round((currentUsage.hourFiles / config.maxFilesPerHour) * 100),
      hourSize: Math.round(((userStats?.hourStats.size || 0) / config.maxSizePerHour) * 100),
    };

    return {
      userId,
      userLevel,
      currentUsage,
      limits,
      utilization,
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createRateLimitCheckerService = () => new RateLimitCheckerService();

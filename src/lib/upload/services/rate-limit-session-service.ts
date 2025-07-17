/**
 * @fileoverview 速率限制会话管理服务
 * @description 管理上传会话的创建、跟踪和清理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import type { UserLevelConfig } from './rate-limit-config-service';

/**
 * 上传会话信息接口
 */
export interface AdvancedUploadSession {
  userId: string;
  userLevel: UserLevel;
  sessionId: string;
  startTime: number;
  fileCount: number;
  totalSize: number;
  lastActivity: number;
  batchInfo: {
    currentBatch: number;
    totalBatches: number;
    batchSize: number;
  };
  priorityLevel: number;
  isVIP: boolean;
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: {
    uploadedFiles: number;
    uploadedSize: number;
    percentage: number;
  };
}

/**
 * 用户统计信息接口
 */
export interface UserStats {
  minuteStats: { count: number; size: number; timestamp: number };
  hourStats: { count: number; size: number; timestamp: number };
  userLevel: UserLevel;
}

/**
 * 速率限制会话管理服务类
 */
export class RateLimitSessionService {
  private activeSessions = new Map<string, AdvancedUploadSession>();
  private userStats = new Map<string, UserStats>();
  private priorityQueue: AdvancedUploadSession[] = [];
  private cleanupInterval: NodeJS.Timeout;
  private queueProcessInterval: NodeJS.Timeout;

  constructor() {
    // 定期清理过期会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 1000);

    // 定期处理优先级队列
    this.queueProcessInterval = setInterval(() => {
      this.processPriorityQueue();
    }, 1000);
  }

  /**
   * 创建上传会话
   */
  createSession(
    userId: string,
    userLevel: UserLevel,
    fileCount: number,
    totalSize: number,
    config: UserLevelConfig,
    isVIP: boolean
  ): string {
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    // 计算批处理信息
    const batchInfo = this.calculateBatchInfo(fileCount, totalSize, config);

    const session: AdvancedUploadSession = {
      userId,
      userLevel,
      sessionId,
      startTime: now,
      fileCount,
      totalSize,
      lastActivity: now,
      batchInfo: {
        currentBatch: 0,
        totalBatches: batchInfo.estimatedBatches,
        batchSize: batchInfo.recommendedBatchSize,
      },
      priorityLevel: config.priorityLevel,
      isVIP,
      status: 'active',
      progress: {
        uploadedFiles: 0,
        uploadedSize: 0,
        percentage: 0,
      },
    };

    this.activeSessions.set(sessionId, session);

    // 添加到优先级队列
    this.addToPriorityQueue(session);

    console.log(`🚀 创建上传会话: ${sessionId}`, {
      userId,
      userLevel,
      fileCount,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      isVIP,
      priorityLevel: config.priorityLevel,
    });

    return sessionId;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): AdvancedUploadSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 更新会话进度
   */
  updateSessionProgress(
    sessionId: string,
    uploadedFiles: number,
    uploadedSize: number
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.progress.uploadedFiles = uploadedFiles;
      session.progress.uploadedSize = uploadedSize;
      session.progress.percentage = Math.round((uploadedFiles / session.fileCount) * 100);
      session.lastActivity = Date.now();

      // 更新当前批次
      session.batchInfo.currentBatch = Math.ceil(uploadedFiles / session.batchInfo.batchSize);
    }
  }

  /**
   * 更新会话状态
   */
  updateSessionStatus(sessionId: string, status: AdvancedUploadSession['status']): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivity = Date.now();

      if (status === 'completed' || status === 'failed') {
        // 从优先级队列中移除
        this.removeFromPriorityQueue(sessionId);
      }
    }
  }

  /**
   * 结束上传会话
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // 更新用户统计
      this.updateUserStats(session.userId, session.fileCount, session.totalSize, session.userLevel);
      
      // 移除会话
      this.activeSessions.delete(sessionId);
      this.removeFromPriorityQueue(sessionId);

      console.log(`✅ 结束上传会话: ${sessionId}`, {
        userId: session.userId,
        duration: `${((Date.now() - session.startTime) / 1000).toFixed(2)}s`,
        files: session.fileCount,
        size: `${(session.totalSize / 1024 / 1024).toFixed(2)}MB`,
      });
    }
  }

  /**
   * 获取用户活动会话
   */
  getUserActiveSessions(userId: string): AdvancedUploadSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.status === 'active');
  }

  /**
   * 获取用户统计信息
   */
  getUserStats(userId: string): UserStats | undefined {
    return this.userStats.get(userId);
  }

  /**
   * 获取所有活动会话
   */
  getAllActiveSessions(): AdvancedUploadSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 获取优先级队列
   */
  getPriorityQueue(): AdvancedUploadSession[] {
    return [...this.priorityQueue];
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
   * 添加到优先级队列
   */
  private addToPriorityQueue(session: AdvancedUploadSession): void {
    this.priorityQueue.push(session);
    
    // 按优先级排序（高优先级在前）
    this.priorityQueue.sort((a, b) => {
      if (a.priorityLevel !== b.priorityLevel) {
        return b.priorityLevel - a.priorityLevel;
      }
      // 优先级相同时，按开始时间排序
      return a.startTime - b.startTime;
    });
  }

  /**
   * 从优先级队列移除
   */
  private removeFromPriorityQueue(sessionId: string): void {
    const index = this.priorityQueue.findIndex(session => session.sessionId === sessionId);
    if (index !== -1) {
      this.priorityQueue.splice(index, 1);
    }
  }

  /**
   * 处理优先级队列
   */
  private processPriorityQueue(): void {
    // 这里可以实现队列处理逻辑
    // 例如：限制同时处理的会话数量，优先处理高优先级会话等
    const activeCount = this.priorityQueue.filter(s => s.status === 'active').length;
    
    if (activeCount > 0) {
      console.log(`📊 优先级队列状态: ${activeCount} 个活动会话`);
    }
  }

  /**
   * 更新用户统计
   */
  private updateUserStats(userId: string, fileCount: number, totalSize: number, userLevel: UserLevel): void {
    const now = Date.now();
    let stats = this.userStats.get(userId);

    if (!stats) {
      stats = {
        minuteStats: { count: 0, size: 0, timestamp: now },
        hourStats: { count: 0, size: 0, timestamp: now },
        userLevel,
      };
      this.userStats.set(userId, stats);
    }

    // 重置过期的统计
    if (!this.isWithinTimeWindow(stats.minuteStats.timestamp, now, 60 * 1000)) {
      stats.minuteStats = { count: 0, size: 0, timestamp: now };
    }

    if (!this.isWithinTimeWindow(stats.hourStats.timestamp, now, 60 * 60 * 1000)) {
      stats.hourStats = { count: 0, size: 0, timestamp: now };
    }

    // 更新统计
    stats.minuteStats.count += fileCount;
    stats.minuteStats.size += totalSize;
    stats.hourStats.count += fileCount;
    stats.hourStats.size += totalSize;
    stats.userLevel = userLevel;
  }

  /**
   * 检查时间窗口
   */
  private isWithinTimeWindow(timestamp: number, now: number, windowMs: number): boolean {
    return now - timestamp < windowMs;
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionTimeout = 30 * 60 * 1000; // 30分钟超时
      
      if (now - session.lastActivity > sessionTimeout) {
        this.activeSessions.delete(sessionId);
        this.removeFromPriorityQueue(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的上传会话`);
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    queueLength: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      queueLength: this.priorityQueue.length,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createRateLimitSessionService = () => new RateLimitSessionService();

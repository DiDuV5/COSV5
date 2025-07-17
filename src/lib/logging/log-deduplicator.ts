/**
 * @fileoverview 日志去重系统
 * @description 减少重复日志输出，优化日志性能和可读性
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: number;
  count: number;
  lastSeen: number;
  context?: Record<string, any>;
}

/**
 * 日志去重配置
 */
export interface LogDeduplicationConfig {
  /** 去重时间窗口（毫秒） */
  timeWindow: number;
  /** 最大缓存条目数 */
  maxEntries: number;
  /** 是否启用去重 */
  enabled: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 不同日志级别的去重策略 */
  levelStrategies: Record<LogLevel, {
    timeWindow: number;
    maxCount: number;
  }>;
}

/**
 * 日志去重器类
 */
export class LogDeduplicator {
  private logCache = new Map<string, LogEntry>();
  private config: LogDeduplicationConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<LogDeduplicationConfig>) {
    this.config = {
      timeWindow: 30000, // 30秒
      maxEntries: 1000,
      enabled: true, // 在测试中也启用，但使用较短的时间窗口
      cleanupInterval: 60000, // 1分钟
      levelStrategies: {
        [LogLevel.DEBUG]: { timeWindow: process.env.NODE_ENV === 'test' ? 100 : 10000, maxCount: 5 },
        [LogLevel.INFO]: { timeWindow: process.env.NODE_ENV === 'test' ? 100 : 30000, maxCount: 3 },
        [LogLevel.WARN]: { timeWindow: process.env.NODE_ENV === 'test' ? 100 : 60000, maxCount: 2 },
        [LogLevel.ERROR]: { timeWindow: process.env.NODE_ENV === 'test' ? 100 : 300000, maxCount: 1 } // 5分钟
      },
      ...config
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
    }
  }

  /**
   * 检查是否应该记录日志
   */
  shouldLog(message: string, level: LogLevel, context?: Record<string, any>): boolean {
    if (!this.config.enabled) {
      return true;
    }

    const key = this.generateKey(message, level, context);
    const now = Date.now();
    const strategy = this.config.levelStrategies[level];

    const existing = this.logCache.get(key);

    if (!existing) {
      // 首次记录
      this.logCache.set(key, {
        message,
        level,
        timestamp: now,
        count: 1,
        lastSeen: now,
        context
      });
      return true;
    }

    // 检查时间窗口
    if (now - existing.lastSeen > strategy.timeWindow) {
      // 超出时间窗口，重置计数
      existing.count = 1;
      existing.lastSeen = now;
      existing.timestamp = now;
      return true;
    }

    // 在时间窗口内，检查计数
    existing.count++;
    existing.lastSeen = now;

    if (existing.count <= strategy.maxCount) {
      return true;
    }

    // 超出最大计数，但每隔一定时间输出汇总
    if (existing.count % 10 === 0) {
      // 每10次重复输出一次汇总
      this.logSummary(existing);
    }

    return false;
  }

  /**
   * 记录日志（带去重）
   */
  log(message: string, level: LogLevel, context?: Record<string, any>): void {
    if (this.shouldLog(message, level, context)) {
      this.outputLog(message, level, context);
    }
  }

  /**
   * 输出日志汇总
   */
  private logSummary(entry: LogEntry): void {
    const summaryMessage = `📊 日志汇总: "${entry.message}" 在过去 ${
      Math.round((Date.now() - entry.timestamp) / 1000)
    }秒内重复了 ${entry.count} 次`;

    this.outputLog(summaryMessage, LogLevel.INFO, {
      originalLevel: entry.level,
      originalMessage: entry.message,
      count: entry.count,
      timeSpan: Date.now() - entry.timestamp
    });
  }

  /**
   * 实际输出日志
   */
  private outputLog(message: string, level: LogLevel, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[${timestamp}] DEBUG: ${message}${contextStr}`);
        }
        break;
      case LogLevel.INFO:
        console.log(`[${timestamp}] INFO: ${message}${contextStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] WARN: ${message}${contextStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] ERROR: ${message}${contextStr}`);
        break;
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(message: string, level: LogLevel, context?: Record<string, any>): string {
    // 对于连接状态等重复性日志，使用消息模式而不是完整消息
    const messagePattern = this.extractMessagePattern(message);
    const contextKey = context ? JSON.stringify(context) : '';
    return `${level}:${messagePattern}:${contextKey}`;
  }

  /**
   * 提取消息模式
   */
  private extractMessagePattern(message: string): string {
    // 移除时间戳、数字等变化的部分，保留消息模式
    return message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
      .replace(/\d+(\.\d+)?/g, '[NUMBER]')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期的日志条目
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.logCache.entries()) {
      const strategy = this.config.levelStrategies[entry.level];
      if (now - entry.lastSeen > strategy.timeWindow * 2) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.logCache.delete(key));

    // 如果缓存过大，删除最旧的条目
    if (this.logCache.size > this.config.maxEntries) {
      const entries = Array.from(this.logCache.entries())
        .sort(([, a], [, b]) => a.lastSeen - b.lastSeen);

      const toDelete = entries.slice(0, entries.length - this.config.maxEntries);
      toDelete.forEach(([key]) => this.logCache.delete(key));
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      totalEntries: this.logCache.size,
      levelCounts: {} as Record<LogLevel, number>,
      oldestEntry: 0,
      newestEntry: 0
    };

    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.logCache.values()) {
      stats.levelCounts[entry.level] = (stats.levelCounts[entry.level] || 0) + 1;
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.lastSeen);
    }

    stats.oldestEntry = oldest;
    stats.newestEntry = newest;

    return stats;
  }

  /**
   * 停止去重器
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.logCache.clear();
  }

  /**
   * 重置去重器
   */
  reset(): void {
    this.logCache.clear();
  }
}

// 创建全局日志去重器实例
export const logDeduplicator = new LogDeduplicator();

/**
 * 便捷的日志函数
 */
export const logger = {
  debug: (message: string, context?: Record<string, any>) =>
    logDeduplicator.log(message, LogLevel.DEBUG, context),

  info: (message: string, context?: Record<string, any>) =>
    logDeduplicator.log(message, LogLevel.INFO, context),

  warn: (message: string, context?: Record<string, any>) =>
    logDeduplicator.log(message, LogLevel.WARN, context),

  error: (message: string, context?: Record<string, any>) =>
    logDeduplicator.log(message, LogLevel.ERROR, context),

  getStats: () => logDeduplicator.getStats(),
  reset: () => logDeduplicator.reset()
};

/**
 * @fileoverview 指标分析器
 * @description 负责分析和计算性能指标
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { RealTimeMetrics, CacheStats } from '../types';
import { checkRedisHealthSync } from '@/lib/redis';
import { checkDatabaseConnection } from '@/lib/database/connection-check';

/**
 * 指标分析器类
 */
export class MetricsAnalyzer {
  private redisConnectionCache: { status: boolean; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5000; // 5秒缓存

  /**
   * 计算实时性能指标
   */
  calculateRealTimeMetrics(): RealTimeMetrics {
    // 缓存Redis连接状态，避免重复检测
    const redisConnected = this.getCachedRedisStatus();

    return {
      currentQPS: this.getCurrentQPS(),
      recentSlowQueries: this.getRecentSlowQueries(),
      averageResponseTime: this.getAverageResponseTime(),
      activeConnections: this.getActiveConnections(),
      cacheHitRate: this.getCacheHitRate(),
      systemHealth: this.getSystemHealth(),
      redisConnected,
      databaseConnected: this.isDatabaseConnected(),
      cacheStats: this.getCacheStats(redisConnected),
    };
  }

  /**
   * 获取当前QPS
   */
  private getCurrentQPS(): number {
    // 模拟数据：基于时间的波动
    const baseQPS = 50;
    const variation = Math.sin(Date.now() / 60000) * 20; // 基于分钟的波动
    return Math.max(0, baseQPS + variation + Math.random() * 10);
  }

  /**
   * 获取最近慢查询数量
   */
  private getRecentSlowQueries(): number {
    // 模拟数据：随机生成
    return Math.floor(Math.random() * 5);
  }

  /**
   * 获取平均响应时间
   */
  private getAverageResponseTime(): number {
    // 模拟数据：基于负载的响应时间
    const baseTime = 150;
    const loadFactor = Math.random() * 100;
    return baseTime + loadFactor;
  }

  /**
   * 获取活跃连接数
   */
  private getActiveConnections(): number {
    // 模拟数据：连接池使用情况
    return Math.floor(Math.random() * 20) + 5;
  }

  /**
   * 获取缓存命中率
   */
  private getCacheHitRate(): number {
    // 模拟数据：较高的缓存命中率
    return 0.85 + Math.random() * 0.1;
  }

  /**
   * 获取系统健康状态
   */
  private getSystemHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const qps = this.getCurrentQPS();
    const avgTime = this.getAverageResponseTime();

    if (avgTime > 1000 || qps > 200) {
      return 'critical';
    } else if (avgTime > 500 || qps > 150) {
      return 'warning';
    } else if (avgTime > 200 || qps > 100) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  /**
   * 获取缓存的Redis连接状态
   */
  private getCachedRedisStatus(): boolean {
    const now = Date.now();

    // 检查缓存是否有效
    if (this.redisConnectionCache &&
        (now - this.redisConnectionCache.timestamp) < this.CACHE_TTL) {
      return this.redisConnectionCache.status;
    }

    // 缓存过期或不存在，重新检测
    const status = this.isRedisConnected();
    this.redisConnectionCache = {
      status,
      timestamp: now
    };

    return status;
  }

  /**
   * 检查Redis连接状态
   */
  private isRedisConnected(): boolean {
    try {
      // 使用真实的Redis连接检测
      return checkRedisHealthSync();
    } catch (error) {
      console.warn('Redis连接状态检测失败:', error);
      return false;
    }
  }

  /**
   * 检查数据库连接状态
   */
  private isDatabaseConnected(): boolean {
    try {
      // 使用真实的数据库连接检测
      return checkDatabaseConnection();
    } catch (error) {
      console.warn('数据库连接状态检测失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  private getCacheStats(redisConnected: boolean): CacheStats {
    const hits = Math.floor(Math.random() * 1000) + 500;
    const misses = Math.floor(Math.random() * 200) + 50;
    const totalRequests = hits + misses;

    return {
      hits,
      misses,
      hitRate: hits / totalRequests,
      totalRequests,
      isConnected: redisConnected, // 使用传入的状态，避免重复检测
      penetrationPrevented: Math.floor(Math.random() * 10),
      warmupExecuted: Math.floor(Math.random() * 5),
      lastOptimization: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}

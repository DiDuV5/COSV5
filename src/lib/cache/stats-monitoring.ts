/**
 * @fileoverview Redis缓存统计监控
 * @description 缓存统计、监控和性能分析
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { CacheStats } from './types';
import type { CacheConfigManager } from './config';

/**
 * 缓存统计监控类
 */
export class CacheStatsMonitoring {
  private configManager: CacheConfigManager;
  private stats: CacheStats;
  private performanceHistory: Array<{
    timestamp: number;
    hitRate: number;
    responseTime: number;
    errorRate: number;
  }> = [];

  constructor(configManager: CacheConfigManager, stats: CacheStats) {
    this.configManager = configManager;
    this.stats = stats;
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): CacheStats {
    const finalConnected = this.configManager.isRedisAvailable();

    return {
      ...this.stats,
      isConnected: finalConnected,
      redisStatus: this.getRedisStatus(),
      internalConnected: this.configManager.isRedisConnected(),
      redisConnected: finalConnected
    };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    this.stats.deletes = 0;
    this.stats.errors = 0;
    this.stats.hitRate = 0;
    this.stats.totalRequests = 0;
    this.stats.avgResponseTime = 0;
    this.stats.errorRate = 0;
    this.stats.penetrationPrevented = 0;
    this.stats.warmupExecuted = 0;
    this.stats.dynamicTTLAdjustments = 0;
    this.stats.lastOptimization = null;
    
    logger.info('缓存统计信息已重置');
  }

  /**
   * 更新命中率
   */
  public updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * 更新统计信息
   */
  public updateStats(): void {
    this.stats.totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = this.stats.totalRequests > 0
      ? Math.round((this.stats.hits / this.stats.totalRequests) * 100)
      : 0;
    this.stats.errorRate = this.stats.totalRequests > 0
      ? Math.round((this.stats.errors / this.stats.totalRequests) * 100)
      : 0;
  }

  /**
   * 记录性能数据
   */
  public recordPerformance(responseTime: number): void {
    const now = Date.now();
    
    // 更新平均响应时间
    if (this.stats.totalRequests > 0) {
      this.stats.avgResponseTime = (
        (this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime) /
        this.stats.totalRequests
      );
    } else {
      this.stats.avgResponseTime = responseTime;
    }

    // 记录历史数据（保留最近100条）
    this.performanceHistory.push({
      timestamp: now,
      hitRate: this.stats.hitRate,
      responseTime,
      errorRate: this.stats.errorRate
    });

    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 获取性能历史数据
   */
  public getPerformanceHistory(): Array<{
    timestamp: number;
    hitRate: number;
    responseTime: number;
    errorRate: number;
  }> {
    return [...this.performanceHistory];
  }

  /**
   * 获取Redis状态
   */
  private getRedisStatus(): string {
    const redis = this.configManager.getRedis();
    if (!redis) {
      return 'disconnected';
    }
    return redis.status;
  }

  /**
   * 获取详细的缓存信息
   */
  public async getDetailedInfo(): Promise<{
    stats: CacheStats;
    redisInfo?: any;
    memoryUsage?: number;
    keyCount?: number;
  }> {
    const result: any = {
      stats: this.getStats()
    };

    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        
        // 获取Redis信息
        const info = await redis.info();
        result.redisInfo = this.parseRedisInfo(info);
        
        // 获取内存使用情况
        const memoryInfo = await redis.info('memory');
        result.memoryUsage = this.parseMemoryUsage(memoryInfo);
        
        // 获取键数量
        result.keyCount = await redis.dbsize();
      }
    } catch (error) {
      logger.error('获取详细缓存信息失败', { error });
    }

    return result;
  }

  /**
   * 解析Redis信息
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * 解析内存使用情况
   */
  private parseMemoryUsage(memoryInfo: string): number {
    const match = memoryInfo.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 获取缓存健康状态
   */
  public getCacheHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查连接状态
    if (!this.configManager.isRedisAvailable()) {
      issues.push('Redis连接不可用');
      recommendations.push('检查Redis服务状态和网络连接');
      status = 'critical';
    }

    // 检查命中率
    if (this.stats.hitRate < 50) {
      issues.push(`缓存命中率过低: ${this.stats.hitRate.toFixed(1)}%`);
      recommendations.push('检查缓存策略和TTL设置');
      if (status !== 'critical') status = 'warning';
    }

    // 检查错误率
    if (this.stats.errorRate > 5) {
      issues.push(`错误率过高: ${this.stats.errorRate.toFixed(1)}%`);
      recommendations.push('检查Redis连接稳定性和错误日志');
      if (status !== 'critical') status = 'warning';
    }

    // 检查响应时间
    if (this.stats.avgResponseTime > 100) {
      issues.push(`平均响应时间过长: ${this.stats.avgResponseTime.toFixed(1)}ms`);
      recommendations.push('检查Redis性能和网络延迟');
      if (status !== 'critical') status = 'warning';
    }

    return { status, issues, recommendations };
  }

  /**
   * 生成性能报告
   */
  public generatePerformanceReport(): {
    summary: {
      totalRequests: number;
      hitRate: number;
      avgResponseTime: number;
      errorRate: number;
    };
    trends: {
      hitRateTrend: 'improving' | 'stable' | 'declining';
      responseTimeTrend: 'improving' | 'stable' | 'declining';
    };
    recommendations: string[];
  } {
    const summary = {
      totalRequests: this.stats.totalRequests,
      hitRate: this.stats.hitRate,
      avgResponseTime: this.stats.avgResponseTime,
      errorRate: this.stats.errorRate
    };

    const trends = this.analyzeTrends();
    const recommendations = this.generateRecommendations();

    return { summary, trends, recommendations };
  }

  /**
   * 分析性能趋势
   */
  private analyzeTrends(): {
    hitRateTrend: 'improving' | 'stable' | 'declining';
    responseTimeTrend: 'improving' | 'stable' | 'declining';
  } {
    if (this.performanceHistory.length < 10) {
      return {
        hitRateTrend: 'stable',
        responseTimeTrend: 'stable'
      };
    }

    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);

    const recentAvgHitRate = recent.reduce((sum, item) => sum + item.hitRate, 0) / recent.length;
    const olderAvgHitRate = older.reduce((sum, item) => sum + item.hitRate, 0) / older.length;

    const recentAvgResponseTime = recent.reduce((sum, item) => sum + item.responseTime, 0) / recent.length;
    const olderAvgResponseTime = older.reduce((sum, item) => sum + item.responseTime, 0) / older.length;

    const hitRateDiff = recentAvgHitRate - olderAvgHitRate;
    const responseTimeDiff = recentAvgResponseTime - olderAvgResponseTime;

    return {
      hitRateTrend: hitRateDiff > 2 ? 'improving' : hitRateDiff < -2 ? 'declining' : 'stable',
      responseTimeTrend: responseTimeDiff < -5 ? 'improving' : responseTimeDiff > 5 ? 'declining' : 'stable'
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const config = this.configManager.getConfig();

    if (this.stats.hitRate < config.hitRateThreshold) {
      recommendations.push('考虑增加缓存TTL或优化缓存策略');
    }

    if (this.stats.avgResponseTime > 50) {
      recommendations.push('检查Redis性能和网络连接');
    }

    if (this.stats.errorRate > 1) {
      recommendations.push('检查Redis连接稳定性');
    }

    if (this.stats.penetrationPrevented > this.stats.hits * 0.1) {
      recommendations.push('考虑优化缓存穿透防护策略');
    }

    return recommendations;
  }

  /**
   * 导出统计数据
   */
  public exportStats(): string {
    const data = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      performanceHistory: this.performanceHistory,
      health: this.getCacheHealth(),
      report: this.generatePerformanceReport()
    };

    return JSON.stringify(data, null, 2);
  }
}

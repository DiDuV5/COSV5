/**
 * @fileoverview 健康检查服务
 * @description 负责系统健康检查和状态监控
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabasePerformanceMonitor } from '../../database-performance-monitor';
import { MetricsAnalyzer } from '../analyzers/MetricsAnalyzer';
import { RealTimeMetrics } from '../types';

/**
 * 健康检查结果接口
 */
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    performance: boolean;
    memory: boolean;
  };
  metrics: RealTimeMetrics;
  issues: string[];
  timestamp: Date;
}

/**
 * 健康检查服务类
 */
export class HealthCheckService {
  private monitor: DatabasePerformanceMonitor;
  private metricsAnalyzer: MetricsAnalyzer;

  constructor() {
    this.monitor = DatabasePerformanceMonitor.getInstance();
    this.metricsAnalyzer = new MetricsAnalyzer();
  }

  /**
   * 执行完整的健康检查
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const metrics = this.metricsAnalyzer.calculateRealTimeMetrics();
    const checks = await this.runHealthChecks(metrics);
    const issues = this.identifyIssues(metrics, checks);
    const status = this.determineOverallStatus(checks, issues);

    return {
      status,
      checks,
      metrics,
      issues,
      timestamp: new Date(),
    };
  }

  /**
   * 运行各项健康检查
   */
  private async runHealthChecks(metrics: RealTimeMetrics): Promise<{
    database: boolean;
    redis: boolean;
    performance: boolean;
    memory: boolean;
  }> {
    return {
      database: await this.checkDatabaseHealth(metrics),
      redis: await this.checkRedisHealth(metrics),
      performance: this.checkPerformanceHealth(metrics),
      memory: this.checkMemoryHealth(),
    };
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(metrics: RealTimeMetrics): Promise<boolean> {
    try {
      // 检查数据库连接
      if (!metrics.databaseConnected) {
        return false;
      }

      // 检查查询性能
      if (metrics.averageResponseTime > 2000) {
        return false;
      }

      // 检查慢查询数量
      if (metrics.recentSlowQueries > 10) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return false;
    }
  }

  /**
   * 检查Redis健康状态
   */
  private async checkRedisHealth(metrics: RealTimeMetrics): Promise<boolean> {
    try {
      // 检查Redis连接
      if (!metrics.redisConnected) {
        return false;
      }

      // 检查缓存命中率
      if (metrics.cacheHitRate < 0.5) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Redis健康检查失败:', error);
      return false;
    }
  }

  /**
   * 检查性能健康状态
   */
  private checkPerformanceHealth(metrics: RealTimeMetrics): boolean {
    // 检查QPS是否过高
    if (metrics.currentQPS > 300) {
      return false;
    }

    // 检查响应时间
    if (metrics.averageResponseTime > 1000) {
      return false;
    }

    // 检查系统健康状态
    if (metrics.systemHealth === 'critical') {
      return false;
    }

    return true;
  }

  /**
   * 检查内存健康状态
   */
  private checkMemoryHealth(): boolean {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

      // 检查堆内存使用率
      const heapUsageRatio = heapUsedMB / heapTotalMB;
      if (heapUsageRatio > 0.9) {
        return false;
      }

      // 检查总内存使用量
      if (heapUsedMB > 1024) { // 1GB
        return false;
      }

      return true;
    } catch (error) {
      console.error('内存健康检查失败:', error);
      return false;
    }
  }

  /**
   * 识别系统问题
   */
  private identifyIssues(metrics: RealTimeMetrics, checks: any): string[] {
    const issues: string[] = [];

    if (!checks.database) {
      issues.push('数据库连接或性能异常');
    }

    if (!checks.redis) {
      issues.push('Redis连接异常或缓存命中率过低');
    }

    if (!checks.performance) {
      issues.push('系统性能指标异常');
    }

    if (!checks.memory) {
      issues.push('内存使用率过高');
    }

    if (metrics.currentQPS > 200) {
      issues.push(`查询频率过高: ${metrics.currentQPS.toFixed(2)}/秒`);
    }

    if (metrics.averageResponseTime > 500) {
      issues.push(`平均响应时间过长: ${metrics.averageResponseTime.toFixed(2)}ms`);
    }

    return issues;
  }

  /**
   * 确定总体健康状态
   */
  private determineOverallStatus(checks: any, issues: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    if (healthyChecks === totalChecks && issues.length === 0) {
      return 'healthy';
    } else if (healthyChecks >= totalChecks * 0.75) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }
}

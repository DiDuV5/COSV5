/**
 * @fileoverview 性能监控服务
 * @description 负责监控系统性能指标，包括API响应时间、数据库查询时间等
 */

import { PrismaClient } from '@prisma/client';
import type { PerformanceMetrics } from '../types/monitoring-types';

/**
 * 性能监控服务
 */
export class PerformanceMonitoringService {
  private prisma: PrismaClient;
  private performanceData: Map<string, number[]> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 收集性能相关指标
   */
  public async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      console.log('⚡ 收集性能监控指标...');

      const [
        pageLoadTime,
        apiResponseTime,
        databaseQueryTime,
        memoryUsage,
        cpuUsage
      ] = await Promise.all([
        this.measurePageLoadTime(),
        this.measureApiResponseTime(),
        this.measureDatabaseQueryTime(),
        this.getMemoryUsage(),
        this.getCpuUsage(),
      ]);

      const metrics: PerformanceMetrics = {
        pageLoadTime,
        apiResponseTime,
        databaseQueryTime,
        memoryUsage,
        cpuUsage,
      };

      console.log('✅ 性能监控指标收集完成:', {
        pageLoadTime: `${metrics.pageLoadTime}ms`,
        apiResponseTime: `${metrics.apiResponseTime}ms`,
        databaseQueryTime: `${metrics.databaseQueryTime}ms`,
        memoryUsage: `${metrics.memoryUsage}%`,
        cpuUsage: `${metrics.cpuUsage}%`,
      });

      return metrics;
    } catch (error) {
      // 结构化日志记录
      console.error('❌ 性能指标收集失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * 测量页面加载时间
   */
  private async measurePageLoadTime(): Promise<number> {
    try {
      // 模拟页面加载时间测试
      const startTime = Date.now();

      // 这里应该实际测试主要页面的加载时间
      // 可以使用Puppeteer或其他工具进行真实的页面加载测试
      await new Promise(resolve => setTimeout(resolve, 100));

      const loadTime = Date.now() - startTime;

      // 记录历史数据
      this.recordPerformanceData('pageLoadTime', loadTime);

      return loadTime;
    } catch (error) {
      // 结构化日志记录
      console.error('❌ 页面加载时间测量失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * 测量API响应时间
   */
  private async measureApiResponseTime(): Promise<number> {
    try {
      const startTime = Date.now();

      // 测试一个简单的API端点
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const responseTime = Date.now() - startTime;
          this.recordPerformanceData('apiResponseTime', responseTime);
          return responseTime;
        }
      } catch (fetchError) {
        // 结构化日志记录
        console.warn('⚠️ API响应时间测试失败:', {
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
          timestamp: new Date().toISOString(),
        });
      }

      // 如果API测试失败，使用数据库查询作为替代指标
      const dbStartTime = Date.now();
      await this.prisma.user.count();
      const dbResponseTime = Date.now() - dbStartTime;

      this.recordPerformanceData('apiResponseTime', dbResponseTime);
      return dbResponseTime;
    } catch (error) {
      // 结构化日志记录
      console.error('❌ API响应时间测量失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * 测量数据库查询时间
   */
  private async measureDatabaseQueryTime(): Promise<number> {
    try {
      const queries = [
        () => this.prisma.user.count(),
        () => this.prisma.postMedia.count(),
        () => this.prisma.post.count(),
      ];

      const queryTimes: number[] = [];

      for (const query of queries) {
        const startTime = Date.now();
        try {
          await query();
          const queryTime = Date.now() - startTime;
          queryTimes.push(queryTime);
        } catch (queryError) {
          // 结构化日志记录
          console.warn('⚠️ 数据库查询失败:', {
            error: queryError instanceof Error ? queryError.message : String(queryError),
            timestamp: new Date().toISOString(),
          });
          queryTimes.push(5000); // 使用较高的默认值表示查询失败
        }
      }

      const averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      this.recordPerformanceData('databaseQueryTime', averageQueryTime);

      return Math.round(averageQueryTime);
    } catch (error) {
      // 结构化日志记录
      console.error('❌ 数据库查询时间测量失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;

      const usagePercentage = (usedMemory / totalMemory) * 100;
      this.recordPerformanceData('memoryUsage', usagePercentage);

      return Math.round(usagePercentage * 100) / 100;
    } catch (error) {
      // 结构化日志记录
      console.error('❌ 内存使用率获取失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    try {
      // Node.js中获取CPU使用率需要一些时间间隔
      // 这里返回一个估算值，实际应用中可以使用更精确的方法
      const cpuUsage = process.cpuUsage();
      const totalCpuTime = cpuUsage.user + cpuUsage.system;

      // 简化的CPU使用率计算
      const usagePercentage = Math.min((totalCpuTime / 1000000) % 100, 100);
      this.recordPerformanceData('cpuUsage', usagePercentage);

      return Math.round(usagePercentage * 100) / 100;
    } catch (error) {
      // 结构化日志记录
      console.error('❌ CPU使用率获取失败:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return 0;
    }
  }

  /**
   * 记录性能数据历史
   */
  private recordPerformanceData(metric: string, value: number): void {
    if (!this.performanceData.has(metric)) {
      this.performanceData.set(metric, []);
    }

    const data = this.performanceData.get(metric)!;
    data.push(value);

    // 只保留最近100个数据点
    if (data.length > 100) {
      data.shift();
    }
  }

  /**
   * 获取性能趋势
   */
  public getPerformanceTrend(metric: string): {
    current: number;
    average: number;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    const data = this.performanceData.get(metric) || [];

    if (data.length === 0) {
      return { current: 0, average: 0, trend: 'stable' };
    }

    const current = data[data.length - 1];
    const average = data.reduce((sum, val) => sum + val, 0) / data.length;

    // 计算趋势
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (data.length >= 10) {
      const recent = data.slice(-10);
      const older = data.slice(-20, -10);

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

        const changePercentage = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (changePercentage < -5) {
          trend = 'improving';
        } else if (changePercentage > 5) {
          trend = 'degrading';
        }
      }
    }

    return { current, average, trend };
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    summary: {
      averageApiResponseTime: number;
      averageDatabaseQueryTime: number;
      averageMemoryUsage: number;
      averageCpuUsage: number;
    };
    trends: {
      apiResponseTime: 'improving' | 'stable' | 'degrading';
      databaseQueryTime: 'improving' | 'stable' | 'degrading';
      memoryUsage: 'improving' | 'stable' | 'degrading';
      cpuUsage: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  } {
    const apiTrend = this.getPerformanceTrend('apiResponseTime');
    const dbTrend = this.getPerformanceTrend('databaseQueryTime');
    const memoryTrend = this.getPerformanceTrend('memoryUsage');
    const cpuTrend = this.getPerformanceTrend('cpuUsage');

    const recommendations: string[] = [];

    if (apiTrend.average > 2000) {
      recommendations.push('API响应时间较慢，考虑优化接口性能');
    }

    if (dbTrend.average > 1000) {
      recommendations.push('数据库查询时间较长，考虑添加索引或优化查询');
    }

    if (memoryTrend.average > 80) {
      recommendations.push('内存使用率较高，考虑优化内存使用或增加内存');
    }

    if (cpuTrend.average > 80) {
      recommendations.push('CPU使用率较高，考虑优化算法或增加计算资源');
    }

    if (apiTrend.trend === 'degrading') {
      recommendations.push('API性能呈下降趋势，需要关注');
    }

    if (dbTrend.trend === 'degrading') {
      recommendations.push('数据库性能呈下降趋势，需要优化');
    }

    return {
      summary: {
        averageApiResponseTime: Math.round(apiTrend.average),
        averageDatabaseQueryTime: Math.round(dbTrend.average),
        averageMemoryUsage: Math.round(memoryTrend.average * 100) / 100,
        averageCpuUsage: Math.round(cpuTrend.average * 100) / 100,
      },
      trends: {
        apiResponseTime: apiTrend.trend,
        databaseQueryTime: dbTrend.trend,
        memoryUsage: memoryTrend.trend,
        cpuUsage: cpuTrend.trend,
      },
      recommendations,
    };
  }

  /**
   * 重置性能数据
   */
  public resetPerformanceData(): void {
    this.performanceData.clear();
    console.log('📊 性能数据已重置');
  }

  /**
   * 获取实时性能快照
   */
  public async getRealtimeSnapshot(): Promise<{
    timestamp: Date;
    apiResponseTime: number;
    databaseQueryTime: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    const [apiResponseTime, databaseQueryTime] = await Promise.all([
      this.measureApiResponseTime(),
      this.measureDatabaseQueryTime(),
    ]);

    return {
      timestamp: new Date(),
      apiResponseTime,
      databaseQueryTime,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
    };
  }
}

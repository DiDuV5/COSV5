/**
 * @fileoverview 性能监控服务
 * @description 提供数据库性能监控的统一服务接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { DatabasePerformanceMonitor } from '@/lib/monitoring/database-performance-monitor';
import { PerformanceReporter, PerformanceReport } from '@/lib/monitoring/performance-reporter';
import { prisma } from '@/lib/prisma';
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 最大指标数量 */
  maxMetricsSize: number;
  /** 报告生成间隔（小时） */
  reportInterval: number;
  /** 是否启用告警 */
  alertsEnabled: boolean;
}

/**
 * 性能监控服务
 */
export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private monitor: DatabasePerformanceMonitor;
  private reporter: PerformanceReporter;
  private config: MonitoringConfig;
  private reportTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.monitor = DatabasePerformanceMonitor.getInstance();
    this.reporter = PerformanceReporter.getInstance();
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      slowQueryThreshold: process.env.NODE_ENV === 'development' ? 2000 : 1000, // 开发环境2秒
      maxMetricsSize: 10000,
      reportInterval: 24,
      alertsEnabled: true,
    };

    // 初始化Redis连接
    this.initializeRedisConnection();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedisConnection(): Promise<void> {
    try {
      const { checkRedisHealth, formatHealthStatus } = await import('@/lib/utils/redis-health-check');

      // 给Redis更多时间初始化
      await new Promise(resolve => setTimeout(resolve, 1000));

      const healthStatus = await checkRedisHealth();

      if (healthStatus.isConnected) {
        if (process.env.NODE_ENV === 'development') {
          console.log('性能监控服务: Redis连接初始化成功');
          console.log(formatHealthStatus(healthStatus));
        }
      } else {
        // 只在真正失败时才记录警告
        if (healthStatus.status === 'end' || healthStatus.status === 'close') {
          console.warn('性能监控服务: Redis连接初始化失败，将在后台重试');
          console.warn(`错误详情: ${healthStatus.error}`);
        } else {
          // 对于wait/connecting状态，减少日志频率
          const now = Date.now();
          const lastLogKey = `redis_wait_log_${healthStatus.status}`;
          const lastLogTime = (global as any)[lastLogKey] || 0;
          const shouldLog = now - lastLogTime > 30000; // 30秒间隔

          if (process.env.NODE_ENV === 'development' && shouldLog) {
            console.log(`性能监控服务: Redis状态为${healthStatus.status}，等待连接建立...`);
            (global as any)[lastLogKey] = now;
          }
        }

        // 后台重试连接，根据状态调整重试间隔
        const retryDelay = healthStatus.status === 'wait' || healthStatus.status === 'connecting' ? 5000 : 10000;
        setTimeout(() => {
          this.initializeRedisConnection();
        }, retryDelay);
      }
    } catch (error) {
      console.error('性能监控服务: Redis连接初始化错误:', error);
      // 发生错误时也进行重试
      setTimeout(() => {
        this.initializeRedisConnection();
      }, 15000); // 15秒后重试
    }
  }

  /**
   * 获取服务实例（单例模式）
   */
  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * 初始化监控服务
   */
  initialize(config: Partial<MonitoringConfig> = {}): void {
    this.config = { ...this.config, ...config };

    // 配置性能监控器
    this.monitor.configure({
      enabled: this.config.enabled,
      slowQueryThreshold: this.config.slowQueryThreshold,
      maxMetricsSize: this.config.maxMetricsSize,
    });

    if (this.config.enabled) {
      this.setupPrismaMiddleware();
      this.startPeriodicReporting();
      console.log('🔍 数据库性能监控已启用');
    }
  }

  /**
   * 设置Prisma中间件
   */
  private setupPrismaMiddleware(): void {
    // 添加性能监控中间件
    prisma.$use(async (params, next) => {
      const startTime = Date.now();
      const { model, action, args } = params;

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        // 记录查询性能
        this.monitor.recordQuery(model || 'unknown', action, duration, args);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // 记录失败的查询
        this.monitor.recordQuery(model || 'unknown', action, duration, {
          ...args,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    });
  }

  /**
   * 启动定期报告
   */
  private startPeriodicReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    const intervalMs = this.config.reportInterval * 60 * 60 * 1000;

    this.reportTimer = setInterval(() => {
      this.generateAndLogReport();
    }, intervalMs);

    // 立即生成一次报告
    setTimeout(() => {
      this.generateAndLogReport();
    }, 60000); // 1分钟后生成首次报告
  }

  /**
   * 生成并记录报告
   */
  private generateAndLogReport(): void {
    try {
      const report = this.reporter.generateReport({
        timeRangeHours: this.config.reportInterval,
        includeDetails: false,
      });

      console.log('📊 数据库性能报告:', {
        timeRange: `${report.timeRange.start.toISOString()} - ${report.timeRange.end.toISOString()}`,
        totalQueries: report.overview.totalQueries,
        slowQueries: report.overview.slowQueries,
        averageDuration: `${report.overview.averageDuration.toFixed(2)}ms`,
        alertsCount: report.alerts.length,
      });

      // 处理告警
      if (this.config.alertsEnabled && report.alerts.length > 0) {
        this.handleAlerts(report.alerts);
      }

    } catch (error) {
      console.error('生成性能报告失败:', error);
    }
  }

  /**
   * 处理告警
   */
  private handleAlerts(alerts: any[]): void {
    alerts.forEach(alert => {
      const emoji = this.getAlertEmoji(alert.level);
      console.warn(`${emoji} 性能告警 [${alert.level.toUpperCase()}]:`, alert.message);

      if (alert.suggestion) {
        console.warn(`💡 建议: ${alert.suggestion}`);
      }
    });
  }

  /**
   * 获取告警表情符号
   */
  private getAlertEmoji(level: string): string {
    switch (level) {
      case 'critical': return '🔴';
      case 'error': return '🟠';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(timeRangeHours: number = 24) {
    const timeRange = {
      start: new Date(Date.now() - timeRangeHours * 60 * 60 * 1000),
      end: new Date(),
    };

    return {
      overview: this.monitor.getStats(timeRange),
      modelStats: this.monitor.getModelStats(timeRange),
      slowQueries: this.monitor.getSlowQueries(20),
      frequentQueries: this.monitor.getFrequentQueries(20),
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(timeRangeHours: number = 24): PerformanceReport {
    return this.reporter.generateReport({
      timeRangeHours,
      includeDetails: true,
    });
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport(timeRangeHours: number = 24): string {
    return this.reporter.generateMarkdownReport({
      timeRangeHours,
      includeDetails: true,
    });
  }

  /**
   * 获取实时指标
   */
  async getRealTimeMetrics() {
    return await this.reporter.getRealTimeMetrics();
  }

  /**
   * 清除监控数据
   */
  clearMetrics(): void {
    this.monitor.clearMetrics();
    console.log('🧹 性能监控数据已清除');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    // 重新配置监控器
    this.monitor.configure({
      enabled: this.config.enabled,
      slowQueryThreshold: this.config.slowQueryThreshold,
      maxMetricsSize: this.config.maxMetricsSize,
    });

    // 如果启用状态改变，重新初始化
    if (oldEnabled !== this.config.enabled) {
      if (this.config.enabled) {
        this.startPeriodicReporting();
        console.log('🔍 数据库性能监控已启用');
      } else {
        if (this.reportTimer) {
          clearInterval(this.reportTimer);
          this.reportTimer = null;
        }
        console.log('⏸️ 数据库性能监控已禁用');
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * 停止监控服务
   */
  stop(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    this.config.enabled = false;
    this.monitor.configure({ enabled: false });

    console.log('⏹️ 数据库性能监控已停止');
  }

  /**
   * 手动触发报告生成
   */
  triggerReport(): PerformanceReport {
    const report = this.generateReport();

    console.log('📊 手动生成性能报告:', {
      totalQueries: report.overview.totalQueries,
      slowQueries: report.overview.slowQueries,
      averageDuration: `${report.overview.averageDuration.toFixed(2)}ms`,
      alertsCount: report.alerts.length,
    });

    return report;
  }

  /**
   * 检查系统健康状态
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: any;
    issues: string[];
  }> {
    const realTimeMetrics = await this.getRealTimeMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查查询性能
    if (realTimeMetrics.averageResponseTime > 2000) {
      issues.push('平均响应时间过长');
      status = 'critical';
    } else if (realTimeMetrics.averageResponseTime > 1000) {
      issues.push('平均响应时间偏高');
      if (status === 'healthy') status = 'warning';
    }

    // 检查慢查询
    if (realTimeMetrics.recentSlowQueries > 10) {
      issues.push('近期慢查询过多');
      status = 'critical';
    } else if (realTimeMetrics.recentSlowQueries > 5) {
      issues.push('近期慢查询偏多');
      if (status === 'healthy') status = 'warning';
    }

    // 检查查询频率
    if (realTimeMetrics.currentQPS > 500) {
      issues.push('查询频率过高');
      if (status === 'healthy') status = 'warning';
    }

    return {
      status,
      metrics: realTimeMetrics,
      issues,
    };
  }
}

/**
 * 全局性能监控服务实例
 */
export const performanceMonitoringService = PerformanceMonitoringService.getInstance();

/**
 * 初始化性能监控
 */
export function initializePerformanceMonitoring(config: Partial<MonitoringConfig> = {}): void {
  performanceMonitoringService.initialize(config);
}

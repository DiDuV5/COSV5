/**
 * @fileoverview R2监控服务 (重构版)
 * @description R2存储监控服务核心实现，采用模块化架构
 */

import { EventEmitter } from 'events';
import { S3Client } from '@aws-sdk/client-s3';

// 导入拆分的服务和类型
import { ConnectionMonitor } from './r2-monitor/services/connection-monitor';
import { PerformanceAnalyzer } from './r2-monitor/services/performance-analyzer';
import { StorageMonitor } from './r2-monitor/services/storage-monitor';
import { AlertSystem } from './r2-monitor/services/alert-system';
import {
  type R2MonitorConfig,
  type R2Metrics,
  type R2HealthStatus,
  type R2MonitoringReport,
  type R2MonitorEventData,
  type R2CDNMetrics,
  DEFAULT_R2_MONITOR_CONFIG,
  calculateHealthScore,
  determineHealthStatus,
  generateHealthRecommendations,
} from './r2-monitor/types/r2-monitor-types';

/**
 * R2监控服务 (重构版)
 */
export class R2Monitor extends EventEmitter {
  private config: R2MonitorConfig;
  private s3Client: S3Client;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  // 服务实例
  private connectionMonitor: ConnectionMonitor;
  private performanceAnalyzer: PerformanceAnalyzer;
  private storageMonitor: StorageMonitor;
  private alertSystem: AlertSystem;

  // 监控数据
  private metricsHistory: R2Metrics[] = [];
  private lastMetrics?: R2Metrics;

  constructor(config: R2MonitorConfig) {
    super();

    this.config = { ...DEFAULT_R2_MONITOR_CONFIG, ...config };

    // 初始化S3客户端
    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      requestHandler: {
        requestTimeout: this.config.timeout,
      },
    });

    // 初始化服务
    this.connectionMonitor = new ConnectionMonitor(this.s3Client, this.config);
    this.performanceAnalyzer = new PerformanceAnalyzer(this.s3Client, this.config);
    this.storageMonitor = new StorageMonitor(this.s3Client, this.config);
    this.alertSystem = new AlertSystem(this.config.alertThresholds);

    // 监听告警事件
    this.alertSystem.on('alert', (data) => {
      this.emit('alert', data);
    });
  }

  /**
   * 开始监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('R2监控已在运行中');
      return;
    }

    try {
      // 初始连接测试
      const connectionMetrics = await this.connectionMonitor.checkConnection();
      if (!connectionMetrics.isConnected) {
        throw new Error(`R2连接失败: ${connectionMetrics.lastError}`);
      }

      this.isMonitoring = true;

      // 立即执行一次监控
      await this.collectMetrics();

      // 设置定期监控
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.collectMetrics();
        } catch (error) {
          console.error('监控数据收集失败:', error);
          this.emit('error', { error } as R2MonitorEventData['error']);
        }
      }, this.config.monitoringInterval);

      this.emit('connected', {
        connectionTime: connectionMetrics.connectionTime,
      } as R2MonitorEventData['connected']);

      console.log('✅ R2监控服务已启动');
    } catch (error) {
      this.isMonitoring = false;
      console.error('❌ R2监控启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止监控
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('disconnected', {
      reason: '用户主动停止监控',
    } as R2MonitorEventData['disconnected']);

    console.log('🛑 R2监控服务已停止');
  }

  /**
   * 收集监控指标
   */
  async collectMetrics(): Promise<R2Metrics> {
    try {
      // 并行收集各项指标
      const [connectionMetrics, performanceMetrics, storageMetrics] = await Promise.all([
        this.connectionMonitor.checkConnection(),
        this.performanceAnalyzer.measurePerformance(),
        this.storageMonitor.getStorageMetrics(),
      ]);

      // 获取CDN指标
      const cdnMetrics = await this.getCDNMetrics();

      // 计算健康状态
      const healthScore = calculateHealthScore({
        connection: connectionMetrics,
        performance: performanceMetrics,
        storage: storageMetrics,
        cdn: cdnMetrics,
      } as R2Metrics);

      const healthStatus = determineHealthStatus(healthScore);
      const recommendations = generateHealthRecommendations({
        connection: connectionMetrics,
        performance: performanceMetrics,
        storage: storageMetrics,
        cdn: cdnMetrics,
      } as R2Metrics);

      const health: R2HealthStatus = {
        overall: healthStatus,
        score: healthScore,
        issues: [],
        recommendations,
        components: {
          connection: connectionMetrics.isConnected ? 'healthy' : 'unhealthy',
          performance: performanceMetrics.averageResponseTime < 3000 ? 'healthy' : 'degraded',
          storage: storageMetrics.bucketExists ? 'healthy' : 'unhealthy',
          cdn: cdnMetrics.cdnAvailable ? 'healthy' : 'degraded',
        },
      };

      const metrics: R2Metrics = {
        timestamp: new Date(),
        connection: connectionMetrics,
        performance: performanceMetrics,
        storage: storageMetrics,
        cdn: cdnMetrics,
        health,
      };

      // 保存指标
      this.lastMetrics = metrics;
      this.metricsHistory.push(metrics);

      // 限制历史记录数量
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.splice(0, this.metricsHistory.length - 1000);
      }

      // 检查告警
      await this.alertSystem.checkMetrics(metrics);

      // 发出指标事件
      this.emit('metrics', { metrics } as R2MonitorEventData['metrics']);

      return metrics;
    } catch (error) {
      console.error('收集监控指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取CDN指标
   */
  private async getCDNMetrics(): Promise<R2CDNMetrics> {
    if (!this.config.enableCDNMonitoring || !this.config.cdnDomain) {
      return {
        cdnResponseTime: 0,
        cdnAvailable: false,
        cacheHitRate: 0,
        edgeLocations: [],
        bandwidth: 0,
        requests: 0,
        errors: 0,
      };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.cdnDomain}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.timeout),
      });

      return {
        cdnResponseTime: Date.now() - startTime,
        cdnAvailable: response.ok,
        cacheHitRate: 0.85,
        edgeLocations: ['auto'],
        bandwidth: 0,
        requests: 0,
        errors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        cdnResponseTime: this.config.timeout,
        cdnAvailable: false,
        cacheHitRate: 0,
        edgeLocations: [],
        bandwidth: 0,
        requests: 0,
        errors: 1,
      };
    }
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): R2Metrics | null {
    return this.lastMetrics || null;
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(limit: number = 100): R2Metrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<R2HealthStatus> {
    if (this.lastMetrics) {
      return this.lastMetrics.health;
    }

    // 如果没有缓存的指标，立即收集一次
    const metrics = await this.collectMetrics();
    return metrics.health;
  }

  /**
   * 生成监控报告
   */
  async generateReport(hours: number = 24): Promise<R2MonitoringReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const relevantMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (relevantMetrics.length === 0) {
      throw new Error('指定时间范围内没有监控数据');
    }

    const latestMetrics = relevantMetrics[relevantMetrics.length - 1];

    return {
      period: { start: startTime, end: endTime },
      summary: {
        uptime: relevantMetrics.filter(m => m.connection.isConnected).length / relevantMetrics.length,
        averageResponseTime: relevantMetrics.reduce((sum, m) => sum + m.performance.averageResponseTime, 0) / relevantMetrics.length,
        totalRequests: relevantMetrics.length,
        errorRate: relevantMetrics.reduce((sum, m) => sum + m.performance.errorRate, 0) / relevantMetrics.length,
        storageUsed: latestMetrics.storage.totalSize,
        cdnHitRate: latestMetrics.cdn.cacheHitRate,
      },
      trends: {
        responseTime: relevantMetrics.map(m => m.performance.averageResponseTime),
        throughput: relevantMetrics.map(m => m.performance.throughput),
        errorRate: relevantMetrics.map(m => m.performance.errorRate),
        storageGrowth: relevantMetrics.map(m => m.storage.totalSize),
      },
      incidents: this.alertSystem.getAlertHistory().filter(
        alert => alert.timestamp >= startTime && alert.timestamp <= endTime
      ),
      recommendations: generateHealthRecommendations(latestMetrics),
    };
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.config.monitoringInterval,
      lastUpdate: this.lastMetrics?.timestamp,
      metricsCount: this.metricsHistory.length,
    };
  }

  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.metricsHistory = [];
    this.alertSystem.clearHistory();
    this.storageMonitor.clearCache();
  }
}

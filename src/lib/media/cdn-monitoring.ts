/**
 * @fileoverview CDN监控和告警系统
 * @description 监控CDN性能、可用性和安全状态，提供实时告警功能
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { CDNMonitor } from './cdn-monitoring'
 * const monitor = CDNMonitor.getInstance()
 * monitor.startMonitoring()
 *
 * @dependencies
 * - ./cdn-config-manager: CDN配置管理器
 * - ./cdn-security-middleware: CDN安全中间件
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，实现完整的监控和告警功能
 */

import { cdnConfig } from './cdn-config-manager';
import { cdnSecurity } from './cdn-security-middleware';

/**
 * 监控指标接口
 */
interface MonitoringMetrics {
  timestamp: number;
  availability: {
    primary: boolean;
    backup: boolean[];
    overallStatus: 'healthy' | 'degraded' | 'down';
  };
  performance: {
    primaryLatency: number;
    backupLatencies: number[];
    averageLatency: number;
  };
  security: {
    totalRequests: number;
    blockedRequests: number;
    rateLimitedRequests: number;
    threatLevel: 'low' | 'medium' | 'high';
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
}

/**
 * 告警配置接口
 */
interface AlertConfig {
  availability: {
    enabled: boolean;
    threshold: number; // 可用性阈值 (%)
  };
  latency: {
    enabled: boolean;
    threshold: number; // 延迟阈值 (ms)
  };
  security: {
    enabled: boolean;
    blockedRequestsThreshold: number; // 被阻止请求阈值
    threatLevelThreshold: 'medium' | 'high';
  };
  errors: {
    enabled: boolean;
    threshold: number; // 错误率阈值 (%)
  };
}

/**
 * 告警事件接口
 */
interface AlertEvent {
  id: string;
  type: 'availability' | 'latency' | 'security' | 'error';
  level: 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  data?: any;
}

/**
 * CDN监控器类
 */
export class CDNMonitor {
  private static instance: CDNMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: MonitoringMetrics[] = [];
  private alerts: AlertEvent[] = [];
  private alertConfig: AlertConfig;

  private constructor() {
    this.alertConfig = {
      availability: {
        enabled: true,
        threshold: 95, // 95%可用性
      },
      latency: {
        enabled: true,
        threshold: 5000, // 5秒延迟
      },
      security: {
        enabled: true,
        blockedRequestsThreshold: 100, // 每小时100个被阻止请求
        threatLevelThreshold: 'medium',
      },
      errors: {
        enabled: true,
        threshold: 5, // 5%错误率
      },
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CDNMonitor {
    if (!CDNMonitor.instance) {
      CDNMonitor.instance = new CDNMonitor();
    }
    return CDNMonitor.instance;
  }

  /**
   * 开始监控
   */
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.log('CDN监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    console.log('开始CDN监控，检查间隔:', intervalMs, 'ms');

    // 立即执行一次检查
    this.performHealthCheck();

    // 设置定期检查
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('CDN监控已停止');
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const config = cdnConfig.getConfig();
      const securityStats = cdnSecurity.getAccessStats();
      
      // 检查可用性
      const availabilityResults = await this.checkAvailability(config);
      
      // 检查性能
      const performanceResults = await this.checkPerformance(config);
      
      // 分析安全状态
      const securityAnalysis = this.analyzeSecurityStatus(securityStats);
      
      // 检查错误率
      const errorAnalysis = this.analyzeErrors();

      // 构建监控指标
      const metrics: MonitoringMetrics = {
        timestamp: Date.now(),
        availability: availabilityResults,
        performance: performanceResults,
        security: securityAnalysis,
        errors: errorAnalysis,
      };

      // 保存指标
      this.saveMetrics(metrics);

      // 检查告警条件
      this.checkAlertConditions(metrics);

    } catch (error) {
      console.error('CDN健康检查失败:', error);
    }
  }

  /**
   * 检查可用性
   */
  private async checkAvailability(config: any): Promise<MonitoringMetrics['availability']> {
    const primaryAvailable = await this.testDomainAvailability(config.primaryDomain);
    const backupResults = await Promise.all(
      config.backupDomains.map((domain: string) => this.testDomainAvailability(domain))
    );

    const availableCount = [primaryAvailable, ...backupResults].filter(Boolean).length;
    const totalCount = 1 + config.backupDomains.length;
    const availabilityPercentage = (availableCount / totalCount) * 100;

    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (availabilityPercentage >= 80) {
      overallStatus = 'healthy';
    } else if (availabilityPercentage >= 50) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'down';
    }

    return {
      primary: primaryAvailable,
      backup: backupResults,
      overallStatus,
    };
  }

  /**
   * 测试域名可用性
   */
  private async testDomainAvailability(domain: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${domain}/health-check`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查性能
   */
  private async checkPerformance(config: any): Promise<MonitoringMetrics['performance']> {
    const primaryLatency = await this.measureLatency(config.primaryDomain);
    const backupLatencies = await Promise.all(
      config.backupDomains.map((domain: string) => this.measureLatency(domain))
    );

    const allLatencies = [primaryLatency, ...backupLatencies].filter(l => l > 0);
    const averageLatency = allLatencies.length > 0 
      ? allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length 
      : 0;

    return {
      primaryLatency,
      backupLatencies,
      averageLatency,
    };
  }

  /**
   * 测量延迟
   */
  private async measureLatency(domain: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await fetch(`${domain}/health-check`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return Date.now() - startTime;
    } catch (error) {
      return -1; // 表示无法连接
    }
  }

  /**
   * 分析安全状态
   */
  private analyzeSecurityStatus(stats: any): MonitoringMetrics['security'] {
    const totalRequests = stats.totalRequests || 0;
    const blockedRequests = stats.blockedRequests || 0;
    const rateLimitedRequests = stats.rateLimitedRequests || 0;

    let threatLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (blockedRequests > 50) {
      threatLevel = 'high';
    } else if (blockedRequests > 20) {
      threatLevel = 'medium';
    }

    return {
      totalRequests,
      blockedRequests,
      rateLimitedRequests,
      threatLevel,
    };
  }

  /**
   * 分析错误状态
   */
  private analyzeErrors(): MonitoringMetrics['errors'] {
    // 这里可以集成实际的错误日志分析
    return {
      count: 0,
      types: {},
    };
  }

  /**
   * 保存监控指标
   */
  private saveMetrics(metrics: MonitoringMetrics): void {
    this.metrics.push(metrics);
    
    // 只保留最近24小时的数据
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);
  }

  /**
   * 检查告警条件
   */
  private checkAlertConditions(metrics: MonitoringMetrics): void {
    // 可用性告警
    if (this.alertConfig.availability.enabled) {
      if (metrics.availability.overallStatus === 'down') {
        this.createAlert('availability', 'critical', 'CDN服务完全不可用', metrics);
      } else if (metrics.availability.overallStatus === 'degraded') {
        this.createAlert('availability', 'warning', 'CDN服务性能下降', metrics);
      }
    }

    // 延迟告警
    if (this.alertConfig.latency.enabled) {
      if (metrics.performance.averageLatency > this.alertConfig.latency.threshold) {
        this.createAlert('latency', 'warning', 
          `CDN延迟过高: ${metrics.performance.averageLatency}ms`, metrics);
      }
    }

    // 安全告警
    if (this.alertConfig.security.enabled) {
      if (metrics.security.threatLevel === 'high') {
        this.createAlert('security', 'critical', 
          `检测到高威胁级别，已阻止 ${metrics.security.blockedRequests} 个请求`, metrics);
      } else if (metrics.security.threatLevel === 'medium') {
        this.createAlert('security', 'warning', 
          `检测到中等威胁级别，已阻止 ${metrics.security.blockedRequests} 个请求`, metrics);
      }
    }
  }

  /**
   * 创建告警
   */
  private createAlert(
    type: AlertEvent['type'], 
    level: AlertEvent['level'], 
    message: string, 
    data?: any
  ): void {
    const alert: AlertEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      message,
      timestamp: Date.now(),
      resolved: false,
      data,
    };

    this.alerts.push(alert);
    
    // 输出告警到控制台
    console.warn(`🚨 CDN告警 [${level.toUpperCase()}]: ${message}`);
    
    // 这里可以集成邮件、短信、Webhook等通知方式
    this.sendNotification(alert);
  }

  /**
   * 发送通知
   */
  private sendNotification(alert: AlertEvent): void {
    // 这里可以实现具体的通知逻辑
    // 例如：发送邮件、调用Webhook、发送短信等
    console.log('发送告警通知:', alert);
  }

  /**
   * 获取监控指标
   */
  public getMetrics(hours: number = 1): MonitoringMetrics[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * 获取告警列表
   */
  public getAlerts(resolved: boolean = false): AlertEvent[] {
    return this.alerts.filter(a => a.resolved === resolved);
  }

  /**
   * 解决告警
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      console.log(`告警已解决: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * 更新告警配置
   */
  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    console.log('告警配置已更新:', this.alertConfig);
  }

  /**
   * 获取当前状态摘要
   */
  public getStatusSummary(): {
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: number;
    activeAlerts: number;
    metrics?: MonitoringMetrics;
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const activeAlerts = this.getAlerts(false).length;

    return {
      status: latestMetrics?.availability.overallStatus || 'down',
      lastCheck: latestMetrics?.timestamp || 0,
      activeAlerts,
      metrics: latestMetrics,
    };
  }
}

// 导出单例实例
export const cdnMonitor = CDNMonitor.getInstance();

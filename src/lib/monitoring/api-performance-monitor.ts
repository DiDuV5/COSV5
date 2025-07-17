/**
 * @fileoverview API性能监控系统
 * @description 监控API响应时间，目标95%请求<500ms
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 请求总数 */
  totalRequests: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 95%分位数响应时间 */
  p95ResponseTime: number;
  /** 99%分位数响应时间 */
  p99ResponseTime: number;
  /** 最大响应时间 */
  maxResponseTime: number;
  /** 最小响应时间 */
  minResponseTime: number;
  /** 错误率 */
  errorRate: number;
  /** 慢请求数量 */
  slowRequests: number;
  /** 超时请求数量 */
  timeoutRequests: number;
}

/**
 * 请求记录
 */
export interface RequestRecord {
  /** 请求ID */
  id: string;
  /** 请求路径 */
  path: string;
  /** 请求方法 */
  method: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 响应时间 */
  responseTime?: number;
  /** 状态码 */
  statusCode?: number;
  /** 错误信息 */
  error?: string;
  /** 用户ID */
  userId?: string;
  /** 用户代理 */
  userAgent?: string;
  /** IP地址 */
  ip?: string;
}

/**
 * 性能阈值配置
 */
export interface PerformanceThresholds {
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold: number;
  /** 超时阈值（毫秒） */
  timeoutThreshold: number;
  /** 错误率阈值（百分比） */
  errorRateThreshold: number;
  /** P95响应时间阈值（毫秒） */
  p95Threshold: number;
}

/**
 * API性能监控器
 */
export class APIPerformanceMonitor {
  private requests: Map<string, RequestRecord> = new Map();
  private completedRequests: RequestRecord[] = [];
  private maxRecords: number = 10000;
  private thresholds: PerformanceThresholds;
  private alertCallbacks: Array<(alert: any) => void> = [];

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      slowRequestThreshold: 1000, // 1秒
      timeoutThreshold: 30000, // 30秒
      errorRateThreshold: 5, // 5%
      p95Threshold: 500, // 500ms
      ...thresholds,
    };

    // 定期清理旧记录
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }

  /**
   * 开始监控请求
   */
  startRequest(
    id: string,
    path: string,
    method: string,
    metadata: {
      userId?: string;
      userAgent?: string;
      ip?: string;
    } = {}
  ): void {
    const record: RequestRecord = {
      id,
      path,
      method,
      startTime: Date.now(),
      ...metadata,
    };

    this.requests.set(id, record);
  }

  /**
   * 结束监控请求
   */
  endRequest(
    id: string,
    statusCode: number,
    error?: string
  ): void {
    const record = this.requests.get(id);
    if (!record) {
      console.warn(`未找到请求记录: ${id}`);
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - record.startTime;

    record.endTime = endTime;
    record.responseTime = responseTime;
    record.statusCode = statusCode;
    record.error = error;

    // 移动到已完成记录
    this.requests.delete(id);
    this.completedRequests.push(record);

    // 限制记录数量
    if (this.completedRequests.length > this.maxRecords) {
      this.completedRequests.shift();
    }

    // 检查性能阈值
    this.checkThresholds(record);

    // 记录性能日志
    this.logPerformance(record);
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(record: RequestRecord): void {
    const alerts: any[] = [];

    // 检查慢请求
    if (record.responseTime! > this.thresholds.slowRequestThreshold) {
      alerts.push({
        type: 'slow_request',
        message: `慢请求检测: ${record.path} 响应时间 ${record.responseTime}ms`,
        record,
        threshold: this.thresholds.slowRequestThreshold,
      });
    }

    // 检查超时
    if (record.responseTime! > this.thresholds.timeoutThreshold) {
      alerts.push({
        type: 'timeout',
        message: `请求超时: ${record.path} 响应时间 ${record.responseTime}ms`,
        record,
        threshold: this.thresholds.timeoutThreshold,
      });
    }

    // 检查错误
    if (record.statusCode && record.statusCode >= 400) {
      alerts.push({
        type: 'error',
        message: `请求错误: ${record.path} 状态码 ${record.statusCode}`,
        record,
      });
    }

    // 触发告警
    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => callback(alert));
    });
  }

  /**
   * 记录性能日志
   */
  private logPerformance(record: RequestRecord): void {
    const logLevel = this.getLogLevel(record);
    const message = `${record.method} ${record.path} - ${record.responseTime}ms - ${record.statusCode}`;

    switch (logLevel) {
      case 'error':
        console.error(`🚨 ${message}`, record.error);
        break;
      case 'warn':
        console.warn(`⚠️ ${message}`);
        break;
      case 'info':
        console.info(`ℹ️ ${message}`);
        break;
      default:
        console.log(`✅ ${message}`);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(record: RequestRecord): 'error' | 'warn' | 'info' | 'debug' {
    if (record.statusCode && record.statusCode >= 500) {
      return 'error';
    }
    if (record.statusCode && record.statusCode >= 400) {
      return 'warn';
    }
    if (record.responseTime! > this.thresholds.slowRequestThreshold) {
      return 'warn';
    }
    if (record.responseTime! > this.thresholds.p95Threshold) {
      return 'info';
    }
    return 'debug';
  }

  /**
   * 获取性能指标
   */
  getMetrics(timeRange?: { start: Date; end: Date }): PerformanceMetrics {
    let records = this.completedRequests;

    // 过滤时间范围
    if (timeRange) {
      records = records.filter(record => 
        record.startTime >= timeRange.start.getTime() &&
        record.startTime <= timeRange.end.getTime()
      );
    }

    if (records.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        timeoutRequests: 0,
      };
    }

    // 计算响应时间统计
    const responseTimes = records
      .map(r => r.responseTime!)
      .filter(t => t !== undefined)
      .sort((a, b) => a - b);

    const totalRequests = records.length;
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    // 计算错误率
    const errorRequests = records.filter(r => r.statusCode && r.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // 计算慢请求和超时请求
    const slowRequests = records.filter(r => r.responseTime! > this.thresholds.slowRequestThreshold).length;
    const timeoutRequests = records.filter(r => r.responseTime! > this.thresholds.timeoutThreshold).length;

    return {
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      maxResponseTime,
      minResponseTime,
      errorRate,
      slowRequests,
      timeoutRequests,
    };
  }

  /**
   * 获取路径性能统计
   */
  getPathMetrics(): Map<string, PerformanceMetrics> {
    const pathGroups = new Map<string, RequestRecord[]>();

    // 按路径分组
    this.completedRequests.forEach(record => {
      const path = record.path;
      if (!pathGroups.has(path)) {
        pathGroups.set(path, []);
      }
      pathGroups.get(path)!.push(record);
    });

    // 计算每个路径的指标
    const pathMetrics = new Map<string, PerformanceMetrics>();
    pathGroups.forEach((records, path) => {
      const responseTimes = records.map(r => r.responseTime!).sort((a, b) => a - b);
      const totalRequests = records.length;
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      const errorRequests = records.filter(r => r.statusCode && r.statusCode >= 400).length;

      pathMetrics.set(path, {
        totalRequests,
        averageResponseTime,
        p95ResponseTime: responseTimes[p95Index] || 0,
        p99ResponseTime: responseTimes[p99Index] || 0,
        maxResponseTime: Math.max(...responseTimes),
        minResponseTime: Math.min(...responseTimes),
        errorRate: (errorRequests / totalRequests) * 100,
        slowRequests: records.filter(r => r.responseTime! > this.thresholds.slowRequestThreshold).length,
        timeoutRequests: records.filter(r => r.responseTime! > this.thresholds.timeoutThreshold).length,
      });
    });

    return pathMetrics;
  }

  /**
   * 获取最慢的请求
   */
  getSlowestRequests(limit: number = 10): RequestRecord[] {
    return this.completedRequests
      .filter(r => r.responseTime !== undefined)
      .sort((a, b) => b.responseTime! - a.responseTime!)
      .slice(0, limit);
  }

  /**
   * 获取错误请求
   */
  getErrorRequests(limit: number = 10): RequestRecord[] {
    return this.completedRequests
      .filter(r => r.statusCode && r.statusCode >= 400)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * 添加告警回调
   */
  onAlert(callback: (alert: any) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * 清理旧记录
   */
  private cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 1小时前

    // 清理超时的进行中请求
    for (const [id, record] of this.requests.entries()) {
      if (record.startTime < oneHourAgo) {
        this.requests.delete(id);
        console.warn(`清理超时请求: ${id}`);
      }
    }

    // 保留最近的记录
    if (this.completedRequests.length > this.maxRecords) {
      this.completedRequests = this.completedRequests.slice(-this.maxRecords);
    }
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    this.requests.clear();
    this.completedRequests = [];
  }

  /**
   * 导出性能报告
   */
  exportReport(): any {
    const metrics = this.getMetrics();
    const pathMetrics = this.getPathMetrics();
    const slowestRequests = this.getSlowestRequests();
    const errorRequests = this.getErrorRequests();

    return {
      timestamp: new Date().toISOString(),
      summary: metrics,
      pathBreakdown: Object.fromEntries(pathMetrics),
      slowestRequests,
      errorRequests,
      thresholds: this.thresholds,
      healthStatus: this.getHealthStatus(metrics),
    };
  }

  /**
   * 获取健康状态
   */
  private getHealthStatus(metrics: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
    if (
      metrics.p95ResponseTime > this.thresholds.p95Threshold ||
      metrics.errorRate > this.thresholds.errorRateThreshold
    ) {
      return 'critical';
    }

    if (
      metrics.p95ResponseTime > this.thresholds.p95Threshold * 0.8 ||
      metrics.errorRate > this.thresholds.errorRateThreshold * 0.8
    ) {
      return 'warning';
    }

    return 'healthy';
  }
}

// 创建全局性能监控器实例
export const apiPerformanceMonitor = new APIPerformanceMonitor();

// 设置默认告警处理
apiPerformanceMonitor.onAlert((alert) => {
  console.warn(`🚨 性能告警: ${alert.message}`);
  
  // 在生产环境中，这里应该发送到监控系统
  if (process.env.NODE_ENV === 'production') {
    // 发送到监控系统（如Sentry、DataDog等）
    // sendToMonitoringSystem(alert);
  }
});

export default APIPerformanceMonitor;

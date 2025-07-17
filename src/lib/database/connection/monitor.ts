/**
 * @fileoverview 数据库连接监控器
 * @description 监控数据库连接池状态和性能指标
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { 
  DatabaseConnectionMetrics, 
  ConnectionPoolHealthStatus, 
  UtilizationStatusResult, 
  ErrorRateStatusResult,
  DatabaseConnectionConfig 
} from './types';
import { getDatabaseConfig } from './config';

/**
 * 数据库连接监控器
 */
export class DatabaseConnectionMonitor {
  private static instance: DatabaseConnectionMonitor;
  private metrics: DatabaseConnectionMetrics;

  private constructor() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      queryCount: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
    };
  }

  static getInstance(): DatabaseConnectionMonitor {
    if (!DatabaseConnectionMonitor.instance) {
      DatabaseConnectionMonitor.instance = new DatabaseConnectionMonitor();
    }
    return DatabaseConnectionMonitor.instance;
  }

  /**
   * 记录查询指标
   */
  recordQuery(success: boolean = true): void {
    this.metrics.queryCount++;
    if (!success) {
      this.metrics.errorCount++;
    }
  }

  /**
   * 更新连接指标
   */
  updateConnectionMetrics(total: number, active: number): void {
    this.metrics.totalConnections = total;
    this.metrics.activeConnections = active;
    this.metrics.lastHealthCheck = new Date();
  }

  /**
   * 获取当前指标
   */
  getMetrics(): DatabaseConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * 检查连接池使用率状态
   */
  private checkUtilizationStatus(
    utilizationRate: number,
    config: DatabaseConnectionConfig
  ): UtilizationStatusResult {

    if (utilizationRate > config.criticalThreshold) {
      return {
        isCritical: true,
        isWarning: false,
        message: `连接池使用率过高 (${(utilizationRate * 100).toFixed(1)}%)，可能影响性能`,
        recommendations: [
          '考虑增加连接池大小或优化查询性能',
          '检查是否存在连接泄漏'
        ]
      };
    } else if (utilizationRate > config.warningThreshold) {
      return {
        isCritical: false,
        isWarning: true,
        message: `连接池使用率较高 (${(utilizationRate * 100).toFixed(1)}%)，建议监控`,
        recommendations: ['监控连接池使用趋势']
      };
    }

    return {
      isCritical: false,
      isWarning: false,
      message: '数据库连接池状态正常',
      recommendations: []
    };
  }

  /**
   * 检查错误率状态
   */
  private checkErrorRateStatus(errorRate: number): ErrorRateStatusResult {
    if (errorRate > 0.1) {
      return {
        isWarning: true,
        message: `查询错误率较高 (${(errorRate * 100).toFixed(1)}%)，建议检查`,
        recommendations: [
          '检查数据库日志和查询性能',
          '验证数据库连接稳定性'
        ]
      };
    }

    return {
      isWarning: false,
      message: '',
      recommendations: []
    };
  }

  /**
   * 检查连接池健康状态
   */
  checkHealth(): ConnectionPoolHealthStatus {
    const config = getDatabaseConfig();
    const utilizationRate = this.metrics.activeConnections / config.connectionLimit;
    const errorRate = this.metrics.errorCount / Math.max(this.metrics.queryCount, 1);
    const timeSinceLastCheck = Date.now() - this.metrics.lastHealthCheck.getTime();

    // 检查各项指标
    const utilizationStatus = this.checkUtilizationStatus(utilizationRate, config);
    const errorStatus = this.checkErrorRateStatus(errorRate);

    // 合并状态和建议
    const allRecommendations = [
      ...utilizationStatus.recommendations,
      ...errorStatus.recommendations
    ];

    // 检查健康检查时效性
    if (timeSinceLastCheck > config.healthCheckInterval * 2) {
      allRecommendations.push('健康检查间隔过长，建议检查监控系统');
    }

    // 确定最终状态和消息
    let finalStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    let finalMessage = '数据库连接池状态正常';

    if (utilizationStatus.isCritical) {
      finalStatus = 'critical';
      finalMessage = utilizationStatus.message;
    } else if (utilizationStatus.isWarning || errorStatus.isWarning) {
      finalStatus = 'warning';
      finalMessage = utilizationStatus.message || errorStatus.message;
    }

    return {
      status: finalStatus,
      message: finalMessage,
      utilizationRate,
      errorRate,
      recommendations: allRecommendations,
      metrics: this.getMetrics(),
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      queryCount: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
    };
  }
}

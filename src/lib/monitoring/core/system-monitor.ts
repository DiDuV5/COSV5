/**
 * @fileoverview 系统状态监控器 - CoserEden平台
 * @description 系统整体状态监控和报告生成
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  SystemStatus,
  HealthCheckResult,
  SystemResources,
  MonitoringConfig,
} from './monitoring-types';

/**
 * 系统状态监控器类
 * 负责监控系统整体状态和生成状态报告
 */
export class SystemMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private healthCheckProvider?: () => HealthCheckResult[];

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * 设置健康检查提供者
   */
  public setHealthCheckProvider(provider: () => HealthCheckResult[]): void {
    this.healthCheckProvider = provider;
  }

  /**
   * 获取系统状态
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    try {
      // 获取系统资源信息
      const resources = this.getSystemResources();

      // 获取服务健康状态
      const services = this.healthCheckProvider ? this.healthCheckProvider() : [];

      // 计算整体状态
      const overall = this.calculateOverallStatus(resources, services);

      const status: SystemStatus = {
        overall,
        uptime: process.uptime(),
        memory: {
          used: resources.memory.heapUsed,
          total: resources.memory.heapTotal + resources.memory.external,
          percentage: this.calculateMemoryPercentage(resources.memory),
        },
        cpu: {
          usage: (resources.cpu.user + resources.cpu.system) / 1000000, // 转换为毫秒
          loadAverage: this.getLoadAverage(),
        },
        disk: {
          used: 0, // 需要实现磁盘使用检查
          total: 0,
          percentage: 0,
        },
        network: {
          bytesIn: 0, // 需要实现网络统计
          bytesOut: 0,
        },
        services,
        lastUpdated: Date.now(),
      };

      this.emit('systemStatus', status);
      return status;

    } catch (error) {
      this.log('ERROR', '获取系统状态失败', { error });
      throw error;
    }
  }

  /**
   * 获取系统资源信息
   */
  public getSystemResources(): SystemResources {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      eventLoopDelay: 0, // 需要实际测量
    };
  }

  /**
   * 检查系统健康状态
   */
  public checkSystemHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const resources = this.getSystemResources();
    const memoryPercentage = this.calculateMemoryPercentage(resources.memory);
    const loadAverage = this.getLoadAverage();

    // 检查内存使用
    if (memoryPercentage > 90) {
      issues.push('内存使用率过高 (>90%)');
      recommendations.push('考虑增加内存或优化内存使用');
    } else if (memoryPercentage > 80) {
      recommendations.push('监控内存使用情况，考虑优化');
    }

    // 检查CPU负载
    if (loadAverage[0] > 10) {
      issues.push('CPU负载过高');
      recommendations.push('检查CPU密集型任务，考虑优化或扩容');
    } else if (loadAverage[0] > 5) {
      recommendations.push('监控CPU负载，考虑性能优化');
    }

    // 检查运行时间
    const uptimeHours = resources.uptime / 3600;
    if (uptimeHours > 24 * 30) { // 超过30天
      recommendations.push('系统运行时间较长，考虑定期重启');
    }

    // 检查服务健康状态
    if (this.healthCheckProvider) {
      const services = this.healthCheckProvider();
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');

      if (unhealthyServices.length > 0) {
        issues.push(`${unhealthyServices.length}个服务不健康`);
        recommendations.push('检查并修复不健康的服务');
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * 生成系统报告
   */
  public async generateSystemReport(): Promise<{
    timestamp: number;
    status: SystemStatus;
    health: any;
    performance: {
      avgResponseTime: number;
      errorRate: number;
      throughput: number;
    };
    recommendations: string[];
  }> {
    const status = await this.getSystemStatus();
    const health = this.checkSystemHealth();

    // 模拟性能数据（实际应该从指标收集器获取）
    const performance = {
      avgResponseTime: 150, // ms
      errorRate: 0.5, // %
      throughput: 100, // requests/sec
    };

    const recommendations = [
      ...health.recommendations,
      ...this.generatePerformanceRecommendations(performance),
    ];

    return {
      timestamp: Date.now(),
      status,
      health,
      performance,
      recommendations,
    };
  }

  /**
   * 监控系统趋势
   */
  public monitorTrends(historicalData: SystemStatus[]): {
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    cpuTrend: 'increasing' | 'decreasing' | 'stable';
    serviceTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (historicalData.length < 2) {
      return {
        memoryTrend: 'stable',
        cpuTrend: 'stable',
        serviceTrend: 'stable',
      };
    }

    const recent = historicalData.slice(-5); // 最近5个数据点
    const older = historicalData.slice(-10, -5); // 之前5个数据点

    return {
      memoryTrend: this.calculateTrend(
        recent.map(d => d.memory.percentage),
        older.map(d => d.memory.percentage)
      ),
      cpuTrend: this.calculateTrend(
        recent.map(d => d.cpu.usage),
        older.map(d => d.cpu.usage)
      ),
      serviceTrend: this.calculateServiceTrend(recent, older),
    };
  }

  // 私有方法

  private calculateOverallStatus(
    resources: SystemResources,
    services: HealthCheckResult[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const memoryPercentage = this.calculateMemoryPercentage(resources.memory);
    const loadAverage = this.getLoadAverage();

    // 检查系统资源
    let resourceStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memoryPercentage > 90 || loadAverage[0] > 10) {
      resourceStatus = 'unhealthy';
    } else if (memoryPercentage > 80 || loadAverage[0] > 5) {
      resourceStatus = 'degraded';
    }

    // 检查服务状态
    let serviceStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (services.length > 0) {
      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const healthyRatio = healthyServices / services.length;

      if (healthyRatio < 0.5) {
        serviceStatus = 'unhealthy';
      } else if (healthyRatio < 0.8) {
        serviceStatus = 'degraded';
      }
    }

    // 返回最严重的状态
    if (resourceStatus === 'unhealthy' || serviceStatus === 'unhealthy') {
      return 'unhealthy';
    }
    if (resourceStatus === 'degraded' || serviceStatus === 'degraded') {
      return 'degraded';
    }
    return 'healthy';
  }

  private calculateMemoryPercentage(memory: SystemResources['memory']): number {
    const totalMemory = memory.heapTotal + memory.external;
    return totalMemory > 0 ? (memory.heapUsed / totalMemory) * 100 : 0;
  }

  private getLoadAverage(): number[] {
    try {
      return require('os').loadavg();
    } catch (error) {
      this.log('WARN', '无法获取负载平均值', { error });
      return [0, 0, 0];
    }
  }

  private generatePerformanceRecommendations(performance: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  }): string[] {
    const recommendations: string[] = [];

    if (performance.avgResponseTime > 500) {
      recommendations.push('响应时间过长，考虑性能优化');
    }

    if (performance.errorRate > 5) {
      recommendations.push('错误率过高，检查应用程序错误');
    }

    if (performance.throughput < 50) {
      recommendations.push('吞吐量较低，考虑扩容或优化');
    }

    return recommendations;
  }

  private calculateTrend(recent: number[], older: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private calculateServiceTrend(
    recent: SystemStatus[],
    older: SystemStatus[]
  ): 'improving' | 'degrading' | 'stable' {
    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentHealthy = recent.reduce((sum, status) => {
      const healthy = status.services.filter(s => s.status === 'healthy').length;
      return sum + (status.services.length > 0 ? healthy / status.services.length : 1);
    }, 0) / recent.length;

    const olderHealthy = older.reduce((sum, status) => {
      const healthy = status.services.filter(s => s.status === 'healthy').length;
      return sum + (status.services.length > 0 ? healthy / status.services.length : 1);
    }, 0) / older.length;

    const change = recentHealthy - olderHealthy;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'degrading';
    return 'stable';
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(logMessage, metadata);
        break;
      case 'WARN':
        console.warn(logMessage, metadata);
        break;
      case 'INFO':
        console.info(logMessage, metadata);
        break;
      case 'DEBUG':
        console.debug(logMessage, metadata);
        break;
    }

    this.emit('log', { timestamp, level, message, metadata, service: 'system-monitor' });
  }
}

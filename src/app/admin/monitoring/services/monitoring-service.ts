/**
 * @fileoverview 监控数据服务
 * @description 专门处理监控数据的获取、处理和分析
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 监控指标接口
 */
export interface MonitoringMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  errors: number;
  responseTime: number;
}

/**
 * 系统状态接口
 */
export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'online' | 'offline' | 'degraded';
    redis: 'online' | 'offline' | 'degraded';
    storage: 'online' | 'offline' | 'degraded';
    api: 'online' | 'offline' | 'degraded';
  };
  uptime: number;
  lastCheck: string;
}

/**
 * 用户活动接口
 */
export interface UserActivity {
  activeUsers: number;
  newRegistrations: number;
  totalSessions: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
}

/**
 * 错误统计接口
 */
export interface ErrorStats {
  total: number;
  byType: Array<{ type: string; count: number; percentage: number }>;
  recent: Array<{ timestamp: string; message: string; level: 'error' | 'warning' | 'info' }>;
}

/**
 * 性能趋势接口
 */
export interface PerformanceTrend {
  period: string;
  data: MonitoringMetrics[];
  summary: {
    avgCpu: number;
    avgMemory: number;
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
}

/**
 * 监控数据服务类
 */
export class MonitoringService {
  /**
   * 生成模拟监控指标
   */
  static generateMockMetrics(hours = 24): MonitoringMetrics[] {
    const metrics: MonitoringMetrics[] = [];
    const now = new Date();

    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      metrics.push({
        timestamp: timestamp.toISOString(),
        cpu: 30 + Math.random() * 40 + Math.sin(i / 4) * 10,
        memory: 50 + Math.random() * 30 + Math.sin(i / 6) * 15,
        disk: 15 + Math.random() * 10,
        network: Math.random() * 100,
        requests: 100 + Math.random() * 200 + Math.sin(i / 2) * 50,
        errors: Math.floor(Math.random() * 10),
        responseTime: 50 + Math.random() * 100 + Math.sin(i / 3) * 30,
      });
    }

    return metrics;
  }

  /**
   * 生成模拟系统状态
   */
  static generateMockSystemStatus(): SystemStatus {
    const services = ['database', 'redis', 'storage', 'api'] as const;
    const statuses = ['online', 'offline', 'degraded'] as const;
    
    const serviceStatus = services.reduce((acc, service) => {
      // 90%概率在线，8%概率降级，2%概率离线
      const rand = Math.random();
      let status: typeof statuses[number];
      if (rand < 0.9) status = 'online';
      else if (rand < 0.98) status = 'degraded';
      else status = 'offline';
      
      acc[service] = status;
      return acc;
    }, {} as Record<typeof services[number], typeof statuses[number]>);

    // 计算整体状态
    const hasOffline = Object.values(serviceStatus).includes('offline');
    const hasDegraded = Object.values(serviceStatus).includes('degraded');
    
    let overall: SystemStatus['overall'];
    if (hasOffline) overall = 'critical';
    else if (hasDegraded) overall = 'warning';
    else overall = 'healthy';

    return {
      overall,
      services: serviceStatus,
      uptime: 86400 * 7 + Math.random() * 86400, // 7天左右
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * 生成模拟用户活动
   */
  static generateMockUserActivity(): UserActivity {
    return {
      activeUsers: 150 + Math.floor(Math.random() * 100),
      newRegistrations: 5 + Math.floor(Math.random() * 15),
      totalSessions: 800 + Math.floor(Math.random() * 200),
      averageSessionDuration: 15 + Math.random() * 20, // 分钟
      topPages: [
        { page: '/posts', views: 1200 + Math.floor(Math.random() * 300) },
        { page: '/profile', views: 800 + Math.floor(Math.random() * 200) },
        { page: '/upload', views: 600 + Math.floor(Math.random() * 150) },
        { page: '/search', views: 400 + Math.floor(Math.random() * 100) },
        { page: '/settings', views: 200 + Math.floor(Math.random() * 50) },
      ],
    };
  }

  /**
   * 生成模拟错误统计
   */
  static generateMockErrorStats(): ErrorStats {
    const errorTypes = [
      { type: '404 Not Found', count: 45, percentage: 35 },
      { type: '500 Internal Server Error', count: 23, percentage: 18 },
      { type: '403 Forbidden', count: 18, percentage: 14 },
      { type: 'Database Connection', count: 15, percentage: 12 },
      { type: 'File Upload Error', count: 12, percentage: 9 },
      { type: 'Authentication Error', count: 8, percentage: 6 },
      { type: 'Rate Limit Exceeded', count: 5, percentage: 4 },
      { type: 'Other', count: 3, percentage: 2 },
    ];

    const recentErrors = [
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        message: 'Database connection timeout',
        level: 'error' as const,
      },
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        message: 'High memory usage detected',
        level: 'warning' as const,
      },
      {
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        message: 'File upload failed for user 12345',
        level: 'error' as const,
      },
      {
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        message: 'Cache miss rate above threshold',
        level: 'warning' as const,
      },
      {
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        message: 'System backup completed successfully',
        level: 'info' as const,
      },
    ];

    return {
      total: errorTypes.reduce((sum, type) => sum + type.count, 0),
      byType: errorTypes,
      recent: recentErrors,
    };
  }

  /**
   * 计算性能趋势
   */
  static calculatePerformanceTrend(metrics: MonitoringMetrics[]): PerformanceTrend {
    if (metrics.length === 0) {
      return {
        period: '24h',
        data: [],
        summary: {
          avgCpu: 0,
          avgMemory: 0,
          avgResponseTime: 0,
          totalRequests: 0,
          errorRate: 0,
        },
      };
    }

    const summary = {
      avgCpu: metrics.reduce((sum, m) => sum + m.cpu, 0) / metrics.length,
      avgMemory: metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length,
      avgResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      totalRequests: metrics.reduce((sum, m) => sum + m.requests, 0),
      errorRate: metrics.reduce((sum, m) => sum + m.errors, 0) / 
                 metrics.reduce((sum, m) => sum + m.requests, 0) * 100,
    };

    return {
      period: '24h',
      data: metrics,
      summary,
    };
  }

  /**
   * 格式化时间
   */
  static formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * 获取状态颜色
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * 获取状态文本
   */
  static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      healthy: '健康',
      warning: '警告',
      critical: '严重',
      online: '在线',
      offline: '离线',
      degraded: '降级',
    };
    return statusMap[status] || status;
  }

  /**
   * 生成告警建议
   */
  static generateAlerts(
    metrics: MonitoringMetrics[],
    systemStatus: SystemStatus,
    errorStats: ErrorStats
  ): Array<{ level: 'info' | 'warning' | 'error'; message: string }> {
    const alerts: Array<{ level: 'info' | 'warning' | 'error'; message: string }> = [];

    // 检查最新指标
    const latest = metrics[metrics.length - 1];
    if (latest) {
      if (latest.cpu > 80) {
        alerts.push({ level: 'error', message: 'CPU使用率过高，当前为' + latest.cpu.toFixed(1) + '%' });
      } else if (latest.cpu > 70) {
        alerts.push({ level: 'warning', message: 'CPU使用率较高，当前为' + latest.cpu.toFixed(1) + '%' });
      }

      if (latest.memory > 85) {
        alerts.push({ level: 'error', message: '内存使用率过高，当前为' + latest.memory.toFixed(1) + '%' });
      } else if (latest.memory > 75) {
        alerts.push({ level: 'warning', message: '内存使用率较高，当前为' + latest.memory.toFixed(1) + '%' });
      }

      if (latest.responseTime > 200) {
        alerts.push({ level: 'warning', message: '响应时间较慢，当前为' + latest.responseTime.toFixed(0) + 'ms' });
      }
    }

    // 检查系统状态
    if (systemStatus.overall === 'critical') {
      alerts.push({ level: 'error', message: '系统状态严重，请立即检查' });
    } else if (systemStatus.overall === 'warning') {
      alerts.push({ level: 'warning', message: '系统状态异常，建议检查' });
    }

    // 检查服务状态
    Object.entries(systemStatus.services).forEach(([service, status]) => {
      if (status === 'offline') {
        alerts.push({ level: 'error', message: `${service}服务离线` });
      } else if (status === 'degraded') {
        alerts.push({ level: 'warning', message: `${service}服务性能降级` });
      }
    });

    // 检查错误率
    const errorRate = (errorStats.total / 1000) * 100; // 假设总请求数为1000
    if (errorRate > 5) {
      alerts.push({ level: 'error', message: `错误率过高，当前为${errorRate.toFixed(1)}%` });
    } else if (errorRate > 2) {
      alerts.push({ level: 'warning', message: `错误率较高，当前为${errorRate.toFixed(1)}%` });
    }

    return alerts;
  }
}

/**
 * 导出服务创建函数
 */
export const createMonitoringService = () => MonitoringService;

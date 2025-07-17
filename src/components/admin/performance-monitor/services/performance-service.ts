/**
 * @fileoverview 性能监控数据服务
 * @description 专门处理性能指标的数据管理和计算
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 性能状态枚举
 */
export type PerformanceStatus = 'excellent' | 'good' | 'warning' | 'critical';

/**
 * 缓存指标接口
 */
export interface CacheMetrics {
  hitRate: number;
  hits: number;
  misses: number;
  totalRequests: number;
  redisConnected: boolean;
}

/**
 * 数据库指标接口
 */
export interface DatabaseMetrics {
  averageQueryTime: number;
  slowQueries: number;
  activeConnections: number;
  totalQueries: number;
}

/**
 * 存储指标接口
 */
export interface StorageMetrics {
  totalUsed: number;
  totalAvailable: number;
  usagePercentage: number;
  r2Connected: boolean;
  uploadSpeed: number;
  downloadSpeed: number;
}

/**
 * 系统指标接口
 */
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  totalUsers: number;
  uptime: number;
}

/**
 * 上传指标接口
 */
export interface UploadMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  averageUploadTime: number;
  totalFilesSize: number;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  cache: CacheMetrics;
  database: DatabaseMetrics;
  storage: StorageMetrics;
  system: SystemMetrics;
  upload: UploadMetrics;
}

/**
 * 阈值配置接口
 */
export interface PerformanceThresholds {
  cache: { good: number; warning: number };
  database: { good: number; warning: number };
  storage: { good: number; warning: number };
  system: { good: number; warning: number };
  upload: { good: number; warning: number };
}

/**
 * 性能监控数据服务类
 */
export class PerformanceService {
  /**
   * 默认阈值配置
   */
  private static readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    cache: { good: 80, warning: 60 },
    database: { good: 100, warning: 200 }, // 查询时间ms，越低越好
    storage: { good: 80, warning: 90 }, // 使用率%，越低越好
    system: { good: 70, warning: 85 }, // CPU/内存使用率%，越低越好
    upload: { good: 95, warning: 90 }, // 成功率%，越高越好
  };

  /**
   * 生成模拟性能指标
   */
  static generateMockMetrics(): PerformanceMetrics {
    return {
      cache: {
        hitRate: 85.5 + Math.random() * 10,
        hits: 1250 + Math.floor(Math.random() * 100),
        misses: 200 + Math.floor(Math.random() * 50),
        totalRequests: 1450 + Math.floor(Math.random() * 150),
        redisConnected: Math.random() > 0.1, // 90%概率连接正常
      },
      database: {
        averageQueryTime: 45.2 + Math.random() * 20,
        slowQueries: Math.floor(Math.random() * 10),
        activeConnections: 12 + Math.floor(Math.random() * 8),
        totalQueries: 5680 + Math.floor(Math.random() * 500),
      },
      storage: {
        totalUsed: 15.6 * 1024 * 1024 * 1024 + Math.random() * 1024 * 1024 * 1024,
        totalAvailable: 100 * 1024 * 1024 * 1024,
        usagePercentage: 15.6 + Math.random() * 5,
        r2Connected: Math.random() > 0.05, // 95%概率连接正常
        uploadSpeed: (2.5 + Math.random() * 2) * 1024 * 1024,
        downloadSpeed: (8.3 + Math.random() * 3) * 1024 * 1024,
      },
      system: {
        cpuUsage: 35.8 + Math.random() * 20,
        memoryUsage: 68.2 + Math.random() * 15,
        activeUsers: 156 + Math.floor(Math.random() * 50),
        totalUsers: 4600,
        uptime: 86400 * 7 + Math.random() * 86400,
      },
      upload: {
        totalUploads: 12450 + Math.floor(Math.random() * 100),
        successfulUploads: 12380 + Math.floor(Math.random() * 90),
        failedUploads: 70 + Math.floor(Math.random() * 20),
        averageUploadTime: 2.3 + Math.random() * 1,
        totalFilesSize: 45.8 * 1024 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024 * 1024,
      },
    };
  }

  /**
   * 获取性能状态
   */
  static getPerformanceStatus(
    value: number,
    thresholds: { good: number; warning: number },
    isReverse = false
  ): PerformanceStatus {
    if (isReverse) {
      // 对于查询时间、使用率等，值越低越好
      if (value <= thresholds.good) return 'excellent';
      if (value <= thresholds.warning) return 'good';
      if (value <= thresholds.warning * 1.2) return 'warning';
      return 'critical';
    } else {
      // 对于命中率、成功率等，值越高越好
      if (value >= thresholds.good) return 'excellent';
      if (value >= thresholds.warning) return 'good';
      if (value >= thresholds.warning * 0.8) return 'warning';
      return 'critical';
    }
  }

  /**
   * 获取缓存性能状态
   */
  static getCacheStatus(metrics: CacheMetrics): PerformanceStatus {
    if (!metrics.redisConnected) return 'critical';
    return this.getPerformanceStatus(metrics.hitRate, this.DEFAULT_THRESHOLDS.cache);
  }

  /**
   * 获取数据库性能状态
   */
  static getDatabaseStatus(metrics: DatabaseMetrics): PerformanceStatus {
    return this.getPerformanceStatus(
      metrics.averageQueryTime,
      this.DEFAULT_THRESHOLDS.database,
      true
    );
  }

  /**
   * 获取存储性能状态
   */
  static getStorageStatus(metrics: StorageMetrics): PerformanceStatus {
    if (!metrics.r2Connected) return 'critical';
    return this.getPerformanceStatus(
      metrics.usagePercentage,
      this.DEFAULT_THRESHOLDS.storage,
      true
    );
  }

  /**
   * 获取系统性能状态
   */
  static getSystemStatus(metrics: SystemMetrics): PerformanceStatus {
    const cpuStatus = this.getPerformanceStatus(
      metrics.cpuUsage,
      this.DEFAULT_THRESHOLDS.system,
      true
    );
    const memoryStatus = this.getPerformanceStatus(
      metrics.memoryUsage,
      this.DEFAULT_THRESHOLDS.system,
      true
    );
    
    // 取较差的状态
    const statuses = ['excellent', 'good', 'warning', 'critical'];
    const cpuIndex = statuses.indexOf(cpuStatus);
    const memoryIndex = statuses.indexOf(memoryStatus);
    
    return statuses[Math.max(cpuIndex, memoryIndex)] as PerformanceStatus;
  }

  /**
   * 获取上传性能状态
   */
  static getUploadStatus(metrics: UploadMetrics): PerformanceStatus {
    const successRate = (metrics.successfulUploads / metrics.totalUploads) * 100;
    return this.getPerformanceStatus(successRate, this.DEFAULT_THRESHOLDS.upload);
  }

  /**
   * 格式化文件大小
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化速度
   */
  static formatSpeed(bytesPerSecond: number): string {
    return this.formatBytes(bytesPerSecond) + '/s';
  }

  /**
   * 格式化时间
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
   * 获取状态颜色类
   */
  static getStatusColorClass(status: PerformanceStatus): string {
    const colors = {
      excellent: 'text-green-600 bg-green-100',
      good: 'text-blue-600 bg-blue-100',
      warning: 'text-yellow-600 bg-yellow-100',
      critical: 'text-red-600 bg-red-100',
    };
    return colors[status];
  }

  /**
   * 获取状态文本
   */
  static getStatusText(status: PerformanceStatus): string {
    const texts = {
      excellent: '优秀',
      good: '良好',
      warning: '警告',
      critical: '严重',
    };
    return texts[status];
  }

  /**
   * 计算整体健康度
   */
  static calculateOverallHealth(metrics: PerformanceMetrics): {
    status: PerformanceStatus;
    score: number;
    issues: string[];
  } {
    const statuses = [
      this.getCacheStatus(metrics.cache),
      this.getDatabaseStatus(metrics.database),
      this.getStorageStatus(metrics.storage),
      this.getSystemStatus(metrics.system),
      this.getUploadStatus(metrics.upload),
    ];

    const scores = {
      excellent: 100,
      good: 80,
      warning: 60,
      critical: 30,
    };

    const totalScore = statuses.reduce((sum, status) => sum + scores[status], 0);
    const averageScore = totalScore / statuses.length;

    let overallStatus: PerformanceStatus;
    if (averageScore >= 90) overallStatus = 'excellent';
    else if (averageScore >= 75) overallStatus = 'good';
    else if (averageScore >= 60) overallStatus = 'warning';
    else overallStatus = 'critical';

    const issues: string[] = [];
    if (!metrics.cache.redisConnected) issues.push('Redis连接异常');
    if (!metrics.storage.r2Connected) issues.push('R2存储连接异常');
    if (metrics.database.slowQueries > 5) issues.push('数据库慢查询过多');
    if (metrics.system.cpuUsage > 80) issues.push('CPU使用率过高');
    if (metrics.system.memoryUsage > 85) issues.push('内存使用率过高');
    if (metrics.storage.usagePercentage > 90) issues.push('存储空间不足');

    return {
      status: overallStatus,
      score: Math.round(averageScore),
      issues,
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createPerformanceService = () => PerformanceService;

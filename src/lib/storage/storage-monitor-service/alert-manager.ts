/**
 * @fileoverview 预警管理器
 * @description 负责管理存储预警的创建、检查和解决
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import {
  type StorageAlert,
  type DiskSpaceInfo,
  type DirectorySpaceInfo,
  type MonitorConfig,
  type AlertQueryOptions,
  AlertLevel
} from './types';
import {
  determineAlertLevel,
  generateAlertMessage,
  isAlertCooldownExpired
} from './utils';

/**
 * 预警管理器
 */
export class AlertManager {
  private alerts: StorageAlert[] = [];
  private lastAlertTimes = new Map<AlertLevel, Date>();

  /**
   * 检查是否需要创建预警
   */
  public checkForAlerts(
    diskInfo: DiskSpaceInfo,
    directoryInfos: DirectorySpaceInfo[],
    config: MonitorConfig
  ): StorageAlert | null {
    const alertLevel = determineAlertLevel(diskInfo.usage, config);

    if (!alertLevel) {
      return null;
    }

    // 检查冷却时间
    const lastAlertTime = this.lastAlertTimes.get(alertLevel);
    if (!isAlertCooldownExpired(lastAlertTime, config.alertCooldown)) {
      return null;
    }

    // 创建新预警
    const alert: StorageAlert = {
      level: alertLevel,
      message: generateAlertMessage(alertLevel, diskInfo),
      diskInfo,
      directoryInfo: directoryInfos,
      timestamp: new Date(),
      resolved: false,
    };

    this.addAlert(alert);
    this.lastAlertTimes.set(alertLevel, new Date());

    return alert;
  }

  /**
   * 添加预警
   */
  public addAlert(alert: StorageAlert): void {
    this.alerts.push(alert);

    // 保持预警数量在合理范围内
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50); // 保留最新的50个
    }
  }

  /**
   * 获取所有预警
   */
  public getAlerts(options: AlertQueryOptions = {}): StorageAlert[] {
    let filteredAlerts = [...this.alerts];

    // 按解决状态过滤
    if (options.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved === options.resolved);
    }

    // 按级别过滤
    if (options.level) {
      filteredAlerts = filteredAlerts.filter(alert => alert.level === options.level);
    }

    // 按时间范围过滤
    if (options.startDate) {
      filteredAlerts = filteredAlerts.filter(alert => alert.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filteredAlerts = filteredAlerts.filter(alert => alert.timestamp <= options.endDate!);
    }

    // 排序（最新的在前）
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 限制数量
    if (options.limit) {
      filteredAlerts = filteredAlerts.slice(0, options.limit);
    }

    return filteredAlerts;
  }

  /**
   * 获取未解决的预警
   */
  public getUnresolvedAlerts(): StorageAlert[] {
    return this.getAlerts({ resolved: false });
  }

  /**
   * 获取最高级别的未解决预警
   */
  public getHighestPriorityAlert(): StorageAlert | null {
    const unresolvedAlerts = this.getUnresolvedAlerts();

    if (unresolvedAlerts.length === 0) {
      return null;
    }

    // 按级别优先级排序
    const priorityOrder = {
      [AlertLevel.EMERGENCY]: 3,
      [AlertLevel.CRITICAL]: 2,
      [AlertLevel.WARNING]: 1,
    };

    return unresolvedAlerts.reduce((highest, current) => {
      const currentPriority = priorityOrder[current.level];
      const highestPriority = priorityOrder[highest.level];

      return currentPriority > highestPriority ? current : highest;
    });
  }

  /**
   * 解决预警
   */
  public resolveAlert(alertIndex: number): boolean {
    if (alertIndex >= 0 && alertIndex < this.alerts.length) {
      this.alerts[alertIndex].resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 批量解决预警
   */
  public resolveAlerts(level?: AlertLevel): number {
    let resolvedCount = 0;

    this.alerts.forEach(alert => {
      if (!alert.resolved && (!level || alert.level === level)) {
        alert.resolved = true;
        resolvedCount++;
      }
    });

    return resolvedCount;
  }

  /**
   * 清除已解决的预警
   */
  public clearResolvedAlerts(): number {
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    return initialCount - this.alerts.length;
  }

  /**
   * 清除所有预警
   */
  public clearAllAlerts(): number {
    const count = this.alerts.length;
    this.alerts = [];
    this.lastAlertTimes.clear();
    return count;
  }

  /**
   * 获取预警统计信息
   */
  public getAlertStats(): {
    total: number;
    unresolved: number;
    byLevel: Record<AlertLevel, number>;
    unresolvedByLevel: Record<AlertLevel, number>;
  } {
    const stats = {
      total: this.alerts.length,
      unresolved: 0,
      byLevel: {
        [AlertLevel.WARNING]: 0,
        [AlertLevel.CRITICAL]: 0,
        [AlertLevel.EMERGENCY]: 0,
      },
      unresolvedByLevel: {
        [AlertLevel.WARNING]: 0,
        [AlertLevel.CRITICAL]: 0,
        [AlertLevel.EMERGENCY]: 0,
      },
    };

    this.alerts.forEach(alert => {
      stats.byLevel[alert.level]++;

      if (!alert.resolved) {
        stats.unresolved++;
        stats.unresolvedByLevel[alert.level]++;
      }
    });

    return stats;
  }

  /**
   * 检查是否有紧急预警
   */
  public hasEmergencyAlerts(): boolean {
    return this.alerts.some(alert =>
      alert.level === AlertLevel.EMERGENCY && !alert.resolved
    );
  }

  /**
   * 检查是否有严重预警
   */
  public hasCriticalAlerts(): boolean {
    return this.alerts.some(alert =>
      alert.level === AlertLevel.CRITICAL && !alert.resolved
    );
  }

  /**
   * 获取最近的预警
   */
  public getRecentAlerts(hours: number = 24): StorageAlert[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * 检查预警趋势
   */
  public getAlertTrend(hours: number = 24): {
    trend: 'increasing' | 'decreasing' | 'stable';
    recentCount: number;
    previousCount: number;
  } {
    const now = new Date();
    const recentStart = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * hours * 60 * 60 * 1000);

    const recentAlerts = this.alerts.filter(alert =>
      alert.timestamp >= recentStart && alert.timestamp <= now
    );

    const previousAlerts = this.alerts.filter(alert =>
      alert.timestamp >= previousStart && alert.timestamp < recentStart
    );

    const recentCount = recentAlerts.length;
    const previousCount = previousAlerts.length;

    let trend: 'increasing' | 'decreasing' | 'stable';

    if (recentCount > previousCount) {
      trend = 'increasing';
    } else if (recentCount < previousCount) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      recentCount,
      previousCount,
    };
  }

  /**
   * 导出预警数据
   */
  public exportAlerts(): {
    alerts: StorageAlert[];
    stats: any; // 简化类型定义避免this类型问题
    exportedAt: Date;
  } {
    return {
      alerts: [...this.alerts],
      stats: this.getAlertStats(),
      exportedAt: new Date(),
    };
  }

  /**
   * 导入预警数据
   */
  public importAlerts(data: { alerts: StorageAlert[] }): number {
    const importedCount = data.alerts.length;
    this.alerts = [...data.alerts];

    // 重建最后预警时间映射
    this.lastAlertTimes.clear();
    data.alerts.forEach(alert => {
      const lastTime = this.lastAlertTimes.get(alert.level);
      if (!lastTime || alert.timestamp > lastTime) {
        this.lastAlertTimes.set(alert.level, alert.timestamp);
      }
    });

    return importedCount;
  }
}

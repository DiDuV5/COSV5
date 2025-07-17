/**
 * @fileoverview 数据管理器
 * @description 负责管理监控数据的存储和检索
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { 
  DiskSpaceInfo, 
  DirectorySpaceInfo, 
  StorageAlert,
  StorageTrendPoint,
  CleanupSuggestion 
} from './types';
import { formatFileSize, calculateStorageTrend, generateCleanupSuggestions } from './utils';

/**
 * 数据管理器
 */
export class DataManager {
  private diskSpaceHistory: DiskSpaceInfo[] = [];
  private directoryHistory: Map<string, DirectorySpaceInfo[]> = new Map();
  private alertHistory: StorageAlert[] = [];
  private maxHistorySize = 1000; // 最大历史记录数量

  /**
   * 记录磁盘空间数据
   */
  public recordDiskSpaceData(diskInfo: DiskSpaceInfo): void {
    this.diskSpaceHistory.push(diskInfo);
    
    // 保持历史记录在合理范围内
    if (this.diskSpaceHistory.length > this.maxHistorySize) {
      this.diskSpaceHistory = this.diskSpaceHistory.slice(-this.maxHistorySize / 2);
    }
  }

  /**
   * 记录目录空间数据
   */
  public recordDirectorySpaceData(directoryInfos: DirectorySpaceInfo[]): void {
    directoryInfos.forEach(dirInfo => {
      if (!this.directoryHistory.has(dirInfo.path)) {
        this.directoryHistory.set(dirInfo.path, []);
      }
      
      const history = this.directoryHistory.get(dirInfo.path)!;
      history.push(dirInfo);
      
      // 保持历史记录在合理范围内
      if (history.length > this.maxHistorySize) {
        this.directoryHistory.set(dirInfo.path, history.slice(-this.maxHistorySize / 2));
      }
    });
  }

  /**
   * 记录预警数据
   */
  public recordAlertData(alert: StorageAlert): void {
    this.alertHistory.push(alert);
    
    // 保持历史记录在合理范围内
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize / 2);
    }
  }

  /**
   * 获取磁盘空间历史数据
   */
  public getDiskSpaceHistory(limit?: number): DiskSpaceInfo[] {
    const history = [...this.diskSpaceHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * 获取目录空间历史数据
   */
  public getDirectorySpaceHistory(path: string, limit?: number): DirectorySpaceInfo[] {
    const history = this.directoryHistory.get(path) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * 获取预警历史数据
   */
  public getAlertHistory(limit?: number): StorageAlert[] {
    const history = [...this.alertHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * 获取最新的磁盘空间数据
   */
  public getLatestDiskSpaceData(): DiskSpaceInfo | null {
    return this.diskSpaceHistory.length > 0 
      ? this.diskSpaceHistory[this.diskSpaceHistory.length - 1] 
      : null;
  }

  /**
   * 获取最新的目录空间数据
   */
  public getLatestDirectorySpaceData(): DirectorySpaceInfo[] {
    const latestData: DirectorySpaceInfo[] = [];
    
    this.directoryHistory.forEach((history, path) => {
      if (history.length > 0) {
        latestData.push(history[history.length - 1]);
      }
    });
    
    return latestData.sort((a, b) => b.size - a.size);
  }

  /**
   * 获取存储趋势数据
   */
  public getStorageTrends(hours: number = 24): StorageTrendPoint[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.diskSpaceHistory
      .filter(data => data.timestamp >= cutoffTime)
      .map(data => ({
        timestamp: data.timestamp,
        usage: data.usage,
        total: Number(data.total),
        used: Number(data.used),
        free: Number(data.free),
        path: data.path,
      }));
  }

  /**
   * 分析存储使用趋势
   */
  public analyzeStorageTrend(hours: number = 24): {
    trend: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    prediction?: {
      daysUntilFull: number;
      estimatedFullDate: Date;
    };
  } {
    const trendData = this.getStorageTrends(hours);
    const trendAnalysis = calculateStorageTrend(trendData);
    
    const result: any = {
      trend: trendAnalysis.trend,
      rate: trendAnalysis.rate,
    };

    // 如果趋势是增长的，预测磁盘满的时间
    if (trendAnalysis.trend === 'increasing' && trendAnalysis.rate > 0) {
      const latestData = this.getLatestDiskSpaceData();
      if (latestData) {
        const remainingPercentage = 100 - latestData.usage;
        const daysUntilFull = remainingPercentage / trendAnalysis.rate;
        
        if (daysUntilFull > 0 && daysUntilFull < 365) { // 只预测一年内的
          const estimatedFullDate = new Date();
          estimatedFullDate.setDate(estimatedFullDate.getDate() + Math.ceil(daysUntilFull));
          
          result.prediction = {
            daysUntilFull: Math.ceil(daysUntilFull),
            estimatedFullDate,
          };
        }
      }
    }

    return result;
  }

  /**
   * 生成存储报告
   */
  public generateStorageReport(): {
    summary: {
      currentUsage: number;
      totalSpace: string;
      freeSpace: string;
      trend: string;
    };
    directories: Array<{
      path: string;
      size: string;
      fileCount: number;
      lastModified: Date;
    }>;
    alerts: {
      total: number;
      unresolved: number;
      recent: number;
    };
    suggestions: CleanupSuggestion[];
  } {
    const latestDiskData = this.getLatestDiskSpaceData();
    const latestDirectoryData = this.getLatestDirectorySpaceData();
    const trendAnalysis = this.analyzeStorageTrend();
    
    // 生成清理建议
    const suggestions = generateCleanupSuggestions(
      latestDirectoryData.map(dir => ({
        path: dir.path,
        size: dir.size,
        fileCount: dir.fileCount,
      }))
    );

    const cleanupSuggestions: CleanupSuggestion[] = suggestions.map(suggestion => ({
      type: 'large_files',
      description: suggestion,
      estimatedSpace: 0, // 这里需要更详细的分析
      files: [],
      priority: 'medium',
    }));

    return {
      summary: {
        currentUsage: latestDiskData?.usage || 0,
        totalSpace: latestDiskData ? formatFileSize(Number(latestDiskData.total)) : '未知',
        freeSpace: latestDiskData ? formatFileSize(Number(latestDiskData.free)) : '未知',
        trend: `${trendAnalysis.trend} (${trendAnalysis.rate.toFixed(2)}%/天)`,
      },
      directories: latestDirectoryData.slice(0, 10).map(dir => ({
        path: dir.path,
        size: formatFileSize(dir.size),
        fileCount: dir.fileCount,
        lastModified: dir.lastModified,
      })),
      alerts: {
        total: this.alertHistory.length,
        unresolved: this.alertHistory.filter(alert => !alert.resolved).length,
        recent: this.getRecentAlerts(24).length,
      },
      suggestions: cleanupSuggestions,
    };
  }

  /**
   * 获取最近的预警
   */
  private getRecentAlerts(hours: number): StorageAlert[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.alertHistory.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * 清理历史数据
   */
  public cleanupHistoryData(keepDays: number = 30): {
    diskSpaceRemoved: number;
    directoryDataRemoved: number;
    alertsRemoved: number;
  } {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - keepDays);

    // 清理磁盘空间历史
    const initialDiskCount = this.diskSpaceHistory.length;
    this.diskSpaceHistory = this.diskSpaceHistory.filter(
      data => data.timestamp >= cutoffTime
    );
    const diskSpaceRemoved = initialDiskCount - this.diskSpaceHistory.length;

    // 清理目录历史
    let directoryDataRemoved = 0;
    this.directoryHistory.forEach((history, path) => {
      const initialCount = history.length;
      const filteredHistory = history.filter(data => data.timestamp >= cutoffTime);
      this.directoryHistory.set(path, filteredHistory);
      directoryDataRemoved += initialCount - filteredHistory.length;
    });

    // 清理预警历史
    const initialAlertCount = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp >= cutoffTime
    );
    const alertsRemoved = initialAlertCount - this.alertHistory.length;

    return {
      diskSpaceRemoved,
      directoryDataRemoved,
      alertsRemoved,
    };
  }

  /**
   * 导出历史数据
   */
  public exportHistoryData(): {
    diskSpaceHistory: DiskSpaceInfo[];
    directoryHistory: Record<string, DirectorySpaceInfo[]>;
    alertHistory: StorageAlert[];
    exportedAt: Date;
  } {
    const directoryHistoryObj: Record<string, DirectorySpaceInfo[]> = {};
    this.directoryHistory.forEach((history, path) => {
      directoryHistoryObj[path] = [...history];
    });

    return {
      diskSpaceHistory: [...this.diskSpaceHistory],
      directoryHistory: directoryHistoryObj,
      alertHistory: [...this.alertHistory],
      exportedAt: new Date(),
    };
  }

  /**
   * 导入历史数据
   */
  public importHistoryData(data: {
    diskSpaceHistory?: DiskSpaceInfo[];
    directoryHistory?: Record<string, DirectorySpaceInfo[]>;
    alertHistory?: StorageAlert[];
  }): void {
    if (data.diskSpaceHistory) {
      this.diskSpaceHistory = [...data.diskSpaceHistory];
    }

    if (data.directoryHistory) {
      this.directoryHistory.clear();
      Object.entries(data.directoryHistory).forEach(([path, history]) => {
        this.directoryHistory.set(path, [...history]);
      });
    }

    if (data.alertHistory) {
      this.alertHistory = [...data.alertHistory];
    }
  }

  /**
   * 获取数据统计信息
   */
  public getDataStats(): {
    diskSpaceRecords: number;
    directoryPaths: number;
    totalDirectoryRecords: number;
    alertRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  } {
    let totalDirectoryRecords = 0;
    this.directoryHistory.forEach(history => {
      totalDirectoryRecords += history.length;
    });

    const allTimestamps: Date[] = [
      ...this.diskSpaceHistory.map(d => d.timestamp),
      ...this.alertHistory.map(a => a.timestamp),
    ];

    this.directoryHistory.forEach(history => {
      allTimestamps.push(...history.map(d => d.timestamp));
    });

    const oldestRecord = allTimestamps.length > 0 
      ? new Date(Math.min(...allTimestamps.map(d => d.getTime())))
      : null;

    const newestRecord = allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps.map(d => d.getTime())))
      : null;

    return {
      diskSpaceRecords: this.diskSpaceHistory.length,
      directoryPaths: this.directoryHistory.size,
      totalDirectoryRecords,
      alertRecords: this.alertHistory.length,
      oldestRecord,
      newestRecord,
    };
  }
}

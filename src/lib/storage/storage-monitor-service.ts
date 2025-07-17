/**
 * @fileoverview 存储空间监控服务 - 重构为模块化架构
 * @description 实时监控磁盘空间使用情况，提供预警和自动清理功能 - 模块化重构版本
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @dependencies
 * - fs/promises: 文件系统操作
 * - path: 路径处理
 * - @/lib/config/paths: 统一路径管理
 * - @/lib/prisma: 数据库操作
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持磁盘空间监控和预警
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

import { EventEmitter } from 'events';
import { pathManager } from '@/lib/config/paths';
import { prisma } from '@/lib/prisma';

// 导入模块化组件
import type {
  MonitorConfig,
  DiskSpaceInfo,
  DirectorySpaceInfo,
  StorageAlert,
  StorageStatus,
  ServiceStatus,
  MonitoringCheckResult
} from './storage-monitor-service/types';
import { createDefaultConfig, validateConfig } from './storage-monitor-service/utils';
import { DiskSpaceMonitor } from './storage-monitor-service/disk-space-monitor';
import { DirectoryScanner } from './storage-monitor-service/directory-scanner';
import { AlertManager } from './storage-monitor-service/alert-manager';
import { NotificationHandler } from './storage-monitor-service/notification-handler';
import { DataManager } from './storage-monitor-service/data-manager';

// 重新导出类型以保持向后兼容
export type {
  MonitorConfig,
  DiskSpaceInfo,
  DirectorySpaceInfo,
  StorageAlert,
  StorageStatus,
  ServiceStatus
} from './storage-monitor-service/types';
export { AlertLevel } from './storage-monitor-service/types';

/**
 * 存储监控服务 - 重构为模块化架构
 */
export class StorageMonitorService extends EventEmitter {
  private static instance: StorageMonitorService;
  private config: MonitorConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // 模块化组件
  private diskSpaceMonitor: DiskSpaceMonitor;
  private directoryScanner: DirectoryScanner;
  private alertManager: AlertManager;
  private notificationHandler: NotificationHandler;
  private dataManager: DataManager;

  private constructor(config?: Partial<MonitorConfig>) {
    super();
    this.config = createDefaultConfig(config);

    // 初始化模块化组件
    this.diskSpaceMonitor = new DiskSpaceMonitor();
    this.directoryScanner = new DirectoryScanner();
    this.alertManager = new AlertManager();
    this.notificationHandler = new NotificationHandler();
    this.dataManager = new DataManager();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<MonitorConfig>): StorageMonitorService {
    if (!StorageMonitorService.instance) {
      StorageMonitorService.instance = new StorageMonitorService(config);
    }
    return StorageMonitorService.instance;
  }

  /**
   * 启动监控
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('📊 存储监控已在运行中');
      return;
    }

    console.log('🚀 启动存储空间监控服务');
    this.isMonitoring = true;

    // 立即执行一次检查
    await this.performCheck();

    // 设置定时检查
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performCheck();
      } catch (error) {
        console.error('❌ 存储监控检查失败:', error);
        this.emit('error', error);
      }
    }, this.config.checkInterval);

    console.log(`✅ 存储监控已启动，检查间隔: ${this.config.checkInterval / 1000}秒`);
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
    console.log('⏹️ 存储监控已停止');
  }

  /**
   * 执行监控检查
   */
  private async performCheck(): Promise<void> {
    try {
      console.log('🔍 开始存储空间检查...');

      // 获取磁盘空间信息
      const diskInfo = await this.getDiskSpaceInfo();

      // 获取目录空间信息
      const directoryInfos = await this.getDirectorySpaceInfos();

      // 记录数据到内存
      this.dataManager.recordDiskSpaceData(diskInfo);
      this.dataManager.recordDirectorySpaceData(directoryInfos);

      // 保存监控数据到数据库
      await this.saveMonitoringData(diskInfo, directoryInfos);

      // 检查是否需要发送预警
      await this.checkAndSendAlerts(diskInfo, directoryInfos);

      // 发出监控事件
      this.emit('monitoringCheck', { diskInfo, directoryInfos });

      console.log(`📊 存储检查完成 - 磁盘使用率: ${diskInfo.usage.toFixed(1)}%`);
    } catch (error) {
      console.error('❌ 存储监控检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取磁盘空间信息
   */
  public async getDiskSpaceInfo(): Promise<DiskSpaceInfo> {
    try {
      const uploadsDir = pathManager.getUploadsDir();
      return await this.diskSpaceMonitor.getDiskSpaceInfo(uploadsDir);
    } catch (error) {
      console.error('获取磁盘空间信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取目录空间信息
   */
  public async getDirectorySpaceInfos(): Promise<DirectorySpaceInfo[]> {
    try {
      const directories = pathManager.getMonitoredDirectories();
      return await this.directoryScanner.getBatchDirectorySpaceInfo(directories);
    } catch (error) {
      console.error('获取目录空间信息失败:', error);
      return [];
    }
  }

  /**
   * 检查并发送预警
   */
  private async checkAndSendAlerts(
    diskInfo: DiskSpaceInfo,
    directoryInfos: DirectorySpaceInfo[]
  ): Promise<void> {
    try {
      // 检查是否需要创建预警
      const alert = this.alertManager.checkForAlerts(diskInfo, directoryInfos, this.config);

      if (alert) {
        // 记录预警到内存
        this.dataManager.recordAlertData(alert);

        // 保存预警到数据库
        await this.saveAlertToDatabase(alert);

        // 发送通知
        await this.notificationHandler.sendAlert(alert, this.config);

        // 发出预警事件
        this.emit('alert', alert);

        console.log(`🚨 发送存储预警: ${alert.level} - ${alert.message}`);
      }
    } catch (error) {
      console.error('检查和发送预警失败:', error);
    }
  }

  /**
   * 保存监控数据到数据库
   */
  private async saveMonitoringData(
    diskInfo: DiskSpaceInfo,
    directoryInfos: DirectorySpaceInfo[]
  ): Promise<void> {
    try {
      // 保存磁盘空间监控记录
      await prisma.storageMonitoring.create({
        data: {
          diskPath: diskInfo.path,
          totalSpace: diskInfo.total,
          usedSpace: diskInfo.used,
          freeSpace: diskInfo.free,
          usagePercentage: diskInfo.usage,
          directoryData: JSON.stringify(directoryInfos),
          timestamp: diskInfo.timestamp,
        },
      });

      // 清理旧的监控记录（保留最近30天）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await prisma.storageMonitoring.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      });
    } catch (error) {
      console.error('保存监控数据失败:', error);
      // 不抛出错误，避免影响监控流程
    }
  }

  /**
   * 保存预警到数据库
   */
  private async saveAlertToDatabase(alert: StorageAlert): Promise<void> {
    try {
      await prisma.storageAlert.create({
        data: {
          level: alert.level,
          message: alert.message,
          diskInfo: JSON.stringify(alert.diskInfo),
          directoryInfo: JSON.stringify(alert.directoryInfo),
          timestamp: alert.timestamp,
          resolved: alert.resolved,
        },
      });
    } catch (error) {
      console.error('保存预警到数据库失败:', error);
    }
  }

  /**
   * 获取存储使用趋势
   */
  public async getStorageUsageTrend(days: number = 7): Promise<DiskSpaceInfo[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await prisma.storageMonitoring.findMany({
        where: {
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      return records.map(record => ({
        path: record.diskPath,
        total: Number(record.totalSpace),
        used: Number(record.usedSpace),
        free: Number(record.freeSpace),
        usage: record.usagePercentage,
        timestamp: record.timestamp,
      }));
    } catch (error) {
      console.error('获取存储使用趋势失败:', error);
      return [];
    }
  }

  /**
   * 获取当前存储状态
   */
  public async getCurrentStorageStatus(): Promise<StorageStatus> {
    try {
      const diskInfo = await this.getDiskSpaceInfo();
      const directoryInfos = await this.getDirectorySpaceInfos();

      // 获取未解决的预警
      const alertRecords = await prisma.storageAlert.findMany({
        where: {
          resolved: false,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
      });

      const alerts: StorageAlert[] = alertRecords.map(record => ({
        level: record.level as any,
        message: record.message,
        diskInfo: JSON.parse(record.diskInfo),
        directoryInfo: JSON.parse(record.directoryInfo),
        timestamp: record.timestamp,
        resolved: record.resolved,
      }));

      return {
        diskInfo,
        directoryInfos,
        alerts,
      };
    } catch (error) {
      console.error('获取当前存储状态失败:', error);
      throw error;
    }
  }

  /**
   * 标记预警为已解决
   */
  public async resolveAlert(alertId: string): Promise<void> {
    try {
      await prisma.storageAlert.update({
        where: { id: alertId },
        data: { resolved: true },
      });
      console.log(`✅ 预警 ${alertId} 已标记为已解决`);
    } catch (error) {
      console.error('标记预警为已解决失败:', error);
      throw error;
    }
  }

  /**
   * 更新监控配置
   */
  public updateConfig(newConfig: Partial<MonitorConfig>): void {
    // 验证配置
    const errors = validateConfig(newConfig);
    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }

    this.config = { ...this.config, ...newConfig };
    console.log('📝 监控配置已更新:', newConfig);
  }

  /**
   * 获取监控配置
   */
  public getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * 检查服务状态
   */
  public getStatus(): ServiceStatus {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      lastCheck: this.dataManager.getLatestDiskSpaceData()?.timestamp,
    };
  }

  /**
   * 获取存储报告
   */
  public generateStorageReport() {
    return this.dataManager.generateStorageReport();
  }

  /**
   * 获取预警统计
   */
  public getAlertStats() {
    return this.alertManager.getAlertStats();
  }

  /**
   * 测试通知配置
   */
  public async testNotificationConfig() {
    return await this.notificationHandler.testNotificationConfig(this.config);
  }
}

// 导出默认实例
export const storageMonitor = StorageMonitorService.getInstance();

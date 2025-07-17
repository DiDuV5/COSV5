/**
 * @fileoverview 存储服务管理器
 * @description 统一管理存储监控和清理服务的启动、停止和配置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/storage/storage-monitor-service: 存储监控服务
 * - @/lib/storage/auto-cleanup-service: 自动清理服务
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持服务统一管理
 */

// 动态导入，避免在客户端环境中加载
let storageMonitor: any = null;
let autoCleanupService: any = null;

// 只在服务端环境中导入
if (typeof window === 'undefined') {
  try {
    // 使用require进行同步导入，避免async/await问题
    const storageModule = require('./storage-monitor-service');
    const cleanupModule = require('./auto-cleanup-service');
    storageMonitor = storageModule.storageMonitor;
    autoCleanupService = cleanupModule.autoCleanupService;
  } catch (error) {
    console.warn('存储服务模块加载失败:', error);
  }
}

/**
 * 存储服务管理器
 */
export class StorageServiceManager {
  private static instance: StorageServiceManager;
  private isInitialized = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): StorageServiceManager {
    if (!StorageServiceManager.instance) {
      StorageServiceManager.instance = new StorageServiceManager();
    }
    return StorageServiceManager.instance;
  }

  /**
   * 初始化所有存储服务
   */
  public async initialize(): Promise<void> {
    // 只在服务端环境中初始化
    if (typeof window !== 'undefined') {
      console.log('📦 存储服务只在服务端运行');
      return;
    }

    if (this.isInitialized) {
      console.log('📦 存储服务已初始化');
      return;
    }

    if (!storageMonitor || !autoCleanupService) {
      console.warn('⚠️ 存储服务模块未加载，跳过初始化');
      return;
    }

    try {
      console.log('🚀 开始初始化存储服务...');

      // 设置事件监听器
      this.setupEventListeners();

      // 启动存储监控服务
      await this.startMonitoringService();

      // 启动自动清理服务
      this.startCleanupService();

      this.isInitialized = true;
      console.log('✅ 存储服务初始化完成');
    } catch (error) {
      console.error('❌ 存储服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动存储监控服务
   */
  private async startMonitoringService(): Promise<void> {
    if (!storageMonitor) return;

    try {
      // 配置监控服务
      const monitorConfig = {
        checkInterval: 5 * 60 * 1000, // 5分钟检查一次
        warningThreshold: 75,
        criticalThreshold: 85,
        emergencyThreshold: 95,
        alertCooldown: 30 * 60 * 1000, // 30分钟冷却
        enableEmailNotification: true,
        enableWebhookNotification: false,
        adminEmails: [process.env.COSEREEDEN_INITIAL_ADMIN_EMAIL].filter(Boolean) as string[],
      };

      storageMonitor.updateConfig(monitorConfig);
      await storageMonitor.startMonitoring();

      console.log('📊 存储监控服务已启动');
    } catch (error) {
      console.error('❌ 启动存储监控服务失败:', error);
      throw error;
    }
  }

  /**
   * 启动自动清理服务
   */
  private startCleanupService(): void {
    if (!autoCleanupService) return;

    try {
      // 配置清理策略
      const cleanupStrategy = {
        chunkFiles: {
          maxAge: 24, // 24小时
          enabled: true,
        },
        orphanFiles: {
          maxAge: 48, // 48小时
          enabled: true,
          safetyCheck: true,
        },
        logFiles: {
          maxAge: 7, // 7天
          enabled: true,
          keepCount: 10,
        },
        backupFiles: {
          maxAge: 30, // 30天
          enabled: true,
          keepCount: 5,
        },
        failedUploads: {
          maxAge: 6, // 6小时
          enabled: true,
        },
        tempProcessingFiles: {
          maxAge: 2, // 2小时
          enabled: true,
        },
      };

      autoCleanupService.updateStrategy(cleanupStrategy);
      autoCleanupService.startAutoCleanup();

      console.log('🧹 自动清理服务已启动');
    } catch (error) {
      console.error('❌ 启动自动清理服务失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!storageMonitor || !autoCleanupService) return;

    // 监听存储监控事件
    storageMonitor.on('alert', (alert: any) => {
      console.log(`🚨 存储预警: ${alert.level} - ${alert.message}`);

      // 如果是紧急预警，可以触发自动清理
      if (alert.level === 'EMERGENCY') {
        this.handleEmergencyAlert(alert);
      }
    });

    storageMonitor.on('monitoringCheck', (data: any) => {
      const usage = data.diskInfo.usage.toFixed(1);
      console.log(`📊 存储检查完成 - 使用率: ${usage}%`);
    });

    storageMonitor.on('error', (error: any) => {
      console.error('❌ 存储监控错误:', error);
    });

    // 监听清理服务事件
    autoCleanupService.on('cleanupComplete', (report: any) => {
      const spaceFreed = this.formatBytes(report.totalSpaceFreed);
      console.log(`🧹 清理完成 - 删除: ${report.totalFilesDeleted} 文件, 释放: ${spaceFreed}`);
    });

    autoCleanupService.on('error', (error: any) => {
      console.error('❌ 自动清理错误:', error);
    });

    // 监听进程退出事件
    process.on('SIGINT', () => {
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.shutdown();
    });
  }

  /**
   * 处理紧急预警
   */
  private async handleEmergencyAlert(alert: any): Promise<void> {
    if (!autoCleanupService) return;

    try {
      console.log('🚨 检测到紧急存储预警，开始自动清理...');

      // 执行紧急清理
      const report = await autoCleanupService.performFullCleanup(false);

      if (report.success) {
        const spaceFreed = this.formatBytes(report.totalSpaceFreed);
        console.log(`✅ 紧急清理完成 - 释放空间: ${spaceFreed}`);
      } else {
        console.error('❌ 紧急清理失败');
      }
    } catch (error) {
      console.error('❌ 处理紧急预警失败:', error);
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取服务状态
   */
  public getStatus(): {
    initialized: boolean;
    monitor: any;
    cleanup: any;
  } {
    return {
      initialized: this.isInitialized,
      monitor: storageMonitor ? storageMonitor.getStatus() : null,
      cleanup: autoCleanupService ? autoCleanupService.getStatus() : null,
    };
  }

  /**
   * 重启服务
   */
  public async restart(): Promise<void> {
    console.log('🔄 重启存储服务...');

    this.shutdown();
    this.isInitialized = false;

    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    await this.initialize();

    console.log('✅ 存储服务重启完成');
  }

  /**
   * 关闭所有服务
   */
  public shutdown(): void {
    console.log('⏹️ 关闭存储服务...');

    try {
      if (storageMonitor) {
        storageMonitor.stopMonitoring();
        storageMonitor.removeAllListeners();
      }

      if (autoCleanupService) {
        autoCleanupService.stopAutoCleanup();
        autoCleanupService.removeAllListeners();
      }

      this.isInitialized = false;
      console.log('✅ 存储服务已关闭');
    } catch (error) {
      console.error('❌ 关闭存储服务失败:', error);
    }
  }

  /**
   * 执行健康检查
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: any;
  }> {
    try {
      const status = this.getStatus();

      if (!status.initialized || !storageMonitor) {
        return {
          status: 'error',
          details: { message: '存储服务未初始化' },
        };
      }

      // 检查存储状态
      const storageStatus = await storageMonitor.getCurrentStorageStatus();
      const diskUsage = storageStatus.diskInfo.usage;

      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      if (diskUsage >= 95) {
        healthStatus = 'error';
      } else if (diskUsage >= 85) {
        healthStatus = 'warning';
      }

      return {
        status: healthStatus,
        details: {
          diskUsage,
          alerts: storageStatus.alerts.length,
          services: status,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : '未知错误' },
      };
    }
  }
}

// 导出默认实例
export const storageServiceManager = StorageServiceManager.getInstance();

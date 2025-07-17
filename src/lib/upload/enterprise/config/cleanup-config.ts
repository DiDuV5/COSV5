/**
 * @fileoverview 清理配置管理器
 * @description 管理清理服务的配置
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  CleanupConfig,
  CleanupTaskType,
  CleanupPriority,
  CleanupTaskConfig
} from '../types/cleanup-types';

/**
 * 清理配置管理器类
 */
export class CleanupConfigManager {
  constructor(private config: CleanupConfig) {}

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): CleanupConfig {
    return {
      enabled: true,
      tasks: {
        [CleanupTaskType.ORPHAN_FILES]: {
          type: CleanupTaskType.ORPHAN_FILES,
          enabled: true,
          priority: CleanupPriority.HIGH,
          schedule: '0 2 * * *', // 每天凌晨2点
          maxRetries: 3,
          timeoutMs: 300000, // 5分钟
          options: {
            retentionDays: 7,
            batchSize: 100,
            dryRun: false
          }
        },
        [CleanupTaskType.EXPIRED_TRANSACTIONS]: {
          type: CleanupTaskType.EXPIRED_TRANSACTIONS,
          enabled: true,
          priority: CleanupPriority.HIGH,
          schedule: '0 3 * * *', // 每天凌晨3点
          maxRetries: 3,
          timeoutMs: 180000, // 3分钟
          options: {
            retentionDays: 1,
            batchSize: 50,
            dryRun: false
          }
        },
        [CleanupTaskType.TEMP_FILES]: {
          type: CleanupTaskType.TEMP_FILES,
          enabled: true,
          priority: CleanupPriority.MEDIUM,
          schedule: '0 1 * * *', // 每天凌晨1点
          maxRetries: 2,
          timeoutMs: 600000, // 10分钟
          options: {
            retentionDays: 30,
            batchSize: 200,
            dryRun: false
          }
        },
        [CleanupTaskType.OLD_LOGS]: {
          type: CleanupTaskType.OLD_LOGS,
          enabled: true,
          priority: CleanupPriority.LOW,
          schedule: '0 5 * * 0', // 每周日凌晨5点
          maxRetries: 2,
          timeoutMs: 900000, // 15分钟
          options: {
            retentionDays: 90,
            batchSize: 50,
            compressOld: true,
            dryRun: false
          }
        },
        [CleanupTaskType.CACHE_CLEANUP]: {
          type: CleanupTaskType.CACHE_CLEANUP,
          enabled: true,
          priority: CleanupPriority.MEDIUM,
          schedule: '0 */6 * * *', // 每6小时
          maxRetries: 2,
          timeoutMs: 120000, // 2分钟
          options: {
            expiredOnly: true,
            memoryThreshold: 0.8,
            dryRun: false
          }
        },
        [CleanupTaskType.DATABASE_OPTIMIZATION]: {
          type: CleanupTaskType.DATABASE_OPTIMIZATION,
          enabled: false, // 默认禁用，需要手动启用
          priority: CleanupPriority.LOW,
          schedule: '0 6 * * 0', // 每周日凌晨6点
          maxRetries: 1,
          timeoutMs: 1800000, // 30分钟
          options: {
            optimizeAfter: true,
            cascadeDelete: false,
            dryRun: true // 默认干运行
          }
        },
        [CleanupTaskType.STORAGE_CLEANUP]: {
          type: CleanupTaskType.STORAGE_CLEANUP,
          enabled: true,
          priority: CleanupPriority.MEDIUM,
          schedule: '0 4 * * *', // 每天凌晨4点
          maxRetries: 3,
          timeoutMs: 1200000, // 20分钟
          options: {
            retentionDays: 30,
            minSize: 0,
            recursive: true,
            dryRun: false
          }
        },
        [CleanupTaskType.SESSION_CLEANUP]: {
          type: CleanupTaskType.SESSION_CLEANUP,
          enabled: true,
          priority: CleanupPriority.HIGH,
          schedule: '0 */2 * * *', // 每2小时
          maxRetries: 2,
          timeoutMs: 60000, // 1分钟
          options: {
            expiredOnly: true,
            batchSize: 1000,
            dryRun: false
          }
        }
      },
      storage: {
        region: process.env.COSEREEDEN_R2_REGION || 'auto',
        endpoint: process.env.COSEREEDEN_R2_ENDPOINT || '',
        accessKeyId: process.env.COSEREEDEN_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.COSEREEDEN_R2_SECRET_ACCESS_KEY || '',
        bucket: process.env.COSEREEDEN_R2_BUCKET || 'cosereeden-storage'
      },
      database: {
        connectionString: process.env.COSEREEDEN_DATABASE_URL || '',
        maxConnections: 10
      },
      globalSettings: {
        maxConcurrentTasks: 3,
        defaultTimeoutMs: 300000, // 5分钟
        retryDelayMs: 5000, // 5秒
        enableLogging: true,
        logLevel: 'info'
      }
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): CleanupConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 获取任务配置
   */
  getTaskConfig(taskType: CleanupTaskType): CleanupTaskConfig | undefined {
    return this.config.tasks[taskType];
  }

  /**
   * 更新任务配置
   */
  updateTaskConfig(taskType: CleanupTaskType, updates: Partial<CleanupTaskConfig>): void {
    const currentConfig = this.config.tasks[taskType];
    if (currentConfig) {
      this.config.tasks[taskType] = { ...currentConfig, ...updates };
    }
  }

  /**
   * 启用任务
   */
  enableTask(taskType: CleanupTaskType): void {
    const taskConfig = this.config.tasks[taskType];
    if (taskConfig) {
      taskConfig.enabled = true;
    }
  }

  /**
   * 禁用任务
   */
  disableTask(taskType: CleanupTaskType): void {
    const taskConfig = this.config.tasks[taskType];
    if (taskConfig) {
      taskConfig.enabled = false;
    }
  }

  /**
   * 获取启用的任务列表
   */
  getEnabledTasks(): CleanupTaskType[] {
    return Object.values(this.config.tasks)
      .filter(task => task.enabled)
      .map(task => task.type);
  }

  /**
   * 获取禁用的任务列表
   */
  getDisabledTasks(): CleanupTaskType[] {
    return Object.values(this.config.tasks)
      .filter(task => !task.enabled)
      .map(task => task.type);
  }

  /**
   * 按优先级获取任务
   */
  getTasksByPriority(priority: CleanupPriority): CleanupTaskType[] {
    return Object.values(this.config.tasks)
      .filter(task => task.priority === priority && task.enabled)
      .map(task => task.type);
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证全局设置
    if (this.config.globalSettings.maxConcurrentTasks <= 0) {
      errors.push('最大并发任务数必须大于0');
    }

    if (this.config.globalSettings.defaultTimeoutMs <= 0) {
      errors.push('默认超时时间必须大于0');
    }

    // 验证存储配置
    if (!this.config.storage.endpoint) {
      errors.push('存储端点不能为空');
    }

    if (!this.config.storage.accessKeyId || !this.config.storage.secretAccessKey) {
      errors.push('存储访问密钥不能为空');
    }

    // 验证数据库配置
    if (!this.config.database.connectionString) {
      errors.push('数据库连接字符串不能为空');
    }

    // 验证任务配置
    Object.values(this.config.tasks).forEach(task => {
      if (task.timeoutMs <= 0) {
        errors.push(`任务 ${task.type} 的超时时间必须大于0`);
      }

      if (task.maxRetries < 0) {
        errors.push(`任务 ${task.type} 的重试次数不能为负数`);
      }

      // 验证cron表达式（简单验证）
      if (task.schedule && !this.isValidCronExpression(task.schedule)) {
        errors.push(`任务 ${task.type} 的调度表达式格式不正确`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 简单的cron表达式验证
   */
  private isValidCronExpression(cron: string): boolean {
    // 简单验证：5个或6个字段，用空格分隔
    const parts = cron.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  /**
   * 导出配置为JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const importedConfig = JSON.parse(configJson) as CleanupConfig;
      
      // 验证导入的配置
      const validation = this.validateImportedConfig(importedConfig);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      this.config = importedConfig;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `配置解析失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }

  /**
   * 验证导入的配置
   */
  private validateImportedConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('配置必须是一个对象');
      return { valid: false, errors };
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('enabled字段必须是布尔值');
    }

    if (!config.tasks || typeof config.tasks !== 'object') {
      errors.push('tasks字段必须是一个对象');
    }

    if (!config.storage || typeof config.storage !== 'object') {
      errors.push('storage字段必须是一个对象');
    }

    if (!config.database || typeof config.database !== 'object') {
      errors.push('database字段必须是一个对象');
    }

    if (!config.globalSettings || typeof config.globalSettings !== 'object') {
      errors.push('globalSettings字段必须是一个对象');
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * @fileoverview 清理策略管理器
 * @description 管理和配置各种清理策略
 */

import {
  type CleanupStrategy,
  type CleanupTaskConfig,
  CleanupMode
} from '../types';

/**
 * 默认清理策略
 */
export const DEFAULT_CLEANUP_STRATEGY: CleanupStrategy = {
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

/**
 * 预设清理策略
 */
export const PRESET_STRATEGIES = {
  /** 保守策略 - 保留更长时间 */
  conservative: {
    ...DEFAULT_CLEANUP_STRATEGY,
    chunkFiles: { maxAge: 48, enabled: true },
    orphanFiles: { maxAge: 96, enabled: true, safetyCheck: true },
    logFiles: { maxAge: 14, enabled: true, keepCount: 20 },
    backupFiles: { maxAge: 60, enabled: true, keepCount: 10 },
    failedUploads: { maxAge: 12, enabled: true },
    tempProcessingFiles: { maxAge: 4, enabled: true },
  } as CleanupStrategy,

  /** 激进策略 - 更频繁清理 */
  aggressive: {
    ...DEFAULT_CLEANUP_STRATEGY,
    chunkFiles: { maxAge: 12, enabled: true },
    orphanFiles: { maxAge: 24, enabled: true, safetyCheck: true },
    logFiles: { maxAge: 3, enabled: true, keepCount: 5 },
    backupFiles: { maxAge: 14, enabled: true, keepCount: 3 },
    failedUploads: { maxAge: 3, enabled: true },
    tempProcessingFiles: { maxAge: 1, enabled: true },
  } as CleanupStrategy,

  /** 开发环境策略 */
  development: {
    ...DEFAULT_CLEANUP_STRATEGY,
    chunkFiles: { maxAge: 6, enabled: true },
    orphanFiles: { maxAge: 12, enabled: false, safetyCheck: true },
    logFiles: { maxAge: 1, enabled: true, keepCount: 3 },
    backupFiles: { maxAge: 7, enabled: false, keepCount: 2 },
    failedUploads: { maxAge: 2, enabled: true },
    tempProcessingFiles: { maxAge: 0.5, enabled: true },
  } as CleanupStrategy,

  /** 生产环境策略 */
  production: {
    ...DEFAULT_CLEANUP_STRATEGY,
    chunkFiles: { maxAge: 24, enabled: true },
    orphanFiles: { maxAge: 72, enabled: true, safetyCheck: true },
    logFiles: { maxAge: 30, enabled: true, keepCount: 30 },
    backupFiles: { maxAge: 90, enabled: true, keepCount: 15 },
    failedUploads: { maxAge: 8, enabled: true },
    tempProcessingFiles: { maxAge: 3, enabled: true },
  } as CleanupStrategy,
};

/**
 * 清理策略管理器
 */
export class CleanupStrategyManager {
  private strategy: CleanupStrategy;

  constructor(initialStrategy?: Partial<CleanupStrategy>) {
    this.strategy = this.mergeStrategy(DEFAULT_CLEANUP_STRATEGY, initialStrategy);
  }

  /**
   * 获取当前策略
   */
  public getStrategy(): CleanupStrategy {
    return { ...this.strategy };
  }

  /**
   * 更新策略
   */
  public updateStrategy(newStrategy: Partial<CleanupStrategy>): void {
    this.strategy = this.mergeStrategy(this.strategy, newStrategy);
  }

  /**
   * 应用预设策略
   */
  public applyPreset(presetName: keyof typeof PRESET_STRATEGIES): void {
    const preset = PRESET_STRATEGIES[presetName];
    if (!preset) {
      throw new Error(`未知的预设策略: ${presetName}`);
    }
    this.strategy = { ...preset };
  }

  /**
   * 验证策略配置
   */
  public validateStrategy(strategy: Partial<CleanupStrategy>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证时间配置
    Object.entries(strategy).forEach(([key, config]) => {
      if (config && typeof config === 'object' && 'maxAge' in config) {
        if (config.maxAge < 0) {
          errors.push(`${key}.maxAge 不能为负数`);
        }
        if (config.maxAge > 8760) { // 一年的小时数
          errors.push(`${key}.maxAge 不能超过一年`);
        }
      }

      if (config && typeof config === 'object' && 'keepCount' in config) {
        if (config.keepCount < 0) {
          errors.push(`${key}.keepCount 不能为负数`);
        }
        if (config.keepCount > 1000) {
          errors.push(`${key}.keepCount 不能超过1000`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取任务配置
   */
  public getTaskConfig(taskType: string): CleanupTaskConfig | null {
    const strategyMap: Record<string, any> = {
      chunkFiles: this.strategy.chunkFiles,
      orphanFiles: this.strategy.orphanFiles,
      logFiles: this.strategy.logFiles,
      backupFiles: this.strategy.backupFiles,
      failedUploads: this.strategy.failedUploads,
      tempProcessingFiles: this.strategy.tempProcessingFiles,
    };

    const config = strategyMap[taskType];
    if (!config) return null;

    return {
      name: taskType,
      type: taskType,
      enabled: config.enabled,
      maxAge: this.convertToMilliseconds(config.maxAge, taskType),
      targetDir: this.getTargetDirectory(taskType),
      keepCount: config.keepCount,
      safetyCheck: config.safetyCheck,
    };
  }

  /**
   * 获取所有启用的任务配置
   */
  public getEnabledTaskConfigs(): CleanupTaskConfig[] {
    const taskTypes = [
      'chunkFiles',
      'orphanFiles',
      'logFiles',
      'backupFiles',
      'failedUploads',
      'tempProcessingFiles'
    ];

    return taskTypes
      .map(type => this.getTaskConfig(type))
      .filter((config): config is CleanupTaskConfig => config !== null && config.enabled);
  }

  /**
   * 计算清理模式
   */
  public getCleanupMode(taskType: string): CleanupMode {
    const config = this.getTaskConfig(taskType);
    if (!config) return CleanupMode.AGE_BASED;

    if (config.keepCount && config.keepCount > 0) {
      return CleanupMode.HYBRID; // 既有时间限制又有数量限制
    }

    return CleanupMode.AGE_BASED;
  }

  /**
   * 获取策略摘要
   */
  public getStrategySummary(): string {
    const enabled = this.getEnabledTaskConfigs();
    const disabled = Object.keys(this.strategy).filter(key => {
      const config = (this.strategy as any)[key];
      return config && !config.enabled;
    });

    return `
清理策略摘要:
- 启用的任务: ${enabled.length} 个 (${enabled.map(c => c.name).join(', ')})
- 禁用的任务: ${disabled.length} 个 (${disabled.join(', ')})
- 最短保留时间: ${this.getMinRetentionTime()}
- 最长保留时间: ${this.getMaxRetentionTime()}
    `.trim();
  }

  /**
   * 合并策略
   */
  private mergeStrategy(base: CleanupStrategy, override?: Partial<CleanupStrategy>): CleanupStrategy {
    if (!override) return { ...base };

    const merged = { ...base };

    Object.entries(override).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        (merged as any)[key] = { ...(merged as any)[key], ...value };
      }
    });

    return merged;
  }

  /**
   * 转换时间单位为毫秒
   */
  private convertToMilliseconds(value: number, taskType: string): number {
    // 日志和备份文件使用天为单位，其他使用小时
    const isDayUnit = ['logFiles', 'backupFiles'].includes(taskType);
    const multiplier = isDayUnit ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    return value * multiplier;
  }

  /**
   * 获取目标目录
   */
  private getTargetDirectory(taskType: string): string {
    // 这里应该从路径管理器获取，简化处理
    const dirMap: Record<string, string> = {
      chunkFiles: 'chunks',
      orphanFiles: 'media',
      logFiles: 'logs',
      backupFiles: 'backups',
      failedUploads: 'temp',
      tempProcessingFiles: 'temp',
    };

    return dirMap[taskType] || 'temp';
  }

  /**
   * 获取最短保留时间
   */
  private getMinRetentionTime(): string {
    const configs = this.getEnabledTaskConfigs();
    if (configs.length === 0) return '无';

    const minAge = Math.min(...configs.map(c => c.maxAge));
    return this.formatDuration(minAge);
  }

  /**
   * 获取最长保留时间
   */
  private getMaxRetentionTime(): string {
    const configs = this.getEnabledTaskConfigs();
    if (configs.length === 0) return '无';

    const maxAge = Math.max(...configs.map(c => c.maxAge));
    return this.formatDuration(maxAge);
  }

  /**
   * 格式化时长
   */
  private formatDuration(milliseconds: number): string {
    const hours = milliseconds / (60 * 60 * 1000);

    if (hours < 24) {
      return `${hours}小时`;
    }

    const days = Math.floor(hours / 24);
    return `${days}天`;
  }
}

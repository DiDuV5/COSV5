/**
 * @fileoverview 优化配置管理器 - CoserEden平台
 * @description 管理优化系统的配置和设置
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  OptimizationConfig,
  AnalysisConfig,
  IOptimizationConfigManager,
} from './optimization-types';

/**
 * 优化配置管理器类
 * 负责管理优化系统的各种配置
 */
export class OptimizationConfigManager extends EventEmitter implements IOptimizationConfigManager {
  private static instance: OptimizationConfigManager;
  private config: OptimizationConfig;
  private analysisConfig: AnalysisConfig;

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.analysisConfig = this.getDefaultAnalysisConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OptimizationConfigManager {
    if (!OptimizationConfigManager.instance) {
      OptimizationConfigManager.instance = new OptimizationConfigManager();
    }
    return OptimizationConfigManager.instance;
  }

  /**
   * 获取优化配置
   */
  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * 更新优化配置
   */
  public updateConfig(config: Partial<OptimizationConfig>): void {
    const newConfig = { ...this.config, ...config };
    
    if (this.validateConfig(newConfig)) {
      this.config = newConfig;
      this.emit('configUpdated', this.config);
      console.log('✅ 优化配置已更新');
    } else {
      throw new Error('无效的配置参数');
    }
  }

  /**
   * 获取分析配置
   */
  public getAnalysisConfig(): AnalysisConfig {
    return { ...this.analysisConfig };
  }

  /**
   * 更新分析配置
   */
  public updateAnalysisConfig(config: Partial<AnalysisConfig>): void {
    this.analysisConfig = { ...this.analysisConfig, ...config };
    this.emit('analysisConfigUpdated', this.analysisConfig);
    console.log('✅ 分析配置已更新');
  }

  /**
   * 验证配置
   */
  public validateConfig(config: OptimizationConfig): boolean {
    try {
      // 验证自动优化配置
      if (config.autoOptimization) {
        const { enabled, safetyLevel, schedule } = config.autoOptimization;
        
        if (typeof enabled !== 'boolean') {
          console.error('autoOptimization.enabled 必须是布尔值');
          return false;
        }
        
        if (!['conservative', 'moderate', 'aggressive'].includes(safetyLevel)) {
          console.error('autoOptimization.safetyLevel 必须是 conservative、moderate 或 aggressive');
          return false;
        }
        
        if (typeof schedule !== 'string' || schedule.trim() === '') {
          console.error('autoOptimization.schedule 必须是非空字符串');
          return false;
        }
      }

      // 验证阈值配置
      if (config.thresholds) {
        const { codeQuality, testCoverage, performance } = config.thresholds;
        
        if (typeof codeQuality !== 'number' || codeQuality < 0 || codeQuality > 100) {
          console.error('thresholds.codeQuality 必须是 0-100 之间的数字');
          return false;
        }
        
        if (typeof testCoverage !== 'number' || testCoverage < 0 || testCoverage > 100) {
          console.error('thresholds.testCoverage 必须是 0-100 之间的数字');
          return false;
        }
        
        if (typeof performance !== 'number' || performance < 0 || performance > 100) {
          console.error('thresholds.performance 必须是 0-100 之间的数字');
          return false;
        }
      }

      // 验证通知配置
      if (config.notifications) {
        const { enabled, channels } = config.notifications;
        
        if (typeof enabled !== 'boolean') {
          console.error('notifications.enabled 必须是布尔值');
          return false;
        }
        
        if (!Array.isArray(channels)) {
          console.error('notifications.channels 必须是数组');
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('配置验证失败:', error);
      return false;
    }
  }

  /**
   * 重置为默认配置
   */
  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.analysisConfig = this.getDefaultAnalysisConfig();
    this.emit('configReset');
    console.log('✅ 配置已重置为默认值');
  }

  /**
   * 导出配置
   */
  public exportConfig(): {
    optimization: OptimizationConfig;
    analysis: AnalysisConfig;
    timestamp: number;
  } {
    return {
      optimization: this.getConfig(),
      analysis: this.getAnalysisConfig(),
      timestamp: Date.now(),
    };
  }

  /**
   * 导入配置
   */
  public importConfig(data: {
    optimization?: OptimizationConfig;
    analysis?: AnalysisConfig;
  }): void {
    if (data.optimization) {
      if (this.validateConfig(data.optimization)) {
        this.config = data.optimization;
      } else {
        throw new Error('导入的优化配置无效');
      }
    }

    if (data.analysis) {
      this.analysisConfig = data.analysis;
    }

    this.emit('configImported', data);
    console.log('✅ 配置导入完成');
  }

  /**
   * 获取配置摘要
   */
  public getConfigSummary(): {
    autoOptimizationEnabled: boolean;
    safetyLevel: string;
    thresholds: {
      codeQuality: number;
      testCoverage: number;
      performance: number;
    };
    notificationsEnabled: boolean;
    analysisEnabled: {
      refactoring: boolean;
      testing: boolean;
      performance: boolean;
    };
  } {
    return {
      autoOptimizationEnabled: this.config.autoOptimization.enabled,
      safetyLevel: this.config.autoOptimization.safetyLevel,
      thresholds: this.config.thresholds,
      notificationsEnabled: this.config.notifications.enabled,
      analysisEnabled: {
        refactoring: this.analysisConfig.enableRefactoring,
        testing: this.analysisConfig.enableTesting,
        performance: this.analysisConfig.enablePerformance,
      },
    };
  }

  /**
   * 更新安全级别
   */
  public updateSafetyLevel(level: 'conservative' | 'moderate' | 'aggressive'): void {
    this.config.autoOptimization.safetyLevel = level;
    this.emit('safetyLevelUpdated', level);
    console.log(`✅ 安全级别已更新为: ${level}`);
  }

  /**
   * 更新阈值
   */
  public updateThresholds(thresholds: Partial<{
    codeQuality: number;
    testCoverage: number;
    performance: number;
  }>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
    this.emit('thresholdsUpdated', this.config.thresholds);
    console.log('✅ 阈值已更新');
  }

  /**
   * 切换自动优化
   */
  public toggleAutoOptimization(enabled: boolean): void {
    this.config.autoOptimization.enabled = enabled;
    this.emit('autoOptimizationToggled', enabled);
    console.log(`✅ 自动优化已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 切换通知
   */
  public toggleNotifications(enabled: boolean): void {
    this.config.notifications.enabled = enabled;
    this.emit('notificationsToggled', enabled);
    console.log(`✅ 通知已${enabled ? '启用' : '禁用'}`);
  }

  // 私有方法

  private getDefaultConfig(): OptimizationConfig {
    return {
      autoOptimization: {
        enabled: false,
        safetyLevel: 'conservative',
        schedule: '0 2 * * 0', // 每周日凌晨2点
      },
      thresholds: {
        codeQuality: 80,
        testCoverage: 80,
        performance: 85,
      },
      notifications: {
        enabled: true,
        channels: ['email', 'slack'],
      },
    };
  }

  private getDefaultAnalysisConfig(): AnalysisConfig {
    return {
      enableRefactoring: true,
      enableTesting: true,
      enablePerformance: true,
      projectRoot: process.cwd(),
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
      includePatterns: [
        'src/**/*.ts',
        'src/**/*.tsx',
        'src/**/*.js',
        'src/**/*.jsx',
      ],
    };
  }
}

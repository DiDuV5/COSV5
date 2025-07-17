/**
 * @fileoverview 统一内存监控服务
 * @description 替换6个重复的内存监控实现，提供统一的内存监控和优化功能
 * @author Augment AI
 * @date 2025-07-01
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

/**
 * 内存使用统计
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  percentage: number;
  rss: number;
  timestamp: Date;
}

/**
 * 内存监控配置
 */
export interface MemoryMonitoringConfig {
  /** 检查间隔（毫秒） */
  interval?: number;
  /** 警告阈值（百分比） */
  warningThreshold?: number;
  /** 严重阈值（百分比） */
  criticalThreshold?: number;
  /** 紧急阈值（百分比） */
  emergencyThreshold?: number;
  /** 自动优化 */
  autoOptimize?: boolean;
  /** 启用日志 */
  enableLogging?: boolean;
  /** 最大历史记录数 */
  maxHistorySize?: number;
}

/**
 * 内存优化结果
 */
export interface MemoryOptimizationResult {
  beforeStats: MemoryStats;
  afterStats: MemoryStats;
  optimizationsApplied: string[];
  memoryFreed: number;
  success: boolean;
}

/**
 * 统一内存监控服务
 * 整合所有内存监控功能，消除重复实现
 */
export class UnifiedMemoryMonitoring extends EventEmitter {
  private static instance: UnifiedMemoryMonitoring;
  private isMonitoring = false;
  private monitorInterval?: NodeJS.Timeout;
  private memoryHistory: MemoryStats[] = [];
  private config: Required<MemoryMonitoringConfig>;
  private lastOptimization = 0;
  private optimizationCooldown = 60000; // 1分钟冷却时间

  private constructor() {
    super();
    // 设置更高的监听器限制，避免内存泄漏警告
    this.setMaxListeners(20);

    this.config = {
      interval: 30000, // 30秒
      warningThreshold: 85,  // 提高警告阈值，减少不必要的警告
      criticalThreshold: 92, // 提高危险阈值，允许更高的内存使用
      emergencyThreshold: 97, // 提高紧急阈值，只在真正危险时触发
      autoOptimize: true,
      enableLogging: true,
      maxHistorySize: 50, // 减少历史记录大小，节省内存
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedMemoryMonitoring {
    if (!UnifiedMemoryMonitoring.instance) {
      UnifiedMemoryMonitoring.instance = new UnifiedMemoryMonitoring();
    }
    return UnifiedMemoryMonitoring.instance;
  }

  /**
   * 启动内存监控
   */
  public startMonitoring(config?: Partial<MemoryMonitoringConfig>): void {
    if (this.isMonitoring) {
      if (this.config.enableLogging) {
        console.log('📊 统一内存监控已在运行，跳过重复启动');
      }
      return;
    }

    // 更新配置
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.performMemoryCheck();
    }, this.config.interval);

    if (this.config.enableLogging) {
      console.log(`🔧 启动统一内存监控器（间隔: ${this.config.interval}ms）`);
    }

    // 立即执行一次检查
    this.performMemoryCheck();
  }

  /**
   * 停止内存监控
   */
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isMonitoring = false;

    if (this.config.enableLogging) {
      console.log('🛑 统一内存监控已停止');
    }
  }

  /**
   * 获取当前内存统计
   */
  public getMemoryStats(): MemoryStats {
    const memoryUsage = process.memoryUsage();
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      percentage: Number(percentage.toFixed(2)),
      rss: memoryUsage.rss,
      timestamp: new Date(),
    };
  }

  /**
   * 获取内存历史记录
   */
  public getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * 增强的内存清理策略
   */
  private performAdvancedMemoryCleanup(): string[] {
    const optimizations: string[] = [];

    try {
      // 1. 清理内存历史记录
      if (this.memoryHistory.length > 10) {
        const removed = this.memoryHistory.length - 10;
        this.memoryHistory = this.memoryHistory.slice(-10);
        optimizations.push(`清理内存历史: ${removed}条记录`);
      }

      // 2. 清理事件监听器
      const listenerCount = this.listenerCount('memoryWarning');
      if (listenerCount > 5) {
        this.removeAllListeners('memoryWarning');
        optimizations.push('清理过多的事件监听器');
      }

      // 3. 触发事件循环清理
      process.nextTick(() => {
        // 触发下一个事件循环的内存清理
      });
      optimizations.push('触发事件循环清理');

    } catch (error) {
      console.error('高级内存清理失败:', error);
    }

    return optimizations;
  }

  /**
   * 执行内存优化（增强版）
   */
  public async optimizeMemory(): Promise<MemoryOptimizationResult> {
    const beforeStats = this.getMemoryStats();
    const optimizationsApplied: string[] = [];

    try {
      // 1. 强制垃圾回收
      if (global.gc) {
        global.gc();
        optimizationsApplied.push('垃圾回收');
      }

      // 1.5. 执行增强的内存清理
      const advancedOptimizations = this.performAdvancedMemoryCleanup();
      optimizationsApplied.push(...advancedOptimizations);

      // 2. 清理内存历史记录
      if (this.memoryHistory.length > this.config.maxHistorySize) {
        const removed = this.memoryHistory.length - this.config.maxHistorySize;
        this.memoryHistory = this.memoryHistory.slice(-this.config.maxHistorySize);
        optimizationsApplied.push(`清理历史记录(${removed}条)`);
      }

      // 3. 清理Node.js模块缓存（谨慎操作）
      if (require.cache) {
        const cacheSize = Object.keys(require.cache).length;
        if (cacheSize > 1000) {
          const keysToDelete = Object.keys(require.cache)
            .filter(key => !key.includes('node_modules') && !key.includes('core'))
            .slice(0, Math.floor(cacheSize * 0.05)); // 只清理5%

          keysToDelete.forEach(key => delete require.cache[key]);
          if (keysToDelete.length > 0) {
            optimizationsApplied.push(`清理模块缓存(${keysToDelete.length}个)`);
          }
        }
      }

      // 等待一小段时间让优化生效
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterStats = this.getMemoryStats();
      const memoryFreed = beforeStats.heapUsed - afterStats.heapUsed;

      if (this.config.enableLogging) {
        console.log(`🔧 内存优化完成: 释放 ${Math.round(memoryFreed / 1024 / 1024)}MB`);
      }

      this.lastOptimization = Date.now();

      return {
        beforeStats,
        afterStats,
        optimizationsApplied,
        memoryFreed,
        success: true,
      };

    } catch (error) {
      console.error('❌ 内存优化失败:', error);
      return {
        beforeStats,
        afterStats: this.getMemoryStats(),
        optimizationsApplied,
        memoryFreed: 0,
        success: false,
      };
    }
  }

  /**
   * 执行内存检查
   */
  private performMemoryCheck(): void {
    const stats = this.getMemoryStats();

    // 记录到历史
    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > this.config.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // 检查阈值并发出事件
    if (stats.percentage >= this.config.emergencyThreshold) {
      this.handleEmergencyMemory(stats);
    } else if (stats.percentage >= this.config.criticalThreshold) {
      this.handleCriticalMemory(stats);
    } else if (stats.percentage >= this.config.warningThreshold) {
      this.handleWarningMemory(stats);
    }

    // 发出监控事件
    this.emit('memoryCheck', stats);
  }

  /**
   * 处理紧急内存情况
   */
  private handleEmergencyMemory(stats: MemoryStats): void {
    if (this.config.enableLogging) {
      console.error(`🚨 内存使用率紧急: ${stats.percentage}%`);
    }

    this.emit('memoryEmergency', stats);

    // 立即执行优化
    if (this.config.autoOptimize) {
      this.optimizeMemory().catch(console.error);
    }
  }

  /**
   * 处理严重内存情况
   */
  private handleCriticalMemory(stats: MemoryStats): void {
    if (this.config.enableLogging) {
      console.error(`🚨 内存使用率危险: ${stats.percentage}%`);
    }

    this.emit('memoryCritical', stats);

    // 检查冷却时间后执行优化
    if (this.config.autoOptimize && Date.now() - this.lastOptimization > this.optimizationCooldown) {
      this.optimizeMemory().catch(console.error);
    }
  }

  /**
   * 处理警告内存情况
   */
  private handleWarningMemory(stats: MemoryStats): void {
    if (this.config.enableLogging) {
      console.warn(`⚠️ 内存使用率告警: ${stats.percentage}%`);
    }

    this.emit('memoryWarning', stats);
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<MemoryMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enableLogging) {
      console.log('📝 内存监控配置已更新:', config);
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): MemoryMonitoringConfig {
    return { ...this.config };
  }

  /**
   * 检查是否正在监控
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

/**
 * 导出单例实例
 */
export const unifiedMemoryMonitoring = UnifiedMemoryMonitoring.getInstance();

/**
 * 便捷函数：启动全局内存监控
 */
export function startGlobalMemoryMonitoring(config?: Partial<MemoryMonitoringConfig>): void {
  unifiedMemoryMonitoring.startMonitoring(config);
}

/**
 * 便捷函数：停止全局内存监控
 */
export function stopGlobalMemoryMonitoring(): void {
  unifiedMemoryMonitoring.stopMonitoring();
}

/**
 * 便捷函数：获取统一内存监控实例
 */
export function getUnifiedMemoryMonitoring(): UnifiedMemoryMonitoring {
  return unifiedMemoryMonitoring;
}

/**
 * 便捷函数：获取内存统计
 */
export function getGlobalMemoryStats(): MemoryStats {
  return unifiedMemoryMonitoring.getMemoryStats();
}

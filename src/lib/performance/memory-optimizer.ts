/**
 * @fileoverview 内存优化器
 * @description 统一管理内存使用，防止内存泄漏
 * @author Augment AI
 * @date 2025-07-01
 * @version 1.0.0
 */

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  percentage: number;
  rss: number;
  external: number;
}

interface OptimizationResult {
  beforeOptimization: MemoryStats;
  afterOptimization: MemoryStats;
  memoryFreed: number;
  optimizationsApplied: string[];
}

/**
 * 全局内存优化器
 */
export class MemoryOptimizer {
  private static instance: MemoryOptimizer | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private optimizationHistory: OptimizationResult[] = [];

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * 获取当前内存统计
   */
  public getMemoryStats(): MemoryStats {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
    };
  }

  /**
   * 强制垃圾回收
   */
  public forceGarbageCollection(): boolean {
    if (global.gc) {
      const beforeStats = this.getMemoryStats();
      
      // 执行多次垃圾回收
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
      
      const afterStats = this.getMemoryStats();
      const memoryFreed = beforeStats.heapUsed - afterStats.heapUsed;
      
      console.log(`🧹 垃圾回收完成，释放内存: ${(memoryFreed / 1024 / 1024).toFixed(2)}MB`);
      return true;
    }
    
    console.warn('⚠️ 垃圾回收不可用，请使用 --expose-gc 启动Node.js');
    return false;
  }

  /**
   * 执行内存优化
   */
  public optimize(): OptimizationResult {
    const beforeStats = this.getMemoryStats();
    const optimizationsApplied: string[] = [];

    // 1. 强制垃圾回收
    if (this.forceGarbageCollection()) {
      optimizationsApplied.push('垃圾回收');
    }

    // 2. 清理Node.js内部缓存
    if (require.cache) {
      const cacheSize = Object.keys(require.cache).length;
      if (cacheSize > 1000) {
        // 清理部分缓存（保留核心模块）
        const keysToDelete = Object.keys(require.cache)
          .filter(key => !key.includes('node_modules'))
          .slice(0, Math.floor(cacheSize * 0.1));
        
        keysToDelete.forEach(key => delete require.cache[key]);
        optimizationsApplied.push(`清理模块缓存(${keysToDelete.length}个)`);
      }
    }

    // 3. 清理定时器（如果有泄漏的定时器）
    const activeHandles = (process as any)._getActiveHandles?.() || [];
    const activeRequests = (process as any)._getActiveRequests?.() || [];
    
    if (activeHandles.length > 100) {
      console.warn(`⚠️ 检测到大量活跃句柄: ${activeHandles.length}`);
      optimizationsApplied.push(`检测到${activeHandles.length}个活跃句柄`);
    }

    const afterStats = this.getMemoryStats();
    const memoryFreed = beforeStats.heapUsed - afterStats.heapUsed;

    const result: OptimizationResult = {
      beforeOptimization: beforeStats,
      afterOptimization: afterStats,
      memoryFreed,
      optimizationsApplied,
    };

    this.optimizationHistory.push(result);
    
    // 只保留最近10次优化记录
    if (this.optimizationHistory.length > 10) {
      this.optimizationHistory = this.optimizationHistory.slice(-10);
    }

    return result;
  }

  /**
   * 启动内存监控
   */
  public startMonitoring(options: {
    interval?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    autoOptimize?: boolean;
  } = {}): void {
    if (this.isMonitoring) {
      console.log('📊 内存监控已在运行');
      return;
    }

    const {
      interval = 30000, // 30秒
      warningThreshold = 85,
      criticalThreshold = 95,
      autoOptimize = true,
    } = options;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.percentage > criticalThreshold) {
        console.error(`🚨 内存使用率危险: ${stats.percentage.toFixed(2)}%`);
        if (autoOptimize) {
          console.log('🔧 自动执行内存优化...');
          this.optimize();
        }
      } else if (stats.percentage > warningThreshold) {
        console.warn(`⚠️ 内存使用率告警: ${stats.percentage.toFixed(2)}%`);
      }
    }, interval);

    console.log(`📊 内存监控已启动，检查间隔: ${interval}ms`);
  }

  /**
   * 停止内存监控
   */
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('📊 内存监控已停止');
    }
  }

  /**
   * 获取优化历史
   */
  public getOptimizationHistory(): OptimizationResult[] {
    return [...this.optimizationHistory];
  }

  /**
   * 生成内存报告
   */
  public generateReport(): string {
    const stats = this.getMemoryStats();
    const history = this.getOptimizationHistory();
    
    let report = `📊 内存使用报告\n`;
    report += `当前内存使用: ${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(stats.heapTotal / 1024 / 1024).toFixed(2)}MB (${stats.percentage.toFixed(2)}%)\n`;
    report += `RSS内存: ${(stats.rss / 1024 / 1024).toFixed(2)}MB\n`;
    report += `外部内存: ${(stats.external / 1024 / 1024).toFixed(2)}MB\n`;
    
    if (history.length > 0) {
      const totalFreed = history.reduce((sum, h) => sum + h.memoryFreed, 0);
      report += `\n🧹 优化历史:\n`;
      report += `总计优化次数: ${history.length}\n`;
      report += `总计释放内存: ${(totalFreed / 1024 / 1024).toFixed(2)}MB\n`;
    }
    
    return report;
  }
}

// 导出全局实例
export const memoryOptimizer = MemoryOptimizer.getInstance();

// 设置进程监听器限制，防止内存泄漏
process.setMaxListeners(15);

// 内存监控现在由全局服务管理器统一管理，不在模块级别自动启动
// 如果需要启动监控，应该通过全局服务管理器调用

// 进程退出时清理
const cleanup = () => {
  memoryOptimizer.stopMonitoring();
  console.log('🧹 内存优化器已清理');
};

process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);
process.once('exit', cleanup);

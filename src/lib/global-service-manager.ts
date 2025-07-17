/**
 * @fileoverview 全局服务管理器 - 统一初始化锁机制
 * @description 统一管理所有服务的初始化，防止重复初始化，提供全局协调机制
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/app-initializer: 应用初始化器
 * - @/lib/server-init: 服务器初始化器
 *
 * @changelog
 * - 2025-07-08: 初始版本创建，实现全局服务初始化锁机制
 */

import {
  initializeApp,
  resetInitialization,
  getCacheSystemStatus
} from './app-initializer';

import {
  initializeServer,
  isServerReady,
  resetServerInitialization
} from './server-init';

/**
 * 全局服务状态枚举
 */
enum GlobalServiceState {
  NOT_STARTED = 'NOT_STARTED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR',
  DEGRADED = 'DEGRADED'
}

/**
 * 全局服务管理器状态
 */
interface GlobalServiceManagerState {
  state: GlobalServiceState;
  isInitialized: boolean;
  isInitializing: boolean;
  initializationPromise: Promise<void> | null;
  lastInitializationTime: number | null;
  lastHealthCheckTime: number | null;
  initializationCount: number;
  errors: Error[];
  managerId: string | null;
}

/**
 * 全局服务管理器实例
 */
class GlobalServiceManager {
  private state: GlobalServiceManagerState = {
    state: GlobalServiceState.NOT_STARTED,
    isInitialized: false,
    isInitializing: false,
    initializationPromise: null,
    lastInitializationTime: null,
    lastHealthCheckTime: null,
    initializationCount: 0,
    errors: [],
    managerId: null,
  };

  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1分钟
  private healthCheckTimer: NodeJS.Timeout | null = null;

  /**
   * 生成管理器ID
   */
  private generateManagerId(): string {
    return `gsm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    // 只在服务器端执行
    if (typeof window !== 'undefined') {
      return;
    }

    // 如果已经初始化完成，直接返回
    if (this.state.isInitialized) {
      console.log('✅ 全局服务已初始化，跳过重复初始化');
      return;
    }

    // 如果正在初始化，等待现有的初始化完成
    if (this.state.isInitializing && this.state.initializationPromise) {
      console.log(`⏳ 全局服务正在初始化中，等待完成... (ID: ${this.state.managerId})`);
      return this.state.initializationPromise;
    }

    // 开始新的初始化流程
    const managerId = this.generateManagerId();
    this.state.isInitializing = true;
    this.state.state = GlobalServiceState.INITIALIZING;
    this.state.managerId = managerId;
    this.state.initializationCount++;
    this.state.errors = [];

    console.log(`🌟 开始全局服务初始化... (ID: ${managerId}, 尝试: ${this.state.initializationCount})`);

    // 创建初始化Promise
    this.state.initializationPromise = this.performInitialization(managerId);

    try {
      await this.state.initializationPromise;
    } catch (error) {
      this.state.errors.push(error as Error);
      this.state.state = GlobalServiceState.ERROR;
      console.error(`❌ 全局服务初始化失败 (ID: ${managerId}):`, error);
      this.resetInitializationState();
      throw error;
    }
  }

  /**
   * 执行实际的初始化操作
   */
  private async performInitialization(managerId: string): Promise<void> {
    try {
      console.log(`📋 开始执行全局服务初始化步骤... (ID: ${managerId})`);

      // 1. 初始化服务器端服务
      console.log(`🔧 初始化服务器端服务... (ID: ${managerId})`);
      await initializeServer();
      console.log(`✅ 服务器端服务初始化完成 (ID: ${managerId})`);

      // 2. 验证所有服务状态
      console.log(`🏥 验证服务健康状态... (ID: ${managerId})`);
      await this.validateServicesHealth(managerId);
      console.log(`✅ 服务健康状态验证完成 (ID: ${managerId})`);

      // 标记初始化完成
      this.state.isInitialized = true;
      this.state.isInitializing = false;
      this.state.state = GlobalServiceState.READY;
      this.state.lastInitializationTime = Date.now();

      // 启动健康检查定时器
      this.startHealthCheckTimer();

      const duration = Date.now() - (this.state.lastInitializationTime || 0);
      console.log(`🎉 全局服务初始化完成 (ID: ${managerId}, 耗时: ${duration}ms)`);

    } catch (error) {
      this.state.state = GlobalServiceState.ERROR;
      console.error(`❌ 全局服务初始化失败 (ID: ${managerId}):`, error);
      throw error;
    }
  }

  /**
   * 验证所有服务健康状态（简化版本）
   */
  private async validateServicesHealth(managerId: string): Promise<void> {
    const errors: string[] = [];

    // 检查服务器初始化状态
    try {
      const { isServerReady } = await import('./server-init');
      if (!isServerReady()) {
        errors.push('服务器未正确初始化');
      }
    } catch (error) {
      errors.push(`服务器状态检查失败: ${error}`);
    }

    // 检查缓存系统状态
    try {
      const { getCacheSystemStatus } = await import('./app-initializer');
      const cacheStatus = getCacheSystemStatus();
      if (!cacheStatus.isConnected) {
        console.warn(`缓存系统未连接 (ID: ${managerId})`);
        // 缓存未连接不算致命错误，只记录警告
      }
    } catch (error) {
      console.warn(`缓存状态检查异常 (ID: ${managerId}):`, error);
    }

    if (errors.length > 0) {
      const errorMessage = `服务健康检查失败 (ID: ${managerId}): ${errors.join(', ')}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.warn('定期健康检查失败:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<void> {
    if (typeof window !== 'undefined') {
      return;
    }

    this.state.lastHealthCheckTime = Date.now();

    try {
      // 检查服务器初始化状态
      const { isServerReady } = await import('./server-init');
      const serverHealthy = isServerReady();

      if (!serverHealthy) {
        this.state.state = GlobalServiceState.DEGRADED;
        console.warn('⚠️ 检测到服务器未正确初始化');
      } else if (this.state.state === GlobalServiceState.DEGRADED) {
        this.state.state = GlobalServiceState.READY;
        console.log('✅ 服务健康状态已恢复');
      }

    } catch (error) {
      this.state.errors.push(error as Error);
      this.state.state = GlobalServiceState.ERROR;
      console.error('❌ 健康检查失败:', error);
    }
  }

  /**
   * 重置初始化状态
   */
  private resetInitializationState(): void {
    this.state.isInitializing = false;
    this.state.initializationPromise = null;
    this.state.managerId = null;
  }

  /**
   * 获取全局服务状态（简化版本）
   */
  getStatus() {
    return {
      globalState: this.state.state,
      isInitialized: this.state.isInitialized,
      isInitializing: this.state.isInitializing,
      managerId: this.state.managerId,
      initializationCount: this.state.initializationCount,
      lastInitializationTime: this.state.lastInitializationTime,
      lastHealthCheckTime: this.state.lastHealthCheckTime,
      errors: this.state.errors.map(e => e.message),
      // 注意：详细的app和server状态需要通过异步方法获取
      appStatus: 'use getDetailedStatus() for detailed status',
      serverStatus: 'use getDetailedStatus() for detailed status',
    };
  }

  /**
   * 获取详细的全局服务状态（简化版本）
   */
  async getDetailedStatus() {
    try {
      const { getCacheSystemStatus } = await import('./app-initializer');
      const { isServerReady } = await import('./server-init');

      const cacheStatus = getCacheSystemStatus();
      const serverReady = isServerReady();

      return {
        globalState: this.state.state,
        isInitialized: this.state.isInitialized,
        isInitializing: this.state.isInitializing,
        managerId: this.state.managerId,
        initializationCount: this.state.initializationCount,
        lastInitializationTime: this.state.lastInitializationTime,
        lastHealthCheckTime: this.state.lastHealthCheckTime,
        errors: this.state.errors.map(e => e.message),
        cacheStatus,
        serverReady,
      };
    } catch (_error) {
      return {
        ...this.getStatus(),
        cacheStatus: { error: 'Failed to load cache status' },
        serverReady: false,
      };
    }
  }

  /**
   * 强制重新初始化所有服务
   */
  async forceReinitialize(): Promise<void> {
    console.log('🔄 强制重新初始化所有服务...');

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 重置状态
    this.state.isInitialized = false;
    this.state.state = GlobalServiceState.NOT_STARTED;
    this.resetInitializationState();

    // 重新初始化
    return this.initialize();
  }

  /**
   * 停止所有服务
   */
  shutdown(): void {
    console.log('🛑 停止全局服务管理器...');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.state.isInitialized = false;
    this.state.state = GlobalServiceState.NOT_STARTED;
    this.resetInitializationState();
  }
}

/**
 * 全局服务管理器实例
 */
export const globalServiceManager = new GlobalServiceManager();

/**
 * 便捷的初始化函数
 */
export async function initializeGlobalServices(): Promise<void> {
  return globalServiceManager.initialize();
}

/**
 * 获取全局服务状态
 */
export function getGlobalServiceStatus() {
  return globalServiceManager.getStatus();
}

/**
 * 检查全局服务是否就绪
 */
export function isGlobalServiceReady(): boolean {
  const status = globalServiceManager.getStatus();
  return status.isInitialized && status.globalState === GlobalServiceState.READY;
}

// 注意：不在模块导入时自动执行初始化
// 全局服务初始化将由应用的特定入口点手动调用
// 这确保了初始化只在应用真正启动时执行一次，而不是在每次模块导入时执行

/**
 * @fileoverview 监控系统初始化
 * @description 初始化所有监控组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { initializePerformanceMonitoring } from '@/lib/services/performance-monitoring-service';

/**
 * 监控系统配置
 */
export interface MonitoringSystemConfig {
  /** 性能监控配置 */
  performance: {
    enabled: boolean;
    slowQueryThreshold: number;
    maxMetricsSize: number;
    reportInterval: number;
    alertsEnabled: boolean;
  };
  /** 环境特定配置 */
  environment: 'development' | 'test' | 'production';
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MonitoringSystemConfig = {
  performance: {
    enabled: process.env.NODE_ENV === 'production',
    slowQueryThreshold: 1000,
    maxMetricsSize: 10000,
    reportInterval: 24,
    alertsEnabled: true,
  },
  environment: (process.env.NODE_ENV as any) || 'development',
};

/**
 * 环境特定配置
 */
const ENVIRONMENT_CONFIGS: Record<string, Partial<MonitoringSystemConfig>> = {
  development: {
    performance: {
      enabled: true,
      slowQueryThreshold: 2000, // 提高到2秒，减少首次请求的误报
      maxMetricsSize: 5000,
      reportInterval: 1, // 1小时
      alertsEnabled: false,
    },
  },
  test: {
    performance: {
      enabled: false,
      slowQueryThreshold: 100,
      maxMetricsSize: 1000,
      reportInterval: 0.1, // 6分钟
      alertsEnabled: false,
    },
  },
  production: {
    performance: {
      enabled: true,
      slowQueryThreshold: 1000,
      maxMetricsSize: 20000,
      reportInterval: 24, // 24小时
      alertsEnabled: true,
    },
  },
};

/**
 * 监控系统初始化器
 */
export class MonitoringSystemInitializer {
  private static initialized = false;

  /**
   * 初始化监控系统
   */
  static initialize(customConfig: Partial<MonitoringSystemConfig> = {}): void {
    if (this.initialized) {
      console.warn('监控系统已经初始化，跳过重复初始化');
      return;
    }

    const environment = process.env.NODE_ENV || 'development';
    const envConfig = ENVIRONMENT_CONFIGS[environment] || {};

    // 合并配置
    const finalConfig: MonitoringSystemConfig = {
      ...DEFAULT_CONFIG,
      ...envConfig,
      ...customConfig,
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...envConfig.performance,
        ...customConfig.performance,
      },
    };

    console.log(`🔧 初始化监控系统 [${environment}]...`);

    try {
      // 初始化性能监控
      this.initializePerformanceMonitoring(finalConfig.performance);

      // 设置进程退出处理
      this.setupProcessHandlers();

      this.initialized = true;
      console.log('✅ 监控系统初始化完成');

    } catch (error) {
      console.error('❌ 监控系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化性能监控
   */
  private static initializePerformanceMonitoring(config: MonitoringSystemConfig['performance']): void {
    if (!config.enabled) {
      console.log('⏸️ 性能监控已禁用');
      return;
    }

    initializePerformanceMonitoring(config);
    console.log('🔍 性能监控已启用');
  }

  /**
   * 设置进程处理器
   */
  private static setupProcessHandlers(): void {
    // 优雅关闭处理
    const gracefulShutdown = (signal: string) => {
      console.log(`收到 ${signal} 信号，正在关闭监控系统...`);

      try {
        // 这里可以添加清理逻辑
        console.log('监控系统已安全关闭');
        process.exit(0);
      } catch (error) {
        console.error('监控系统关闭时出错:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      // 不要立即退出，让监控系统记录这个错误
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason, 'at:', promise);
      // 不要立即退出，让监控系统记录这个错误
    });
  }

  /**
   * 检查初始化状态
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 重置初始化状态（主要用于测试）
   */
  static reset(): void {
    this.initialized = false;
  }
}

/**
 * 快速初始化函数
 */
export function initializeMonitoring(config: Partial<MonitoringSystemConfig> = {}): void {
  MonitoringSystemInitializer.initialize(config);
}

/**
 * 环境特定的初始化函数
 */
export function initializeForEnvironment(env: 'development' | 'test' | 'production'): void {
  const config = ENVIRONMENT_CONFIGS[env] || {};
  MonitoringSystemInitializer.initialize(config);
}

/**
 * 开发环境初始化
 */
export function initializeDevelopmentMonitoring(): void {
  initializeForEnvironment('development');
}

/**
 * 生产环境初始化
 */
export function initializeProductionMonitoring(): void {
  initializeForEnvironment('production');
}

/**
 * 测试环境初始化
 */
export function initializeTestMonitoring(): void {
  initializeForEnvironment('test');
}

/**
 * 监控健康检查
 */
export function checkMonitoringHealth(): {
  status: 'healthy' | 'unhealthy';
  components: {
    performance: boolean;
    initialized: boolean;
  };
  timestamp: string;
} {
  return {
    status: MonitoringSystemInitializer.isInitialized() ? 'healthy' : 'unhealthy',
    components: {
      performance: true, // TODO: 实际检查性能监控状态
      initialized: MonitoringSystemInitializer.isInitialized(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取监控系统信息
 */
export function getMonitoringInfo(): {
  version: string;
  environment: string;
  initialized: boolean;
  uptime: number;
  components: string[];
} {
  return {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    initialized: MonitoringSystemInitializer.isInitialized(),
    uptime: process.uptime(),
    components: ['performance-monitoring'],
  };
}

// 自动初始化（如果在生产环境）
if (process.env.NODE_ENV === 'production' && !process.env.COSEREEDEN_DISABLE_AUTO_MONITORING) {
  // 延迟初始化，确保其他系统组件已加载
  setTimeout(() => {
    try {
      initializeProductionMonitoring();
    } catch (error) {
      console.error('自动初始化监控系统失败:', error);
    }
  }, 1000);
}

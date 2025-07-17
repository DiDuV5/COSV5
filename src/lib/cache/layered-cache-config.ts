/**
 * @fileoverview 分层缓存配置管理
 * @description 管理分层缓存系统的配置和默认值
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { LayeredCacheConfig, LayeredCacheStats } from './layered-cache-types';
import { CacheLoggerConfig } from './optimized-cache-logger';

/**
 * 默认缓存配置
 */
export const DEFAULT_LAYERED_CACHE_CONFIG: LayeredCacheConfig = {
  l1Config: {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5分钟
    updateAgeOnGet: true
  },
  l2Config: {
    defaultTTL: 300, // 5分钟
    enableCompression: true,
    keyPrefix: 'layered'
  },
  warmupConfig: {
    enabled: true,
    batchSize: 10,
    concurrency: 5
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000 // 1分钟
  },
  logging: {
    compactMode: true,
    minOutputInterval: 30000,
    onlyLogWhenActive: true,
    hitRateChangeThreshold: 5,
    enableDebugLogs: false,
    showZeroStats: false,
  }
};

/**
 * 缓存配置管理器
 */
export class LayeredCacheConfigManager {
  /**
   * 合并配置
   */
  static mergeConfig(config?: Partial<LayeredCacheConfig>): LayeredCacheConfig {
    if (!config) {
      return { ...DEFAULT_LAYERED_CACHE_CONFIG };
    }

    return {
      ...DEFAULT_LAYERED_CACHE_CONFIG,
      ...config,
      l1Config: {
        ...DEFAULT_LAYERED_CACHE_CONFIG.l1Config,
        ...config.l1Config
      },
      l2Config: {
        ...DEFAULT_LAYERED_CACHE_CONFIG.l2Config,
        ...config.l2Config
      },
      warmupConfig: {
        ...DEFAULT_LAYERED_CACHE_CONFIG.warmupConfig,
        ...config.warmupConfig
      },
      monitoring: {
        ...DEFAULT_LAYERED_CACHE_CONFIG.monitoring,
        ...config.monitoring
      }
    };
  }

  /**
   * 初始化统计信息
   */
  static initializeStats(): LayeredCacheStats {
    return {
      l1Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      overall: { totalRequests: 0, totalHits: 0, overallHitRate: 0, avgResponseTime: 0 }
    };
  }

  /**
   * 验证配置
   */
  static validateConfig(config: LayeredCacheConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证L1配置
    if (config.l1Config.maxSize <= 0) {
      errors.push('L1缓存最大大小必须大于0');
    }
    if (config.l1Config.ttl <= 0) {
      errors.push('L1缓存TTL必须大于0');
    }

    // 验证L2配置
    if (config.l2Config.defaultTTL <= 0) {
      errors.push('L2缓存默认TTL必须大于0');
    }
    if (!config.l2Config.keyPrefix || config.l2Config.keyPrefix.trim() === '') {
      errors.push('L2缓存键前缀不能为空');
    }

    // 验证预热配置
    if (config.warmupConfig.batchSize <= 0) {
      errors.push('预热批次大小必须大于0');
    }
    if (config.warmupConfig.concurrency <= 0) {
      errors.push('预热并发数必须大于0');
    }

    // 验证监控配置
    if (config.monitoring.metricsInterval <= 0) {
      errors.push('监控指标间隔必须大于0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取环境特定配置
   */
  static getEnvironmentConfig(): Partial<LayeredCacheConfig> {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
      case 'production':
        return {
          l1Config: {
            maxSize: 5000,
            ttl: 10 * 60 * 1000, // 10分钟
            updateAgeOnGet: true
          },
          l2Config: {
            defaultTTL: 600, // 10分钟
            enableCompression: true,
            keyPrefix: 'prod_layered'
          },
          warmupConfig: {
            enabled: true,
            batchSize: 20,
            concurrency: 10
          },
          monitoring: {
            enabled: true,
            metricsInterval: 30000 // 30秒
          },
          logging: {
            compactMode: true,
            minOutputInterval: 60000, // 1分钟
            onlyLogWhenActive: true,
            hitRateChangeThreshold: 10, // 10%变化才输出
            enableDebugLogs: false,
            showZeroStats: false,
          }
        };

      case 'test':
        return {
          l1Config: {
            maxSize: 100,
            ttl: 1 * 60 * 1000, // 1分钟
            updateAgeOnGet: false
          },
          l2Config: {
            defaultTTL: 60, // 1分钟
            enableCompression: false,
            keyPrefix: 'test_layered'
          },
          warmupConfig: {
            enabled: false,
            batchSize: 5,
            concurrency: 2
          },
          monitoring: {
            enabled: false,
            metricsInterval: 10000 // 10秒
          },
          logging: {
            compactMode: true,
            minOutputInterval: 0, // 测试环境不限制
            onlyLogWhenActive: false,
            hitRateChangeThreshold: 0, // 测试环境输出所有变化
            enableDebugLogs: true,
            showZeroStats: true,
          }
        };

      default: // development
        return {
          ...DEFAULT_LAYERED_CACHE_CONFIG,
          monitoring: {
            enabled: false, // 开发环境临时禁用监控，避免性能问题
            metricsInterval: 300000 // 5分钟间隔
          },
          logging: {
            compactMode: true,
            minOutputInterval: 30000, // 30秒
            onlyLogWhenActive: true,
            hitRateChangeThreshold: 5, // 5%变化才输出
            enableDebugLogs: false,
            showZeroStats: false,
          }
        };
    }
  }

  /**
   * 创建优化配置
   */
  static createOptimizedConfig(
    targetHitRate: number = 85,
    maxMemoryMB: number = 100
  ): Partial<LayeredCacheConfig> {
    // 根据目标命中率和内存限制计算优化配置
    const estimatedItemSize = 1024; // 1KB per item
    const maxItems = Math.floor((maxMemoryMB * 1024 * 1024) / estimatedItemSize);

    // 根据目标命中率调整TTL
    const baseTTL = targetHitRate >= 90 ? 15 * 60 * 1000 :
                   targetHitRate >= 80 ? 10 * 60 * 1000 :
                   5 * 60 * 1000;

    return {
      l1Config: {
        maxSize: Math.min(maxItems, 10000),
        ttl: baseTTL,
        updateAgeOnGet: true
      },
      l2Config: {
        defaultTTL: Math.floor(baseTTL / 1000) * 2, // L2 TTL是L1的2倍
        enableCompression: maxMemoryMB < 200, // 内存紧张时启用压缩
        keyPrefix: 'optimized_layered'
      },
      warmupConfig: {
        enabled: targetHitRate >= 85,
        batchSize: Math.min(Math.floor(maxItems / 100), 50),
        concurrency: Math.min(Math.floor(maxItems / 200), 20)
      }
    };
  }
}

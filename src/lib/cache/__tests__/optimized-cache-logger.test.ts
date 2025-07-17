/**
 * @fileoverview 优化缓存日志管理器测试
 * @description 测试缓存日志输出优化功能
 */

import { OptimizedCacheLogger, DEFAULT_CACHE_LOGGER_CONFIG } from '../optimized-cache-logger';
import { LayeredCacheStats } from '../layered-cache-types';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

describe('OptimizedCacheLogger', () => {
  let logger: OptimizedCacheLogger;
  let mockStats: LayeredCacheStats;

  beforeEach(() => {
    logger = new OptimizedCacheLogger();
    mockStats = {
      l1Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      overall: { totalRequests: 0, totalHits: 0, overallHitRate: 0, avgResponseTime: 0 }
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('logCacheMetrics', () => {
    it('应该在简洁模式下输出单行格式', () => {
      const stats: LayeredCacheStats = {
        l1Stats: { hits: 10, misses: 2, hitRate: 83.3, avgResponseTime: 0.5 },
        l2Stats: { hits: 5, misses: 3, hitRate: 62.5, avgResponseTime: 5.2 },
        l3Stats: { hits: 2, misses: 1, hitRate: 66.7, avgResponseTime: 25.1 },
        overall: { totalRequests: 23, totalHits: 17, overallHitRate: 73.9, avgResponseTime: 8.3 }
      };

      logger.logCacheMetrics(stats);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🚀 缓存统计: L1(10/2/83%) L2(5/3/63%) L3(2/1/67%) 总计(23req/8.3ms/73.9%)')
      );
    });

    it('应该跳过零值统计输出', () => {
      const config = { ...DEFAULT_CACHE_LOGGER_CONFIG, showZeroStats: false };
      logger = new OptimizedCacheLogger(config);

      logger.logCacheMetrics(mockStats);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('应该在有活动时输出统计', () => {
      const config = { ...DEFAULT_CACHE_LOGGER_CONFIG, onlyLogWhenActive: true };
      logger = new OptimizedCacheLogger(config);

      const activeStats: LayeredCacheStats = {
        ...mockStats,
        overall: { totalRequests: 10, totalHits: 8, overallHitRate: 80, avgResponseTime: 5 }
      };

      logger.logCacheMetrics(activeStats);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('应该在命中率变化超过阈值时输出', () => {
      const config = {
        ...DEFAULT_CACHE_LOGGER_CONFIG,
        hitRateChangeThreshold: 5,
        minOutputInterval: 0 // 禁用时间间隔限制
      };
      logger = new OptimizedCacheLogger(config);

      // 第一次调用
      const stats1: LayeredCacheStats = {
        l1Stats: { hits: 8, misses: 2, hitRate: 80, avgResponseTime: 1 },
        l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        overall: { totalRequests: 10, totalHits: 8, overallHitRate: 80, avgResponseTime: 5 }
      };
      logger.logCacheMetrics(stats1);

      jest.clearAllMocks();

      // 第二次调用，命中率变化小于阈值，且请求数变化小
      const stats2: LayeredCacheStats = {
        l1Stats: { hits: 10, misses: 2, hitRate: 83, avgResponseTime: 1 },
        l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        overall: { totalRequests: 12, totalHits: 10, overallHitRate: 83, avgResponseTime: 5 }
      };
      logger.logCacheMetrics(stats2);

      expect(mockConsoleLog).not.toHaveBeenCalled();

      // 第三次调用，命中率变化超过阈值
      const stats3: LayeredCacheStats = {
        l1Stats: { hits: 12, misses: 8, hitRate: 60, avgResponseTime: 1 },
        l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        overall: { totalRequests: 20, totalHits: 12, overallHitRate: 60, avgResponseTime: 5 }
      };
      logger.logCacheMetrics(stats3);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('应该输出性能警告', () => {
      const stats: LayeredCacheStats = {
        l1Stats: { hits: 10, misses: 40, hitRate: 20, avgResponseTime: 0.5 },
        l2Stats: { hits: 5, misses: 3, hitRate: 62.5, avgResponseTime: 5.2 },
        l3Stats: { hits: 2, misses: 1, hitRate: 66.7, avgResponseTime: 25.1 },
        overall: { totalRequests: 150, totalHits: 50, overallHitRate: 33.3, avgResponseTime: 120 }
      };

      logger.logCacheMetrics(stats);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  缓存性能警告')
      );
    });
  });

  describe('logActivitySummary', () => {
    it('应该输出活动摘要', () => {
      const stats: LayeredCacheStats = {
        ...mockStats,
        overall: { totalRequests: 100, totalHits: 85, overallHitRate: 85, avgResponseTime: 10 }
      };

      logger.logActivitySummary(stats);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📈 缓存活动摘要: 100次请求, 85.0%命中率')
      );
    });

    it('应该跳过空统计的摘要', () => {
      logger.logActivitySummary(mockStats);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('logDebugInfo', () => {
    it('应该在启用调试模式时输出调试信息', () => {
      const config = { ...DEFAULT_CACHE_LOGGER_CONFIG, enableDebugLogs: true };
      logger = new OptimizedCacheLogger(config);

      logger.logDebugInfo('测试调试信息', { test: 'data' });

      expect(mockConsoleDebug).toHaveBeenCalledWith(
        '🔍 [缓存调试] 测试调试信息',
        { test: 'data' }
      );
    });

    it('应该在禁用调试模式时跳过调试信息', () => {
      const config = { ...DEFAULT_CACHE_LOGGER_CONFIG, enableDebugLogs: false };
      logger = new OptimizedCacheLogger(config);

      logger.logDebugInfo('测试调试信息');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe('配置管理', () => {
    it('应该正确更新配置', () => {
      const newConfig = { compactMode: false, enableDebugLogs: true };
      logger.updateConfig(newConfig);

      const config = logger.getConfig();
      expect(config.compactMode).toBe(false);
      expect(config.enableDebugLogs).toBe(true);
    });

    it('应该创建环境特定配置', () => {
      const prodConfig = OptimizedCacheLogger.createEnvironmentConfig('production');
      expect(prodConfig.minOutputInterval).toBe(60000);
      expect(prodConfig.hitRateChangeThreshold).toBe(10);

      const testConfig = OptimizedCacheLogger.createEnvironmentConfig('test');
      expect(testConfig.minOutputInterval).toBe(0);
      expect(testConfig.enableDebugLogs).toBe(true);
    });
  });

  describe('时间间隔控制', () => {
    it('应该遵守最小输出间隔', () => {
      const config = { ...DEFAULT_CACHE_LOGGER_CONFIG, minOutputInterval: 1000 };
      logger = new OptimizedCacheLogger(config);

      const stats: LayeredCacheStats = {
        ...mockStats,
        overall: { totalRequests: 10, totalHits: 8, overallHitRate: 80, avgResponseTime: 5 }
      };

      // 第一次调用
      logger.logCacheMetrics(stats);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // 立即第二次调用，应该被跳过
      logger.logCacheMetrics(stats);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('重置功能', () => {
    it('应该正确重置日志状态', () => {
      const stats: LayeredCacheStats = {
        ...mockStats,
        overall: { totalRequests: 10, totalHits: 8, overallHitRate: 80, avgResponseTime: 5 }
      };

      logger.logCacheMetrics(stats);
      logger.reset();

      // 重置后应该能立即输出
      logger.logCacheMetrics(stats);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });
  });
});

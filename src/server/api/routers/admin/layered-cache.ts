/**
 * @fileoverview 三级缓存架构管理API路由
 * @description 提供三级缓存统计数据获取和管理功能
 * @author Augment AI
 * @date 2025-07-07
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { layeredCacheStrategy } from "@/lib/cache/layered-cache-strategy";
import { redisCacheManager } from "@/lib/cache/redis-cache-manager";
import { queryOptimizer } from "@/lib/database/query-optimizer";

/**
 * 三级缓存管理路由
 */
export const layeredCacheRouter = createTRPCRouter({
  /**
   * 获取三级缓存统计数据
   */
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      try {
        // 获取分层缓存统计
        const layeredStats = layeredCacheStrategy.getStats();

        // 获取Redis缓存详细信息
        const redisStats = redisCacheManager.getStats();
        const redisDetailedInfo = await redisCacheManager.getDetailedInfo();

        // 获取数据库查询统计
        const dbStats = queryOptimizer.getStats();
        const dbCacheStats = queryOptimizer.getCacheStats();

        // 构建三级缓存统计数据
        const stats = {
          overall: {
            totalRequests: layeredStats.overall.totalRequests,
            totalHits: layeredStats.overall.totalHits,
            hitRate: layeredStats.overall.totalRequests > 0
              ? (layeredStats.overall.totalHits / layeredStats.overall.totalRequests) * 100
              : 0,
            avgResponseTime: calculateOverallResponseTime(layeredStats),
          },
          l1Stats: {
            hits: layeredStats.l1Stats.hits,
            misses: layeredStats.l1Stats.misses,
            hitRate: layeredStats.l1Stats.hits + layeredStats.l1Stats.misses > 0
              ? (layeredStats.l1Stats.hits / (layeredStats.l1Stats.hits + layeredStats.l1Stats.misses)) * 100
              : 0,
            avgResponseTime: layeredStats.l1Stats.avgResponseTime,
            size: layeredStats.l1Stats.size || 0,
            maxSize: layeredStats.l1Stats.maxSize || 1000,
          },
          l2Stats: {
            hits: redisStats.hits,
            misses: redisStats.misses,
            hitRate: redisStats.hitRate,
            avgResponseTime: redisStats.avgResponseTime,
            memoryUsage: redisDetailedInfo.memoryUsage || 0,
            keyCount: redisDetailedInfo.keyCount || 0,
          },
          l3Stats: {
            hits: dbCacheStats.cacheHits,
            misses: dbCacheStats.cacheMisses,
            hitRate: dbCacheStats.cacheHits + dbCacheStats.cacheMisses > 0
              ? (dbCacheStats.cacheHits / (dbCacheStats.cacheHits + dbCacheStats.cacheMisses)) * 100
              : 0,
            avgResponseTime: dbStats.averageQueryTime,
            slowQueries: dbStats.slowQueries,
            totalQueries: dbStats.totalQueries,
          },
          lastUpdated: new Date(),
        };

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        console.error('获取三级缓存统计失败:', error);
        throw TRPCErrorHandler.internalError(
          '获取三级缓存统计失败',
          { context: { error: error instanceof Error ? error.message : String(error) } }
        );
      }
    }),

  /**
   * 获取缓存性能历史数据
   */
  getPerformanceHistory: adminProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '6h', '24h', '7d']).default('1h'),
      level: z.enum(['L1', 'L2', 'L3', 'ALL']).default('ALL'),
    }))
    .query(async ({ input }) => {
      try {
        // 这里应该从时序数据库或历史记录中获取数据
        // 目前返回模拟数据，实际实现需要集成时序数据库
        const mockData = generateMockPerformanceHistory(input.timeRange, input.level);

        return {
          success: true,
          data: mockData,
        };
      } catch (error) {
        console.error('获取缓存性能历史失败:', error);
        throw TRPCErrorHandler.internalError(
          '获取缓存性能历史失败',
          { context: { error: error instanceof Error ? error.message : String(error) } }
        );
      }
    }),

  /**
   * 清理指定层级的缓存
   */
  clearCache: adminProcedure
    .input(z.object({
      level: z.enum(['L1', 'L2', 'L3', 'ALL']),
      pattern: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { level, pattern } = input;
        let clearedCount = 0;

        switch (level) {
          case 'L1':
            await layeredCacheStrategy.clearL1Cache();
            clearedCount = 1; // L1缓存清理成功
            break;

          case 'L2':
            if (pattern) {
              clearedCount = await redisCacheManager.deletePattern(pattern);
            } else {
              await redisCacheManager.flush();
              clearedCount = 1; // Redis缓存清理成功
            }
            break;

          case 'L3':
            await queryOptimizer.clearCache();
            clearedCount = 1; // 数据库缓存清理成功
            break;

          case 'ALL':
            await layeredCacheStrategy.flush();
            clearedCount = 3; // 所有层级清理成功
            break;
        }

        return {
          success: true,
          message: `${level}缓存清理成功`,
          clearedCount,
        };
      } catch (error) {
        console.error('缓存清理失败:', error);
        throw TRPCErrorHandler.internalError(
          '缓存清理失败',
          { context: { level: input.level, error: error instanceof Error ? error.message : String(error) } }
        );
      }
    }),

  /**
   * 执行缓存预热
   */
  warmupCache: adminProcedure
    .input(z.object({
      keys: z.array(z.string()),
      level: z.enum(['L1', 'L2', 'ALL']).default('ALL'),
    }))
    .mutation(async ({ input }) => {
      try {
        const { keys, level } = input;

        // 定义数据加载器
        const dataLoader = async (key: string) => {
          // 这里应该根据key的类型从相应的数据源加载数据
          // 目前返回模拟数据
          return { key, data: `cached_data_for_${key}`, timestamp: Date.now() };
        };

        if (level === 'ALL' || level === 'L1' || level === 'L2') {
          await layeredCacheStrategy.warmup(keys, dataLoader);
        }

        return {
          success: true,
          message: `${level}缓存预热完成`,
          warmedKeys: keys.length,
        };
      } catch (error) {
        console.error('缓存预热失败:', error);
        throw TRPCErrorHandler.internalError(
          '缓存预热失败',
          { context: { level: input.level, error: error instanceof Error ? error.message : String(error) } }
        );
      }
    }),

  /**
   * 获取缓存配置信息
   */
  getConfig: adminProcedure
    .query(async () => {
      try {
        const config = {
          l1Config: {
            maxSize: 1000,
            ttl: 300000, // 5分钟
            enabled: true,
          },
          l2Config: {
            host: process.env.COSEREEDEN_REDIS_HOST || 'localhost',
            port: parseInt(process.env.COSEREEDEN_REDIS_PORT || '6379'),
            enabled: redisCacheManager.isRedisConnected(),
            defaultTTL: 3600, // 1小时
          },
          l3Config: {
            enableCache: true,
            slowQueryThreshold: 1000,
            defaultCacheTTL: 300,
          },
          monitoring: {
            enabled: true,
            metricsInterval: 30000, // 30秒
          },
        };

        return {
          success: true,
          data: config,
        };
      } catch (error) {
        console.error('获取缓存配置失败:', error);
        throw TRPCErrorHandler.internalError(
          '获取缓存配置失败',
          { context: { error: error instanceof Error ? error.message : String(error) } }
        );
      }
    }),
});

/**
 * 计算整体平均响应时间
 */
function calculateOverallResponseTime(stats: any): number {
  const l1Weight = stats.l1Stats.hits;
  const l2Weight = stats.l2Stats.hits;
  const l3Weight = stats.l3Stats.hits;
  const totalWeight = l1Weight + l2Weight + l3Weight;

  if (totalWeight === 0) return 0;

  return (
    (stats.l1Stats.avgResponseTime * l1Weight +
     stats.l2Stats.avgResponseTime * l2Weight +
     stats.l3Stats.avgResponseTime * l3Weight) / totalWeight
  );
}

/**
 * 生成模拟性能历史数据
 */
function generateMockPerformanceHistory(timeRange: string, level: string) {
  const now = Date.now();
  const intervals = {
    '1h': { count: 60, interval: 60000 }, // 1分钟间隔
    '6h': { count: 72, interval: 300000 }, // 5分钟间隔
    '24h': { count: 96, interval: 900000 }, // 15分钟间隔
    '7d': { count: 168, interval: 3600000 }, // 1小时间隔
  };

  const config = intervals[timeRange as keyof typeof intervals];
  const data: Array<{ timestamp: number; hitRate: number; responseTime: number; requests: number }> = [];

  for (let i = config.count; i >= 0; i--) {
    const timestamp = now - (i * config.interval);
    data.push({
      timestamp,
      hitRate: 85 + Math.random() * 10, // 85-95%
      responseTime: 5 + Math.random() * 15, // 5-20ms
      requests: Math.floor(100 + Math.random() * 200), // 100-300 requests
    });
  }

  return data;
}

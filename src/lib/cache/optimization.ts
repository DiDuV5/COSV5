/**
 * @fileoverview Redis缓存优化功能
 * @description 自动优化、缓存预热、动态TTL调整等高级功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { CacheStats, WarmupConfig } from './types';
import type { CacheConfigManager } from './config';

/**
 * 缓存优化类
 */
export class CacheOptimization {
  private configManager: CacheConfigManager;
  private stats: CacheStats;
  private lastOptimizationTime = 0;

  constructor(configManager: CacheConfigManager, stats: CacheStats) {
    this.configManager = configManager;
    this.stats = stats;
  }

  /**
   * 缓存预热
   */
  public async warmupCache(config: WarmupConfig): Promise<void> {
    if (!this.configManager.getConfig().enableCacheWarmup) {
      logger.info('缓存预热已禁用');
      return;
    }

    const { keys, dataLoader, ttl, batchSize = 10 } = config;
    const defaultTTL = ttl || this.configManager.getDefaultTTL();

    logger.info('开始缓存预热', { keyCount: keys.length, batchSize });

    try {
      // 分批处理
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (key) => {
            try {
              const data = await dataLoader(key);
              if (data !== null && data !== undefined) {
                await this.setCacheData(key, data, defaultTTL);
              }
            } catch (error) {
              logger.error('预热单个键失败', { key, error });
            }
          })
        );

        // 避免过度负载
        if (i + batchSize < keys.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      this.stats.warmupExecuted++;
      logger.info('缓存预热完成', { keyCount: keys.length });
    } catch (error) {
      logger.error('缓存预热失败', { error });
      throw error;
    }
  }

  /**
   * 自动优化
   */
  public async autoOptimize(): Promise<void> {
    const now = Date.now();

    // 每10分钟执行一次优化
    if (now - this.lastOptimizationTime < 10 * 60 * 1000) {
      return;
    }

    this.lastOptimizationTime = now;
    this.stats.lastOptimization = new Date();

    logger.info('开始自动优化缓存');

    try {
      // 清理低效缓存
      await this.cleanupLowEfficiencyCache();
      
      // 调整TTL策略
      this.adjustTTLStrategy();
      
      // 清理穿透防护缓存
      this.cleanupPenetrationCache();

      logger.info('自动优化完成');
    } catch (error) {
      logger.error('自动优化失败', { error });
    }
  }

  /**
   * 清理低效缓存
   */
  private async cleanupLowEfficiencyCache(): Promise<void> {
    if (!this.configManager.isRedisAvailable()) {
      return;
    }

    try {
      const redis = this.configManager.getRedis()!;
      const config = this.configManager.getConfig();
      
      // 如果命中率过低，清理一些可能无效的缓存
      if (this.stats.hitRate < 30) {
        const pattern = this.configManager.formatKey('temp:*');
        let cursor = '0';
        let cleanedCount = 0;

        do {
          const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
          cursor = result[0];
          const keys = result[1];

          if (keys.length > 0) {
            // 检查这些键的访问频率（这里简化处理）
            const pipeline = redis.pipeline();
            keys.forEach(key => pipeline.del(key));
            await pipeline.exec();
            cleanedCount += keys.length;
          }
        } while (cursor !== '0' && cleanedCount < 100);

        if (cleanedCount > 0) {
          logger.info('清理低效缓存', { cleanedCount });
        }
      }
    } catch (error) {
      logger.error('清理低效缓存失败', { error });
    }
  }

  /**
   * 调整TTL策略
   */
  private adjustTTLStrategy(): void {
    const config = this.configManager.getConfig();
    
    // 根据命中率调整默认TTL
    if (this.stats.hitRate < 50) {
      const newTTL = Math.max(300, config.defaultTTL * 0.8); // 减少20%
      this.configManager.updateConfig({ defaultTTL: newTTL });
      logger.info('降低默认TTL', { oldTTL: config.defaultTTL, newTTL });
    } else if (this.stats.hitRate > 90) {
      const newTTL = Math.min(7200, config.defaultTTL * 1.2); // 增加20%
      this.configManager.updateConfig({ defaultTTL: newTTL });
      logger.info('提高默认TTL', { oldTTL: config.defaultTTL, newTTL });
    }
  }

  /**
   * 清理穿透防护缓存
   */
  private cleanupPenetrationCache(): void {
    // 这个方法需要访问穿透缓存，但由于架构分离，这里提供接口
    // 实际实现会在主管理器中调用
    logger.debug('清理穿透防护缓存');
  }

  /**
   * 智能预热推荐
   */
  public async getWarmupRecommendations(): Promise<{
    recommendedKeys: string[];
    estimatedBenefit: number;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: string[] = [];
    let estimatedBenefit = 0;
    let priority: 'high' | 'medium' | 'low' = 'low';

    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        
        // 分析最近访问的键模式
        const recentKeys = await this.getRecentlyAccessedKeys();
        
        // 基于访问模式推荐预热键
        for (const key of recentKeys) {
          if (this.shouldRecommendForWarmup(key)) {
            recommendations.push(key);
          }
        }

        // 计算预期收益
        if (this.stats.hitRate < 70) {
          estimatedBenefit = (70 - this.stats.hitRate) * recommendations.length * 0.1;
          priority = this.stats.hitRate < 50 ? 'high' : 'medium';
        }
      }
    } catch (error) {
      logger.error('获取预热推荐失败', { error });
    }

    return {
      recommendedKeys: recommendations,
      estimatedBenefit,
      priority
    };
  }

  /**
   * 获取最近访问的键
   */
  private async getRecentlyAccessedKeys(): Promise<string[]> {
    // 这里简化实现，实际可以通过Redis的MONITOR或其他方式获取
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const pattern = this.configManager.formatKey('*');
        
        let cursor = '0';
        const keys: string[] = [];
        
        do {
          const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          keys.push(...result[1]);
          
          if (keys.length >= 50) break;
        } while (cursor !== '0');
        
        return keys;
      }
    } catch (error) {
      logger.error('获取最近访问键失败', { error });
    }
    
    return [];
  }

  /**
   * 判断是否应该推荐预热
   */
  private shouldRecommendForWarmup(key: string): boolean {
    // 基于键名模式判断
    const keyPatterns = [
      /user:\d+/,
      /config:/,
      /popular:/,
      /trending:/
    ];

    return keyPatterns.some(pattern => pattern.test(key));
  }

  /**
   * 性能基准测试
   */
  public async runPerformanceBenchmark(): Promise<{
    avgGetTime: number;
    avgSetTime: number;
    throughput: number;
    recommendations: string[];
  }> {
    const testKey = 'benchmark:test';
    const testData = { test: 'data', timestamp: Date.now() };
    const iterations = 100;

    let totalGetTime = 0;
    let totalSetTime = 0;
    const recommendations: string[] = [];

    try {
      // 设置测试
      const setStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.setCacheData(`${testKey}:${i}`, testData, 60);
      }
      totalSetTime = Date.now() - setStart;

      // 获取测试
      const getStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.getCacheData(`${testKey}:${i}`);
      }
      totalGetTime = Date.now() - getStart;

      // 清理测试数据
      for (let i = 0; i < iterations; i++) {
        await this.deleteCacheData(`${testKey}:${i}`);
      }

      const avgGetTime = totalGetTime / iterations;
      const avgSetTime = totalSetTime / iterations;
      const throughput = (iterations * 2) / ((totalGetTime + totalSetTime) / 1000);

      // 生成建议
      if (avgGetTime > 10) {
        recommendations.push('考虑优化Redis配置或网络连接');
      }
      if (avgSetTime > 15) {
        recommendations.push('考虑使用批量操作提高写入性能');
      }
      if (throughput < 1000) {
        recommendations.push('考虑使用连接池或增加Redis实例');
      }

      return {
        avgGetTime,
        avgSetTime,
        throughput,
        recommendations
      };
    } catch (error) {
      logger.error('性能基准测试失败', { error });
      throw error;
    }
  }

  /**
   * 缓存数据设置（内部方法）
   */
  private async setCacheData(key: string, data: any, ttl: number): Promise<void> {
    if (this.configManager.isRedisAvailable()) {
      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      await redis.setex(formattedKey, ttl, JSON.stringify({ data, timestamp: Date.now(), ttl }));
    }
  }

  /**
   * 缓存数据获取（内部方法）
   */
  private async getCacheData(key: string): Promise<any> {
    if (this.configManager.isRedisAvailable()) {
      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      const result = await redis.get(formattedKey);
      return result ? JSON.parse(result) : null;
    }
    return null;
  }

  /**
   * 缓存数据删除（内部方法）
   */
  private async deleteCacheData(key: string): Promise<void> {
    if (this.configManager.isRedisAvailable()) {
      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      await redis.del(formattedKey);
    }
  }
}

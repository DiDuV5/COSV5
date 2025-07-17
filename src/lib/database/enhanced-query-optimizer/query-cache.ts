/**
 * @fileoverview 查询缓存管理器
 * @description 提供智能查询缓存功能，支持分层缓存策略
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { layeredCacheStrategy } from '@/lib/cache/layered-cache-strategy';
import { QueryOptimizerConfig, QueryExecutionOptions } from './types';

// 临时logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  debug: (message: string, data?: any) => console.log(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

/**
 * 查询缓存管理器
 */
export class QueryCacheManager {
  constructor(private config: QueryOptimizerConfig) {}

  /**
   * 获取缓存数据
   */
  async get<T>(queryKey: string): Promise<T | null> {
    if (!this.config.enableQueryCache) {
      return null;
    }

    try {
      const cached = await layeredCacheStrategy.get<T>(queryKey);
      if (cached !== null) {
        logger.debug('查询缓存命中', { queryKey });
        return cached;
      }
      return null;
    } catch (error) {
      logger.warn('查询缓存获取失败', { queryKey, error });
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(queryKey: string, data: T, options?: QueryExecutionOptions): Promise<boolean> {
    if (!this.config.enableQueryCache || data === null) {
      return false;
    }

    try {
      const ttl = options?.ttl || this.config.defaultCacheTTL;
      const success = await layeredCacheStrategy.set(queryKey, data, ttl);
      
      if (success) {
        logger.debug('查询结果已缓存', { queryKey, ttl });
      }
      
      return success;
    } catch (error) {
      logger.warn('查询缓存设置失败', { queryKey, error });
      return false;
    }
  }

  /**
   * 删除缓存数据
   */
  async delete(queryKey: string): Promise<boolean> {
    try {
      return await layeredCacheStrategy.delete(queryKey);
    } catch (error) {
      logger.warn('查询缓存删除失败', { queryKey, error });
      return false;
    }
  }

  /**
   * 清理所有查询缓存
   */
  async flush(): Promise<void> {
    try {
      await layeredCacheStrategy.flush();
      logger.info('查询缓存已清理');
    } catch (error) {
      logger.error('查询缓存清理失败', { error });
    }
  }

  /**
   * 获取时间范围对应的缓存TTL
   */
  getCacheTTLForTimeRange(timeRange: 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'day':
        return 300; // 5分钟
      case 'week':
        return 1800; // 30分钟
      case 'month':
        return 3600; // 1小时
      default:
        return 300;
    }
  }

  /**
   * 生成查询缓存键
   */
  generateQueryKey(prefix: string, ...params: (string | number)[]): string {
    return `${prefix}:${params.join(':')}`;
  }
}

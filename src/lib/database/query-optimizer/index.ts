/**
 * @fileoverview 查询优化器 - 统一导出
 * @description 重构后的查询优化器，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './cache';
export * from './user-queries';
export * from './post-queries';
export * from './monitor';

// 为了完全向后兼容，创建QueryOptimizer类
import type { PrismaClient } from '@prisma/client';
import { QueryCacheManager } from './cache';
import { UserQueryOptimizer } from './user-queries';
import { PostQueryOptimizer } from './post-queries';
import { QueryPerformanceMonitor } from './monitor';
import {
  QueryOptimizationConfig,
  QueryStats,
  PostsListParams,
  PostsListResult,
  DEFAULT_QUERY_CONFIG,
  OPTIMIZED_USER_SELECT,
  OPTIMIZED_POST_INCLUDE,
  CACHE_KEYS,
  CACHE_TAGS,
} from './types';

/**
 * 查询优化器 - 向后兼容包装器
 */
export class QueryOptimizer {
  private db: PrismaClient;
  private config: QueryOptimizationConfig;
  private cache: QueryCacheManager;
  private userQueries: UserQueryOptimizer;
  private postQueries: PostQueryOptimizer;
  private monitor: QueryPerformanceMonitor;

  constructor(db: PrismaClient, config?: Partial<QueryOptimizationConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_QUERY_CONFIG, ...config };
    
    // 初始化各个模块
    this.cache = new QueryCacheManager(undefined, this.config.enableCache);
    this.userQueries = new UserQueryOptimizer(db, this.cache);
    this.postQueries = new PostQueryOptimizer(db, this.cache);
    this.monitor = new QueryPerformanceMonitor(this.config);
  }

  /**
   * 优化的用户信息查询
   */
  async getUserInfo(userId: string): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.userQueries.getUserInfo(userId);
      this.monitor.recordQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      this.monitor.recordQuery(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 优化的用户权限查询
   */
  async getUserPermissions(userId: string): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.userQueries.getUserPermissions(userId);
      this.monitor.recordQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      this.monitor.recordQuery(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 优化的作品列表查询
   */
  async getPostsList(params: PostsListParams): Promise<PostsListResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.postQueries.getPostsList(params);
      this.monitor.recordQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      this.monitor.recordQuery(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 优化的热门作品查询
   */
  async getHotPosts(period: 'day' | 'week' | 'month' = 'day', limit: number = 20): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      const result = await this.postQueries.getHotPosts(period, limit);
      this.monitor.recordQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      this.monitor.recordQuery(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 批量获取用户信息（优化N+1查询）
   */
  async getBatchUserInfo(userIds: string[]): Promise<Map<string, any>> {
    const startTime = Date.now();
    
    try {
      const result = await this.userQueries.getBatchUserInfo(userIds);
      this.monitor.recordQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      this.monitor.recordQuery(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 清理用户相关缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.userQueries.invalidateUserCache(userId);
  }

  /**
   * 清理作品相关缓存
   */
  async invalidatePostCache(postId?: string): Promise<void> {
    await this.postQueries.invalidatePostCache(postId);
  }

  /**
   * 获取查询统计信息
   */
  getStats(): QueryStats {
    return this.monitor.getStats();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.monitor.resetStats();
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    return this.monitor.getPerformanceReport();
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    return this.monitor.generateReport();
  }

  /**
   * 检查健康状态
   */
  checkHealth() {
    return this.monitor.checkHealth();
  }

  // 以下是原有的私有方法，为了向后兼容保留
  /**
   * 记录查询统计
   * @deprecated 请使用 QueryPerformanceMonitor.recordQuery
   */
  private recordQueryStats(queryTime: number): void {
    this.monitor.recordQuery(queryTime);
  }

  /**
   * 获取缓存管理器
   */
  getCacheManager(): QueryCacheManager {
    return this.cache;
  }

  /**
   * 获取用户查询优化器
   */
  getUserQueryOptimizer(): UserQueryOptimizer {
    return this.userQueries;
  }

  /**
   * 获取作品查询优化器
   */
  getPostQueryOptimizer(): PostQueryOptimizer {
    return this.postQueries;
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): QueryPerformanceMonitor {
    return this.monitor;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueryOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.monitor.updateConfig(this.config);
    
    // 更新缓存启用状态
    if (config.enableCache !== undefined) {
      if (config.enableCache) {
        this.cache.enableCaching();
      } else {
        this.cache.disableCaching();
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): QueryOptimizationConfig {
    return { ...this.config };
  }
}

/**
 * 创建查询优化器实例
 */
export const createQueryOptimizer = (
  db: PrismaClient,
  config?: Partial<QueryOptimizationConfig>
) => new QueryOptimizer(db, config);

/**
 * 导出常量和类型，保持向后兼容性
 */
export {
  OPTIMIZED_USER_SELECT,
  OPTIMIZED_POST_INCLUDE,
  CACHE_KEYS,
  CACHE_TAGS,
};

/**
 * 默认导出
 */
export default QueryOptimizer;

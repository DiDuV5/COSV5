/**
 * @fileoverview 增强查询优化器统一导出
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

// 导出所有类型定义
export * from './types';

// 导出核心功能模块
export { QueryCacheManager } from './query-cache';
export { QueryPerformanceMonitor } from './query-monitor';
export { QueryExecutor } from './query-executor';
export { IndexAnalyzer } from './index-analyzer';

// 导入依赖
import { PrismaClient } from '@prisma/client';
import { QueryExecutor } from './query-executor';
import { IndexAnalyzer } from './index-analyzer';
import { 
  QueryOptimizerConfig, 
  QueryMetrics, 
  SlowQuery, 
  IndexSuggestion,
  QueryExecutionOptions,
  TimeRange,
  DEFAULT_QUERY_OPTIMIZER_CONFIG
} from './types';

/**
 * 增强数据库查询优化器（重构后的主类）
 */
export class EnhancedQueryOptimizer {
  private executor: QueryExecutor;
  private indexAnalyzer: IndexAnalyzer;
  private config: QueryOptimizerConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<QueryOptimizerConfig>
  ) {
    this.config = { ...DEFAULT_QUERY_OPTIMIZER_CONFIG, ...config };
    this.executor = new QueryExecutor(prisma, this.config);
    this.indexAnalyzer = new IndexAnalyzer();
  }

  /**
   * 执行优化查询
   */
  async executeOptimizedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options?: QueryExecutionOptions
  ): Promise<T> {
    return this.executor.executeOptimizedQuery(queryKey, queryFn, options);
  }

  /**
   * 获取用户信息（优化版）
   */
  async getOptimizedUserInfo(userId: string) {
    return this.executor.getOptimizedUserInfo(userId);
  }

  /**
   * 获取热门帖子（优化版）
   */
  async getOptimizedHotPosts(limit: number = 20, timeRange: TimeRange = 'day') {
    return this.executor.getOptimizedHotPosts(limit, timeRange);
  }

  /**
   * 获取用户帖子列表（优化版）
   */
  async getOptimizedUserPosts(userId: string, page: number = 1, limit: number = 10) {
    return this.executor.getOptimizedUserPosts(userId, page, limit);
  }

  /**
   * 分析慢查询并生成优化建议
   */
  analyzeSlowQueries(): SlowQuery[] {
    return this.executor.getMonitor().analyzeSlowQueries();
  }

  /**
   * 生成索引建议
   */
  generateIndexSuggestions(): IndexSuggestion[] {
    const queryPatterns = this.executor.getMonitor().getQueryPatterns();
    return this.indexAnalyzer.generateIndexSuggestions(queryPatterns);
  }

  /**
   * 获取查询性能指标
   */
  getMetrics(): QueryMetrics {
    return this.executor.getMonitor().getMetrics();
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.executor.getMonitor().resetMetrics();
    this.indexAnalyzer.clearIndexSuggestions();
  }

  /**
   * 清理查询缓存
   */
  async clearQueryCache(): Promise<void> {
    await this.executor.getCache().flush();
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    const performanceReport = this.executor.getMonitor().generatePerformanceReport();
    const queryPatterns = this.executor.getMonitor().getQueryPatterns();
    const indexReport = this.indexAnalyzer.generateIndexOptimizationReport(queryPatterns);

    return {
      performance: performanceReport,
      indexOptimization: indexReport,
      timestamp: new Date()
    };
  }

  /**
   * 获取配置信息
   */
  getConfig(): QueryOptimizerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QueryOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // 注意：这里需要重新初始化executor以应用新配置
    // 在实际应用中可能需要更复杂的配置更新逻辑
  }
}

// 创建默认实例以保持向后兼容
export const enhancedQueryOptimizer = new EnhancedQueryOptimizer(
  new PrismaClient()
);

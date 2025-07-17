/**
 * @fileoverview 建议分析器
 * @description 负责分析性能数据并生成优化建议
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceStats, ModelStats } from '../../database-performance-monitor';

/**
 * 建议分析器类
 */
export class RecommendationAnalyzer {
  /**
   * 生成性能建议
   */
  generateRecommendations(
    overview: PerformanceStats,
    modelStats: ModelStats,
    slowQueries: any[]
  ): string[] {
    const recommendations: string[] = [];

    // 分析总体性能
    recommendations.push(...this.analyzeOverallPerformance(overview));

    // 分析慢查询
    recommendations.push(...this.analyzeSlowQueries(slowQueries));

    // 分析模型性能
    recommendations.push(...this.analyzeModelPerformance(modelStats));

    // 分析查询频率
    recommendations.push(...this.analyzeQueryFrequency(overview));

    return recommendations;
  }

  /**
   * 分析总体性能
   */
  private analyzeOverallPerformance(overview: PerformanceStats): string[] {
    const recommendations: string[] = [];

    // 慢查询比例分析
    if (overview.totalQueries > 0) {
      const slowQueryRatio = (overview.slowQueries / overview.totalQueries) * 100;
      
      if (slowQueryRatio > 20) {
        recommendations.push('慢查询比例过高，建议全面检查数据库索引和查询优化');
      } else if (slowQueryRatio > 10) {
        recommendations.push('慢查询比例偏高，建议优化频繁执行的慢查询');
      }
    }

    // 平均执行时间分析
    if (overview.averageDuration > 1000) {
      recommendations.push('平均查询时间过长，建议检查数据库连接池配置和查询复杂度');
    } else if (overview.averageDuration > 500) {
      recommendations.push('平均查询时间偏长，考虑增加适当的缓存策略');
    }

    // 查询频率分析
    if (overview.queriesPerSecond > 200) {
      recommendations.push('查询频率很高，建议增加Redis缓存和连接池优化');
    }

    return recommendations;
  }

  /**
   * 分析慢查询
   */
  private analyzeSlowQueries(slowQueries: any[]): string[] {
    const recommendations: string[] = [];

    if (slowQueries.length === 0) {
      return recommendations;
    }

    // 分析慢查询模式
    const modelCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();

    slowQueries.forEach(query => {
      modelCounts.set(query.model, (modelCounts.get(query.model) || 0) + 1);
      actionCounts.set(query.action, (actionCounts.get(query.action) || 0) + 1);
    });

    // 找出最频繁的慢查询模型
    const topModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topModel && topModel[1] > slowQueries.length * 0.3) {
      recommendations.push(`模型 ${topModel[0]} 的慢查询较多，建议重点优化该模型的查询`);
    }

    // 找出最频繁的慢查询操作
    const topAction = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topAction && topAction[1] > slowQueries.length * 0.4) {
      recommendations.push(`${topAction[0]} 操作的慢查询较多，建议优化相关查询逻辑`);
    }

    // 检查是否有超长查询
    const verySlowQueries = slowQueries.filter(q => q.duration > 5000);
    if (verySlowQueries.length > 0) {
      recommendations.push(`发现 ${verySlowQueries.length} 个超长查询(>5秒)，需要立即优化`);
    }

    return recommendations;
  }

  /**
   * 分析模型性能
   */
  private analyzeModelPerformance(modelStats: ModelStats): string[] {
    const recommendations: string[] = [];

    Object.entries(modelStats).forEach(([model, stats]) => {
      // 检查模型慢查询比例
      if (stats.queries > 0) {
        const slowRatio = (stats.slowQueries / stats.queries) * 100;
        
        if (slowRatio > 30) {
          recommendations.push(`模型 ${model} 慢查询比例过高(${slowRatio.toFixed(1)}%)，建议优化相关索引`);
        }
      }

      // 检查模型平均执行时间
      if (stats.averageDuration > 1000) {
        recommendations.push(`模型 ${model} 平均执行时间过长(${stats.averageDuration.toFixed(2)}ms)，建议检查查询复杂度`);
      }

      // 分析操作类型
      const actions = Object.entries(stats.actions);
      if (actions.length > 0) {
        const slowestAction = actions
          .sort((a, b) => b[1].averageDuration - a[1].averageDuration)[0];

        if (slowestAction[1].averageDuration > 2000) {
          recommendations.push(`模型 ${model} 的 ${slowestAction[0]} 操作较慢，建议重点优化`);
        }
      }
    });

    return recommendations;
  }

  /**
   * 分析查询频率
   */
  private analyzeQueryFrequency(overview: PerformanceStats): string[] {
    const recommendations: string[] = [];

    if (overview.queriesPerSecond > 100) {
      recommendations.push('查询频率较高，建议实施以下优化策略：');
      recommendations.push('- 增加Redis缓存层减少数据库压力');
      recommendations.push('- 优化数据库连接池配置');
      recommendations.push('- 考虑读写分离架构');
    }

    return recommendations;
  }
}

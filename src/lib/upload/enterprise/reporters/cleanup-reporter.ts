/**
 * @fileoverview 清理报告生成器
 * @description 生成清理任务的详细报告
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  CleanupTaskType,
  CleanupStatus,
  CleanupResult,
  CleanupReport
} from '../types/cleanup-types';
import { TaskManager } from '../managers/task-manager';

/**
 * 清理报告生成器类
 */
export class CleanupReporter {
  constructor(private taskManager: TaskManager) {}

  /**
   * 生成清理报告
   */
  async generateReport(period?: { start: Date; end: Date }): Promise<CleanupReport> {
    const now = new Date();
    const reportPeriod = period || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 过去24小时
      end: now,
    };

    console.log(`📊 生成清理报告: ${reportPeriod.start.toISOString()} - ${reportPeriod.end.toISOString()}`);

    // 获取指定时间段内的任务结果
    const allResults = this.taskManager.getTaskHistory();
    const periodResults = allResults.filter(result => 
      result.startTime >= reportPeriod.start && 
      result.startTime <= reportPeriod.end
    );

    // 生成摘要
    const summary = this.generateSummary(periodResults);

    // 生成建议
    const recommendations = this.generateRecommendations(periodResults);

    // 获取下次计划任务（模拟）
    const nextScheduledTasks = this.getNextScheduledTasks();

    return {
      period: reportPeriod,
      summary,
      taskResults: periodResults,
      recommendations,
      nextScheduledTasks
    };
  }

  /**
   * 生成摘要统计
   */
  private generateSummary(results: CleanupResult[]): CleanupReport['summary'] {
    const totalTasks = results.length;
    const successfulTasks = results.filter(r => r.status === CleanupStatus.COMPLETED).length;
    const failedTasks = results.filter(r => r.status === CleanupStatus.FAILED).length;
    
    const totalItemsProcessed = results.reduce((sum, r) => sum + r.itemsProcessed, 0);
    const totalItemsDeleted = results.reduce((sum, r) => sum + r.itemsDeleted, 0);
    const totalBytesFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      totalItemsProcessed,
      totalItemsDeleted,
      totalBytesFreed,
      totalDuration
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(results: CleanupResult[]): string[] {
    const recommendations: string[] = [];

    if (results.length === 0) {
      recommendations.push('建议定期执行清理任务以维护系统性能');
      return recommendations;
    }

    // 分析失败率
    const failureRate = results.filter(r => r.status === CleanupStatus.FAILED).length / results.length;
    if (failureRate > 0.1) {
      recommendations.push(`任务失败率较高 (${(failureRate * 100).toFixed(1)}%)，建议检查系统配置和资源`);
    }

    // 分析执行时间
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    if (avgDuration > 300000) { // 5分钟
      recommendations.push('平均执行时间较长，建议优化清理策略或增加系统资源');
    }

    // 分析清理效果
    const totalBytesFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);
    if (totalBytesFreed > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('清理效果显著，建议保持当前清理频率');
    } else if (totalBytesFreed < 100 * 1024 * 1024) { // 100MB
      recommendations.push('清理效果有限，建议检查清理策略或增加清理频率');
    }

    // 分析任务类型分布
    const taskTypeCounts = results.reduce((counts, result) => {
      counts[result.taskType] = (counts[result.taskType] || 0) + 1;
      return counts;
    }, {} as Record<CleanupTaskType, number>);

    const mostFrequentTask = Object.entries(taskTypeCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostFrequentTask && mostFrequentTask[1] > results.length * 0.5) {
      recommendations.push(`${mostFrequentTask[0]} 任务执行频率较高，建议检查是否需要调整策略`);
    }

    // 检查错误模式
    const errorPatterns = this.analyzeErrorPatterns(results);
    if (errorPatterns.length > 0) {
      recommendations.push(...errorPatterns);
    }

    return recommendations;
  }

  /**
   * 分析错误模式
   */
  private analyzeErrorPatterns(results: CleanupResult[]): string[] {
    const patterns: string[] = [];
    const failedResults = results.filter(r => r.status === CleanupStatus.FAILED);

    if (failedResults.length === 0) return patterns;

    // 分析常见错误
    const errorCounts = failedResults.reduce((counts, result) => {
      result.errors.forEach(error => {
        const key = this.categorizeError(error);
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);

    Object.entries(errorCounts).forEach(([category, count]) => {
      if (count > 1) {
        patterns.push(`检测到重复的${category}错误 (${count}次)，建议重点关注`);
      }
    });

    return patterns;
  }

  /**
   * 错误分类
   */
  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('timeout') || lowerError.includes('超时')) {
      return '超时';
    }
    if (lowerError.includes('permission') || lowerError.includes('权限')) {
      return '权限';
    }
    if (lowerError.includes('network') || lowerError.includes('网络')) {
      return '网络';
    }
    if (lowerError.includes('storage') || lowerError.includes('存储')) {
      return '存储';
    }
    if (lowerError.includes('database') || lowerError.includes('数据库')) {
      return '数据库';
    }
    
    return '其他';
  }

  /**
   * 获取下次计划任务
   */
  private getNextScheduledTasks(): Array<{
    taskType: CleanupTaskType;
    scheduledTime: Date;
  }> {
    // 模拟下次计划任务
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return [
      {
        taskType: CleanupTaskType.ORPHAN_FILES,
        scheduledTime: new Date(tomorrow.setHours(2, 0, 0, 0)) // 明天凌晨2点
      },
      {
        taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
        scheduledTime: new Date(tomorrow.setHours(3, 0, 0, 0)) // 明天凌晨3点
      },
      {
        taskType: CleanupTaskType.TEMP_FILES,
        scheduledTime: new Date(tomorrow.setHours(1, 0, 0, 0)) // 明天凌晨1点
      }
    ];
  }

  /**
   * 生成详细的任务类型报告
   */
  async generateTaskTypeReport(taskType: CleanupTaskType, period?: { start: Date; end: Date }): Promise<{
    taskType: CleanupTaskType;
    summary: {
      totalExecutions: number;
      successRate: number;
      averageDuration: number;
      totalBytesFreed: number;
    };
    recentResults: CleanupResult[];
    trends: {
      executionTrend: string;
      performanceTrend: string;
      effectivenessTrend: string;
    };
  }> {
    const now = new Date();
    const reportPeriod = period || {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 过去7天
      end: now,
    };

    const allResults = this.taskManager.getTaskHistory();
    const taskResults = allResults.filter(result => 
      result.taskType === taskType &&
      result.startTime >= reportPeriod.start && 
      result.startTime <= reportPeriod.end
    );

    const totalExecutions = taskResults.length;
    const successfulExecutions = taskResults.filter(r => r.status === CleanupStatus.COMPLETED).length;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
    
    const totalDuration = taskResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalExecutions > 0 ? totalDuration / totalExecutions : 0;
    
    const totalBytesFreed = taskResults.reduce((sum, r) => sum + r.bytesFreed, 0);

    // 分析趋势（简化版）
    const trends = this.analyzeTrends(taskResults);

    return {
      taskType,
      summary: {
        totalExecutions,
        successRate,
        averageDuration,
        totalBytesFreed
      },
      recentResults: taskResults.slice(-10), // 最近10次执行
      trends
    };
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(results: CleanupResult[]): {
    executionTrend: string;
    performanceTrend: string;
    effectivenessTrend: string;
  } {
    if (results.length < 2) {
      return {
        executionTrend: '数据不足',
        performanceTrend: '数据不足',
        effectivenessTrend: '数据不足'
      };
    }

    // 简化的趋势分析
    const recentResults = results.slice(-5);
    const olderResults = results.slice(0, -5);

    const recentSuccessRate = recentResults.filter(r => r.status === CleanupStatus.COMPLETED).length / recentResults.length;
    const olderSuccessRate = olderResults.length > 0 ? olderResults.filter(r => r.status === CleanupStatus.COMPLETED).length / olderResults.length : 0;

    const recentAvgDuration = recentResults.reduce((sum, r) => sum + (r.duration || 0), 0) / recentResults.length;
    const olderAvgDuration = olderResults.length > 0 ? olderResults.reduce((sum, r) => sum + (r.duration || 0), 0) / olderResults.length : 0;

    const recentAvgBytes = recentResults.reduce((sum, r) => sum + r.bytesFreed, 0) / recentResults.length;
    const olderAvgBytes = olderResults.length > 0 ? olderResults.reduce((sum, r) => sum + r.bytesFreed, 0) / olderResults.length : 0;

    return {
      executionTrend: recentSuccessRate > olderSuccessRate ? '改善' : recentSuccessRate < olderSuccessRate ? '下降' : '稳定',
      performanceTrend: recentAvgDuration < olderAvgDuration ? '改善' : recentAvgDuration > olderAvgDuration ? '下降' : '稳定',
      effectivenessTrend: recentAvgBytes > olderAvgBytes ? '改善' : recentAvgBytes < olderAvgBytes ? '下降' : '稳定'
    };
  }
}

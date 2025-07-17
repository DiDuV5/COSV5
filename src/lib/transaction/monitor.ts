/**
 * @fileoverview 事务监控器
 * @description 监控事务执行状态和性能指标
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TransactionMetrics } from './types';

/**
 * 事务监控器
 */
export class TransactionMonitor {
  private static instance: TransactionMonitor;
  private metrics: TransactionMetrics;
  private executionTimes: number[];

  private constructor() {
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      averageExecutionTime: 0,
      longestTransaction: 0,
    };
    this.executionTimes = [];
  }

  /**
   * 获取监控器单例
   */
  static getInstance(): TransactionMonitor {
    if (!TransactionMonitor.instance) {
      TransactionMonitor.instance = new TransactionMonitor();
    }
    return TransactionMonitor.instance;
  }

  /**
   * 增加总事务数
   */
  incrementTotal(): void {
    this.metrics.totalTransactions++;
  }

  /**
   * 增加重试事务数
   */
  incrementRetried(): void {
    this.metrics.retriedTransactions++;
  }

  /**
   * 记录成功事务
   */
  recordSuccess(executionTime: number): void {
    this.metrics.successfulTransactions++;
    this.updateExecutionTimeMetrics(executionTime);
  }

  /**
   * 记录失败事务
   */
  recordFailure(executionTime: number): void {
    this.metrics.failedTransactions++;
    this.updateExecutionTimeMetrics(executionTime);
  }

  /**
   * 更新执行时间指标
   */
  private updateExecutionTimeMetrics(executionTime: number): void {
    this.executionTimes.push(executionTime);

    // 保持最近1000次的执行时间记录
    if (this.executionTimes.length > 1000) {
      this.executionTimes.shift();
    }

    // 更新平均执行时间
    this.metrics.averageExecutionTime =
      this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;

    // 更新最长执行时间
    if (executionTime > this.metrics.longestTransaction) {
      this.metrics.longestTransaction = executionTime;
    }
  }

  /**
   * 获取事务指标
   */
  getMetrics(): TransactionMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取成功率
   */
  getSuccessRate(): number {
    if (this.metrics.totalTransactions === 0) return 0;
    return (this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100;
  }

  /**
   * 获取失败率
   */
  getFailureRate(): number {
    if (this.metrics.totalTransactions === 0) return 0;
    return (this.metrics.failedTransactions / this.metrics.totalTransactions) * 100;
  }

  /**
   * 获取重试率
   */
  getRetryRate(): number {
    if (this.metrics.totalTransactions === 0) return 0;
    return (this.metrics.retriedTransactions / this.metrics.totalTransactions) * 100;
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats(): {
    metrics: TransactionMetrics;
    rates: {
      successRate: number;
      failureRate: number;
      retryRate: number;
    };
    performance: {
      averageTime: number;
      longestTime: number;
      recentExecutions: number[];
    };
  } {
    return {
      metrics: this.getMetrics(),
      rates: {
        successRate: this.getSuccessRate(),
        failureRate: this.getFailureRate(),
        retryRate: this.getRetryRate(),
      },
      performance: {
        averageTime: this.metrics.averageExecutionTime,
        longestTime: this.metrics.longestTransaction,
        recentExecutions: [...this.executionTimes.slice(-10)], // 最近10次执行时间
      },
    };
  }

  /**
   * 重置事务指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      averageExecutionTime: 0,
      longestTransaction: 0,
    };
    this.executionTimes = [];
  }

  /**
   * 检查性能警告
   */
  checkPerformanceWarnings(): {
    hasWarnings: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 检查失败率
    const failureRate = this.getFailureRate();
    if (failureRate > 10) {
      warnings.push(`事务失败率过高: ${failureRate.toFixed(2)}%`);
    }

    // 检查重试率
    const retryRate = this.getRetryRate();
    if (retryRate > 20) {
      warnings.push(`事务重试率过高: ${retryRate.toFixed(2)}%`);
    }

    // 检查平均执行时间
    if (this.metrics.averageExecutionTime > 5000) {
      warnings.push(`平均事务执行时间过长: ${this.metrics.averageExecutionTime.toFixed(0)}ms`);
    }

    // 检查最长执行时间
    if (this.metrics.longestTransaction > 30000) {
      warnings.push(`发现超长事务: ${this.metrics.longestTransaction.toFixed(0)}ms`);
    }

    return {
      hasWarnings: warnings.length > 0,
      warnings,
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    const stats = this.getDetailedStats();
    const warnings = this.checkPerformanceWarnings();

    let report = '📊 事务监控报告\n';
    report += '==================\n\n';

    report += '📈 基础指标:\n';
    report += `- 总事务数: ${stats.metrics.totalTransactions}\n`;
    report += `- 成功事务: ${stats.metrics.successfulTransactions}\n`;
    report += `- 失败事务: ${stats.metrics.failedTransactions}\n`;
    report += `- 重试事务: ${stats.metrics.retriedTransactions}\n\n`;

    report += '📊 成功率统计:\n';
    report += `- 成功率: ${stats.rates.successRate.toFixed(2)}%\n`;
    report += `- 失败率: ${stats.rates.failureRate.toFixed(2)}%\n`;
    report += `- 重试率: ${stats.rates.retryRate.toFixed(2)}%\n\n`;

    report += '⏱️ 性能指标:\n';
    report += `- 平均执行时间: ${stats.performance.averageTime.toFixed(0)}ms\n`;
    report += `- 最长执行时间: ${stats.performance.longestTime.toFixed(0)}ms\n\n`;

    if (warnings.hasWarnings) {
      report += '⚠️ 性能警告:\n';
      warnings.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    report += `📅 报告生成时间: ${new Date().toLocaleString()}\n`;

    return report;
  }
}

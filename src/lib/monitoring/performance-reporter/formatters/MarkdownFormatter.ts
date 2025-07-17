/**
 * @fileoverview Markdown格式化器
 * @description 负责将性能报告格式化为Markdown
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceReport } from '../types';
import { ALERT_EMOJIS } from '../constants';

/**
 * Markdown格式化器类
 */
export class MarkdownFormatter {
  /**
   * 格式化报告为Markdown
   */
  formatReport(report: PerformanceReport): string {
    let markdown = this.generateHeader(report);
    markdown += this.generateOverview(report);
    markdown += this.generateAlerts(report);
    markdown += this.generateModelStats(report);
    markdown += this.generateSlowQueries(report);
    markdown += this.generateFrequentQueries(report);
    markdown += this.generateRecommendations(report);

    return markdown;
  }

  /**
   * 生成报告头部
   */
  private generateHeader(report: PerformanceReport): string {
    let markdown = `# 数据库性能报告\n\n`;
    markdown += `**生成时间**: ${report.generatedAt.toLocaleString()}\n`;
    markdown += `**时间范围**: ${report.timeRange.start.toLocaleString()} - ${report.timeRange.end.toLocaleString()}\n\n`;
    return markdown;
  }

  /**
   * 生成总体统计
   */
  private generateOverview(report: PerformanceReport): string {
    let markdown = `## 📊 总体统计\n\n`;
    markdown += `| 指标 | 数值 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总查询数 | ${report.overview.totalQueries} |\n`;
    markdown += `| 慢查询数 | ${report.overview.slowQueries} |\n`;
    
    const slowQueryRatio = report.overview.totalQueries > 0 
      ? ((report.overview.slowQueries / report.overview.totalQueries) * 100).toFixed(2)
      : '0.00';
    markdown += `| 慢查询比例 | ${slowQueryRatio}% |\n`;
    
    markdown += `| 平均执行时间 | ${report.overview.averageDuration.toFixed(2)}ms |\n`;
    markdown += `| 最长执行时间 | ${report.overview.maxDuration}ms |\n`;
    markdown += `| 查询频率 | ${report.overview.queriesPerSecond.toFixed(2)}/秒 |\n\n`;
    
    return markdown;
  }

  /**
   * 生成告警信息
   */
  private generateAlerts(report: PerformanceReport): string {
    if (report.alerts.length === 0) {
      return '';
    }

    let markdown = `## 🚨 告警信息\n\n`;
    report.alerts.forEach(alert => {
      const emoji = this.getAlertEmoji(alert.level);
      markdown += `${emoji} **${alert.level.toUpperCase()}**: ${alert.message}\n`;
      if (alert.suggestion) {
        markdown += `   💡 建议: ${alert.suggestion}\n`;
      }
      markdown += `\n`;
    });
    
    return markdown;
  }

  /**
   * 生成模型性能统计
   */
  private generateModelStats(report: PerformanceReport): string {
    let markdown = `## 📈 模型性能统计\n\n`;
    markdown += `| 模型 | 查询数 | 平均时间 | 慢查询数 | 主要操作 |\n`;
    markdown += `|------|--------|----------|----------|----------|\n`;

    Object.entries(report.modelStats).forEach(([model, stats]) => {
      const topAction = Object.entries(stats.actions)
        .sort((a, b) => b[1].count - a[1].count)[0];

      markdown += `| ${model} | ${stats.queries} | ${stats.averageDuration.toFixed(2)}ms | ${stats.slowQueries} | ${topAction ? topAction[0] : 'N/A'} |\n`;
    });
    markdown += `\n`;

    return markdown;
  }

  /**
   * 生成慢查询列表
   */
  private generateSlowQueries(report: PerformanceReport): string {
    if (report.slowQueries.length === 0) {
      return '';
    }

    let markdown = `## 🐌 慢查询 (Top 10)\n\n`;
    markdown += `| 模型 | 操作 | 执行时间 | 时间 |\n`;
    markdown += `|------|------|----------|------|\n`;

    report.slowQueries.slice(0, 10).forEach(query => {
      markdown += `| ${query.model} | ${query.action} | ${query.duration}ms | ${new Date(query.timestamp).toLocaleTimeString()} |\n`;
    });
    markdown += `\n`;

    return markdown;
  }

  /**
   * 生成频繁查询列表
   */
  private generateFrequentQueries(report: PerformanceReport): string {
    if (report.frequentQueries.length === 0) {
      return '';
    }

    let markdown = `## 🔥 频繁查询 (Top 10)\n\n`;
    markdown += `| 模型 | 操作 | 调用次数 | 平均时间 | 总时间 |\n`;
    markdown += `|------|------|----------|----------|--------|\n`;

    report.frequentQueries.slice(0, 10).forEach(query => {
      markdown += `| ${query.model} | ${query.action} | ${query.count} | ${query.averageDuration.toFixed(2)}ms | ${query.totalDuration.toFixed(2)}ms |\n`;
    });
    markdown += `\n`;

    return markdown;
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(report: PerformanceReport): string {
    if (report.recommendations.length === 0) {
      return '';
    }

    let markdown = `## 💡 性能建议\n\n`;
    report.recommendations.forEach((rec, index) => {
      markdown += `${index + 1}. ${rec}\n`;
    });
    markdown += `\n`;

    return markdown;
  }

  /**
   * 获取告警表情符号
   */
  private getAlertEmoji(level: string): string {
    return ALERT_EMOJIS[level as keyof typeof ALERT_EMOJIS] || ALERT_EMOJIS.default;
  }
}

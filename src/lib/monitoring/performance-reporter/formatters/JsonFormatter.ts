/**
 * @fileoverview JSON格式化器
 * @description 负责将性能报告格式化为JSON
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceReport } from '../types';

/**
 * JSON格式化器类
 */
export class JsonFormatter {
  /**
   * 格式化报告为JSON字符串
   */
  formatReport(report: PerformanceReport, pretty: boolean = true): string {
    return JSON.stringify(report, this.jsonReplacer, pretty ? 2 : 0);
  }

  /**
   * 格式化报告为JSON对象
   */
  formatReportAsObject(report: PerformanceReport): any {
    return JSON.parse(JSON.stringify(report, this.jsonReplacer));
  }

  /**
   * JSON序列化替换器
   */
  private jsonReplacer(key: string, value: any): any {
    // 处理Date对象
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // 处理数字精度
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return Number(value.toFixed(2));
    }
    
    return value;
  }

  /**
   * 生成简化的JSON报告
   */
  formatSimplifiedReport(report: PerformanceReport): string {
    const simplified = {
      timestamp: report.generatedAt.toISOString(),
      summary: {
        totalQueries: report.overview.totalQueries,
        slowQueries: report.overview.slowQueries,
        averageDuration: Number(report.overview.averageDuration.toFixed(2)),
        queriesPerSecond: Number(report.overview.queriesPerSecond.toFixed(2)),
      },
      alerts: report.alerts.map(alert => ({
        level: alert.level,
        type: alert.type,
        message: alert.message,
      })),
      recommendations: report.recommendations,
    };

    return JSON.stringify(simplified, null, 2);
  }
}

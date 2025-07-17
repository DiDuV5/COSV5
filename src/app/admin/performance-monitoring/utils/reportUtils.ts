/**
 * @fileoverview 性能监控报告生成工具
 * @description 生成性能监控报告的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceReportData, ExportFormat } from '../types';
import { EXPORT_FILENAME_TEMPLATES, MIME_TYPES } from '../constants';

/**
 * 报告生成工具类
 */
export class ReportUtils {
  /**
   * 生成Markdown格式的性能报告
   * @param reportData 报告数据
   * @returns Markdown格式的报告字符串
   */
  static generateMarkdownContent(reportData: PerformanceReportData): string {
    const now = new Date().toLocaleString();

    return `# 数据库性能监控报告

**生成时间**: ${now}

## 概览统计

- **总查询数**: ${reportData.overview?.totalQueries?.toLocaleString() || 'N/A'}
- **慢查询数**: ${reportData.overview?.slowQueries?.toLocaleString() || 'N/A'}
- **平均响应时间**: ${reportData.overview?.averageDuration?.toFixed(2) || 'N/A'}ms
- **慢查询比例**: ${((reportData.overview?.slowQueryRatio || 0) * 100).toFixed(1)}%

## 模型统计

${Object.entries(reportData.modelStats || {}).map(([model, stats]: [string, any]) => `
### ${model}
- 查询数: ${stats.totalQueries?.toLocaleString() || 'N/A'}
- 平均响应时间: ${stats.averageDuration?.toFixed(2) || 'N/A'}ms
- 慢查询数: ${stats.slowQueries || 0}
`).join('')}

## 性能告警

${reportData.alerts?.length > 0 ?
  reportData.alerts.map((alert: any) => `- **${alert.level.toUpperCase()}**: ${alert.message}`).join('\n') :
  '暂无告警'
}

## 优化建议

${reportData.recommendations?.length > 0 ?
  reportData.recommendations.map((rec: any) => `- **${rec.title}** (${rec.priority}优先级): ${rec.description}`).join('\n') :
  '暂无建议'
}

---
*报告由CoserEden性能监控系统自动生成*
`;
  }

  /**
   * 生成JSON格式的导出数据
   * @param data 导出数据对象
   * @returns JSON字符串
   */
  static generateJsonContent(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 生成文件名
   * @param template 文件名模板
   * @param date 日期（可选，默认为当前日期）
   * @returns 生成的文件名
   */
  static generateFilename(template: string, date?: Date): string {
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];
    return template.replace('{date}', dateString);
  }

  /**
   * 获取MIME类型
   * @param format 导出格式
   * @returns MIME类型字符串
   */
  static getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'markdown':
        return MIME_TYPES.MARKDOWN;
      case 'json':
        return MIME_TYPES.JSON;
      default:
        return 'text/plain';
    }
  }

  /**
   * 下载文件
   * @param content 文件内容
   * @param filename 文件名
   * @param mimeType MIME类型
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 格式化数字
   * @param value 数值
   * @param decimals 小数位数
   * @returns 格式化后的字符串
   */
  static formatNumber(value: number | undefined, decimals: number = 2): string {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  }

  /**
   * 格式化百分比
   * @param value 数值（0-1之间）
   * @param decimals 小数位数
   * @returns 格式化后的百分比字符串
   */
  static formatPercentage(value: number | undefined, decimals: number = 1): string {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * 格式化大数字（添加千分位分隔符）
   * @param value 数值
   * @returns 格式化后的字符串
   */
  static formatLargeNumber(value: number | undefined): string {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString();
  }

  /**
   * 格式化时间戳
   * @param timestamp 时间戳
   * @returns 格式化后的时间字符串
   */
  static formatTimestamp(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  }

  /**
   * 生成性能摘要
   * @param reportData 报告数据
   * @returns 性能摘要对象
   */
  static generatePerformanceSummary(reportData: PerformanceReportData): {
    totalQueries: string;
    slowQueries: string;
    averageDuration: string;
    slowQueryRatio: string;
    alertCount: number;
    recommendationCount: number;
  } {
    return {
      totalQueries: this.formatLargeNumber(reportData.overview?.totalQueries),
      slowQueries: this.formatLargeNumber(reportData.overview?.slowQueries),
      averageDuration: `${this.formatNumber(reportData.overview?.averageDuration)}ms`,
      slowQueryRatio: this.formatPercentage(reportData.overview?.slowQueryRatio),
      alertCount: reportData.alerts?.length || 0,
      recommendationCount: reportData.recommendations?.length || 0,
    };
  }

  /**
   * 验证报告数据
   * @param reportData 报告数据
   * @returns 验证结果
   */
  static validateReportData(reportData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!reportData) {
      errors.push('报告数据为空');
      return { isValid: false, errors };
    }

    if (!reportData.overview) {
      errors.push('缺少概览数据');
    }

    if (!reportData.modelStats) {
      errors.push('缺少模型统计数据');
    }

    if (!Array.isArray(reportData.alerts)) {
      errors.push('告警数据格式错误');
    }

    if (!Array.isArray(reportData.recommendations)) {
      errors.push('建议数据格式错误');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

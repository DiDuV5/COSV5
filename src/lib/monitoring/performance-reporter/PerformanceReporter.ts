/**
 * @fileoverview 重构后的性能报告器
 * @description 提供统一的性能报告生成接口 - 重构版本
 * @author Augment AI
 * @date 2025-07-06
 * @version 3.0.0 - 重构版（模块化架构）
 */

import { ReportConfig, PerformanceReport, RealTimeMetrics } from './types';
import { ReportGenerator } from './core/ReportGenerator';
import { MarkdownFormatter } from './formatters/MarkdownFormatter';
import { JsonFormatter } from './formatters/JsonFormatter';
import { MetricsAnalyzer } from './analyzers/MetricsAnalyzer';
import { HealthCheckService } from './services/HealthCheckService';

/**
 * 性能报告器主类 - 重构版
 */
export class PerformanceReporter {
  private static instance: PerformanceReporter;
  private reportGenerator: ReportGenerator;
  private markdownFormatter: MarkdownFormatter;
  private jsonFormatter: JsonFormatter;
  private metricsAnalyzer: MetricsAnalyzer;
  private healthCheckService: HealthCheckService;

  private constructor() {
    this.reportGenerator = new ReportGenerator();
    this.markdownFormatter = new MarkdownFormatter();
    this.jsonFormatter = new JsonFormatter();
    this.metricsAnalyzer = new MetricsAnalyzer();
    this.healthCheckService = new HealthCheckService();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceReporter {
    if (!PerformanceReporter.instance) {
      PerformanceReporter.instance = new PerformanceReporter();
    }
    return PerformanceReporter.instance;
  }

  // 静态方法 - 主要API

  /**
   * 生成性能报告
   */
  static generateReport(config?: Partial<ReportConfig>): PerformanceReport {
    const instance = this.getInstance();
    return instance.reportGenerator.generateReport(config);
  }

  /**
   * 生成Markdown格式报告
   */
  static generateMarkdownReport(config?: Partial<ReportConfig>): string {
    const instance = this.getInstance();
    const report = instance.reportGenerator.generateReport(config);
    return instance.markdownFormatter.formatReport(report);
  }

  /**
   * 生成JSON格式报告
   */
  static generateJsonReport(config?: Partial<ReportConfig>, pretty: boolean = true): string {
    const instance = this.getInstance();
    const report = instance.reportGenerator.generateReport(config);
    return instance.jsonFormatter.formatReport(report, pretty);
  }

  /**
   * 获取实时性能指标
   */
  static getRealTimeMetrics(): RealTimeMetrics {
    const instance = this.getInstance();
    return instance.metricsAnalyzer.calculateRealTimeMetrics();
  }

  /**
   * 执行健康检查
   */
  static async performHealthCheck(): Promise<any> {
    const instance = this.getInstance();
    return await instance.healthCheckService.performHealthCheck();
  }

  // 实例方法（用于兼容性）

  /**
   * 生成性能报告（实例方法）
   */
  generateReport(config?: Partial<ReportConfig>): PerformanceReport {
    return this.reportGenerator.generateReport(config);
  }

  /**
   * 生成Markdown格式报告（实例方法）
   */
  generateMarkdownReport(config?: Partial<ReportConfig>): string {
    const report = this.reportGenerator.generateReport(config);
    return this.markdownFormatter.formatReport(report);
  }

  /**
   * 生成JSON格式报告（实例方法）
   */
  generateJsonReport(config?: Partial<ReportConfig>, pretty: boolean = true): string {
    const report = this.reportGenerator.generateReport(config);
    return this.jsonFormatter.formatReport(report, pretty);
  }

  /**
   * 获取实时性能指标（实例方法）
   */
  getRealTimeMetrics(): RealTimeMetrics {
    return this.metricsAnalyzer.calculateRealTimeMetrics();
  }

  /**
   * 执行健康检查（实例方法）
   */
  async performHealthCheck(): Promise<any> {
    return await this.healthCheckService.performHealthCheck();
  }
}

// 导出单例实例
export const performanceReporter = PerformanceReporter.getInstance();

/**
 * @fileoverview 清理报告管理器
 * @description 管理清理报告的保存、查询和统计
 */

import { prisma } from '@/lib/prisma';
import type {
  CleanupReport,
  CleanupStatistics,
  IReportManager,
  CleanupTaskResult
} from '../types';

/**
 * 清理报告管理器
 */
export class ReportManager implements IReportManager {
  private static instance: ReportManager;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ReportManager {
    if (!ReportManager.instance) {
      ReportManager.instance = new ReportManager();
    }
    return ReportManager.instance;
  }

  /**
   * 保存清理报告
   */
  public async saveReport(report: CleanupReport): Promise<void> {
    try {
      await prisma.cleanupReport.create({
        data: {
          totalFilesScanned: report.totalFilesScanned,
          totalFilesDeleted: report.totalFilesDeleted,
          totalSpaceFreed: report.totalSpaceFreed,
          taskResults: JSON.stringify(report.taskResults),
          duration: report.duration,
          success: report.success,
          timestamp: report.timestamp,
        },
      });

      console.log(`📊 清理报告已保存 - 删除${report.totalFilesDeleted}个文件，释放${this.formatBytes(report.totalSpaceFreed)}`);
    } catch (error) {
      console.error('保存清理报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取清理历史
   */
  public async getHistory(limit: number = 10): Promise<CleanupReport[]> {
    try {
      const records = await prisma.cleanupReport.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return records.map((record: any) => ({
        totalFilesScanned: record.totalFilesScanned,
        totalFilesDeleted: record.totalFilesDeleted,
        totalSpaceFreed: record.totalSpaceFreed,
        taskResults: JSON.parse(record.taskResults),
        duration: record.duration,
        timestamp: record.timestamp,
        success: record.success,
      }));
    } catch (error) {
      console.error('获取清理历史失败:', error);
      return [];
    }
  }

  /**
   * 获取统计信息
   */
  public async getStatistics(): Promise<CleanupStatistics> {
    try {
      const reports = await prisma.cleanupReport.findMany({
        orderBy: { timestamp: 'desc' },
      });

      const totalExecutions = reports.length;
      const successfulExecutions = reports.filter((r: any) => r.success).length;
      const failedExecutions = totalExecutions - successfulExecutions;

      const totalFilesScanned = reports.reduce((sum: number, r: any) => sum + r.totalFilesScanned, 0);
      const totalFilesDeleted = reports.reduce((sum: number, r: any) => sum + r.totalFilesDeleted, 0);
      const totalSpaceFreed = reports.reduce((sum: number, r: any) => sum + r.totalSpaceFreed, 0);

      const totalDuration = reports.reduce((sum: number, r: any) => sum + r.duration, 0);
      const averageExecutionTime = totalExecutions > 0 ? totalDuration / totalExecutions : 0;

      const lastExecutionTime = reports.length > 0 ? reports[0].timestamp : undefined;
      const lastSuccessfulExecution = reports.find((r: any) => r.success)?.timestamp;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalFilesScanned,
        totalFilesDeleted,
        totalSpaceFreed,
        averageExecutionTime,
        lastExecutionTime,
        lastSuccessfulExecution,
      };
    } catch (error) {
      console.error('获取清理统计失败:', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalFilesScanned: 0,
        totalFilesDeleted: 0,
        totalSpaceFreed: 0,
        averageExecutionTime: 0,
      };
    }
  }

  /**
   * 生成报告摘要
   */
  public generateSummary(report: CleanupReport): string {
    const successRate = report.taskResults.length > 0 
      ? (report.taskResults.filter(t => t.success).length / report.taskResults.length * 100).toFixed(1)
      : '0';

    const taskSummary = report.taskResults.map(task => 
      `${task.taskType}: ${task.filesDeleted}个文件 (${this.formatBytes(task.spaceFreed)})`
    ).join(', ');

    return `
清理报告摘要 (${report.timestamp.toLocaleString()}):
- 执行状态: ${report.success ? '成功' : '失败'}
- 任务成功率: ${successRate}%
- 扫描文件: ${report.totalFilesScanned} 个
- 删除文件: ${report.totalFilesDeleted} 个
- 释放空间: ${this.formatBytes(report.totalSpaceFreed)}
- 执行时长: ${this.formatDuration(report.duration)}
- 任务详情: ${taskSummary || '无'}
    `.trim();
  }

  /**
   * 生成详细报告
   */
  public generateDetailedReport(report: CleanupReport): string {
    let details = this.generateSummary(report);
    
    details += '\n\n任务执行详情:\n';
    report.taskResults.forEach((task, index) => {
      details += `\n${index + 1}. ${task.taskType}:
   - 状态: ${task.success ? '成功' : '失败'}
   - 扫描: ${task.filesScanned} 个文件
   - 删除: ${task.filesDeleted} 个文件
   - 释放: ${this.formatBytes(task.spaceFreed)}
   - 耗时: ${this.formatDuration(task.duration)}`;
      
      if (task.errors.length > 0) {
        details += `\n   - 错误: ${task.errors.join('; ')}`;
      }
    });

    return details;
  }

  /**
   * 获取任务性能分析
   */
  public async getTaskPerformanceAnalysis(): Promise<{
    taskType: string;
    avgDuration: number;
    avgFilesDeleted: number;
    avgSpaceFreed: number;
    successRate: number;
    executionCount: number;
  }[]> {
    try {
      const reports = await this.getHistory(50); // 分析最近50次执行
      const taskStats = new Map<string, {
        durations: number[];
        filesDeleted: number[];
        spaceFreed: number[];
        successes: number;
        total: number;
      }>();

      reports.forEach(report => {
        report.taskResults.forEach(task => {
          if (!taskStats.has(task.taskType)) {
            taskStats.set(task.taskType, {
              durations: [],
              filesDeleted: [],
              spaceFreed: [],
              successes: 0,
              total: 0,
            });
          }

          const stats = taskStats.get(task.taskType)!;
          stats.durations.push(task.duration);
          stats.filesDeleted.push(task.filesDeleted);
          stats.spaceFreed.push(task.spaceFreed);
          stats.total++;
          
          if (task.success) {
            stats.successes++;
          }
        });
      });

      return Array.from(taskStats.entries()).map(([taskType, stats]) => ({
        taskType,
        avgDuration: stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length,
        avgFilesDeleted: stats.filesDeleted.reduce((a, b) => a + b, 0) / stats.filesDeleted.length,
        avgSpaceFreed: stats.spaceFreed.reduce((a, b) => a + b, 0) / stats.spaceFreed.length,
        successRate: (stats.successes / stats.total) * 100,
        executionCount: stats.total,
      }));
    } catch (error) {
      console.error('获取任务性能分析失败:', error);
      return [];
    }
  }

  /**
   * 清理旧报告
   */
  public async cleanupOldReports(keepDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
      
      const result = await prisma.cleanupReport.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`🧹 清理了 ${result.count} 个旧的清理报告`);
      return result.count;
    } catch (error) {
      console.error('清理旧报告失败:', error);
      return 0;
    }
  }

  /**
   * 导出报告为CSV
   */
  public async exportReportsToCSV(limit: number = 100): Promise<string> {
    try {
      const reports = await this.getHistory(limit);
      
      const headers = [
        '时间戳',
        '执行状态',
        '扫描文件数',
        '删除文件数',
        '释放空间(字节)',
        '执行时长(毫秒)',
        '任务数量',
        '成功任务数'
      ];

      const rows = reports.map(report => [
        report.timestamp.toISOString(),
        report.success ? '成功' : '失败',
        report.totalFilesScanned.toString(),
        report.totalFilesDeleted.toString(),
        report.totalSpaceFreed.toString(),
        report.duration.toString(),
        report.taskResults.length.toString(),
        report.taskResults.filter(t => t.success).length.toString()
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('导出CSV失败:', error);
      return '';
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

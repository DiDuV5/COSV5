/**
 * @fileoverview 转码统计服务
 * @description 处理转码任务的统计信息和分析
 */

import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  TranscodingStats,
  RecentTask,
  TaskType,
  TranscodingStatus,
  TRANSCODING_CONSTANTS,
} from '../types/transcoding-types';

export class TranscodingStatsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取转码统计信息
   */
  async getTranscodingStats(): Promise<TranscodingStats> {
    try {
      // 获取状态分组统计
      const stats = await this.prisma.mediaProcessingTask.groupBy({
        by: ['status', 'taskType'],
        _count: {
          id: true,
        },
        where: {
          taskType: TaskType.TRANSCODE,
        },
      });

      // 获取总任务数
      const totalTasks = await this.prisma.mediaProcessingTask.count({
        where: {
          taskType: TaskType.TRANSCODE,
        },
      });

      // 获取平均持续时间
      const avgDuration = await this.prisma.mediaProcessingTask.aggregate({
        _avg: {
          duration: true,
        },
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.COMPLETED,
          duration: {
            not: null,
          },
        },
      });

      // 获取最近任务
      const recentTasks = await this.getRecentTasks();

      return {
        totalTasks,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        averageDuration: avgDuration._avg.duration,
        recentTasks,
      };
    } catch (error) {
      console.error('获取转码统计信息失败:', error);
      throw TRPCErrorHandler.internalError('获取转码统计信息失败');
    }
  }

  /**
   * 获取最近的转码任务
   */
  async getRecentTasks(limit = TRANSCODING_CONSTANTS.DEFAULT_RECENT_TASKS_LIMIT): Promise<RecentTask[]> {
    try {
      const tasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          taskType: TaskType.TRANSCODE,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          media: {
            select: {
              filename: true,
              originalName: true,
              fileSize: true,
            },
          },
        },
      });

      return tasks.map(task => ({
        id: task.id,
        status: task.status as any,
        progress: task.progress,
        duration: task.duration,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
        media: task.media,
      }));
    } catch (error) {
      console.error('获取最近任务失败:', error);
      throw TRPCErrorHandler.internalError('获取最近任务失败');
    }
  }

  /**
   * 获取转码性能统计
   */
  async getPerformanceStats() {
    try {
      // 获取成功率
      const totalTasks = await this.prisma.mediaProcessingTask.count({
        where: { taskType: TaskType.TRANSCODE },
      });

      const completedTasks = await this.prisma.mediaProcessingTask.count({
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.COMPLETED,
        },
      });

      const failedTasks = await this.prisma.mediaProcessingTask.count({
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.FAILED,
        },
      });

      // 获取处理时间统计
      const durationStats = await this.prisma.mediaProcessingTask.aggregate({
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.COMPLETED,
          duration: { not: null },
        },
      });

      // 获取文件大小与处理时间的关系
      const sizeVsDuration = await this.prisma.mediaProcessingTask.findMany({
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.COMPLETED,
          duration: { not: null },
        },
        include: {
          media: {
            select: {
              fileSize: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 100,
      });

      const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const failureRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

      return {
        totalTasks,
        completedTasks,
        failedTasks,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        durationStats: {
          average: durationStats._avg.duration,
          minimum: durationStats._min.duration,
          maximum: durationStats._max.duration,
        },
        sizeVsDuration: sizeVsDuration.map(task => ({
          fileSize: task.media?.fileSize || 0,
          duration: task.duration,
          efficiency: task.media?.fileSize && task.duration 
            ? Math.round((task.media.fileSize / 1024 / 1024) / task.duration * 100) / 100 // MB/s
            : 0,
        })),
      };
    } catch (error) {
      console.error('获取性能统计失败:', error);
      throw TRPCErrorHandler.internalError('获取性能统计失败');
    }
  }

  /**
   * 获取每日转码统计
   */
  async getDailyStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyStats = await this.prisma.mediaProcessingTask.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          taskType: TaskType.TRANSCODE,
          createdAt: {
            gte: startDate,
          },
        },
      });

      // 按日期分组
      const tasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          taskType: TaskType.TRANSCODE,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
          status: true,
          duration: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 按日期分组统计
      const dailyBreakdown = tasks.reduce((acc, task) => {
        const date = task.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            total: 0,
            completed: 0,
            failed: 0,
            processing: 0,
            pending: 0,
            totalDuration: 0,
          };
        }
        
        acc[date].total++;
        acc[date][task.status.toLowerCase() as keyof typeof acc[typeof date]]++;
        
        if (task.duration) {
          acc[date].totalDuration += task.duration;
        }
        
        return acc;
      }, {} as Record<string, any>);

      return {
        summary: dailyStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        dailyBreakdown,
        period: {
          startDate,
          endDate: new Date(),
          days,
        },
      };
    } catch (error) {
      console.error('获取每日统计失败:', error);
      throw TRPCErrorHandler.internalError('获取每日统计失败');
    }
  }

  /**
   * 获取错误分析
   */
  async getErrorAnalysis() {
    try {
      const failedTasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          taskType: TaskType.TRANSCODE,
          status: TranscodingStatus.FAILED,
          errorMessage: {
            not: null,
          },
        },
        select: {
          errorMessage: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1000,
      });

      // 分析错误类型
      const errorTypes = failedTasks.reduce((acc, task) => {
        const errorMessage = task.errorMessage || '未知错误';
        const errorType = this.categorizeError(errorMessage);
        
        if (!acc[errorType]) {
          acc[errorType] = {
            count: 0,
            examples: [],
          };
        }
        
        acc[errorType].count++;
        if (acc[errorType].examples.length < 3) {
          acc[errorType].examples.push({
            message: errorMessage,
            date: task.createdAt,
          });
        }
        
        return acc;
      }, {} as Record<string, any>);

      return {
        totalFailures: failedTasks.length,
        errorTypes,
        recentFailures: failedTasks.slice(0, 10),
      };
    } catch (error) {
      console.error('获取错误分析失败:', error);
      throw TRPCErrorHandler.internalError('获取错误分析失败');
    }
  }

  /**
   * 分类错误类型
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('超时')) {
      return '超时错误';
    }
    if (message.includes('memory') || message.includes('内存')) {
      return '内存错误';
    }
    if (message.includes('disk') || message.includes('磁盘') || message.includes('space')) {
      return '磁盘空间错误';
    }
    if (message.includes('format') || message.includes('格式')) {
      return '格式错误';
    }
    if (message.includes('permission') || message.includes('权限')) {
      return '权限错误';
    }
    if (message.includes('network') || message.includes('网络')) {
      return '网络错误';
    }
    
    return '其他错误';
  }
}

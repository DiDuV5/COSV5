/**
 * @fileoverview 转码任务查询服务
 * @description 处理转码任务状态查询和媒体处理任务查询
 */

import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  TranscodingTaskStatus,
  MediaProcessingTask,
  TranscodingStatus,
  TaskType,
} from '../types/transcoding-types';

export class TranscodingQueryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取转码任务状态
   */
  async getTaskStatus(mediaId: string): Promise<TranscodingTaskStatus> {
    try {
      const tasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          mediaId,
          taskType: TaskType.TRANSCODE,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      if (tasks.length === 0) {
        return {
          status: TranscodingStatus.PENDING,
          progress: 0,
          startedAt: null,
          completedAt: null,
          duration: null,
          errorMessage: '未找到转码任务',
          inputPath: null,
          outputPath: null,
        };
      }

      const task = tasks[0];

      if (!task) {
        throw TRPCErrorHandler.notFound('未找到转码任务');
      }

      return {
        status: task.status as any,
        progress: task.progress,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        duration: task.duration,
        errorMessage: task.errorMessage,
        inputPath: task.inputPath,
        outputPath: task.outputPath,
      };
    } catch (error) {
      console.error('获取转码任务状态失败:', error);
      throw TRPCErrorHandler.internalError('获取转码任务状态失败');
    }
  }

  /**
   * 获取媒体文件的所有处理任务
   */
  async getMediaProcessingTasks(mediaId: string): Promise<MediaProcessingTask[]> {
    try {
      const tasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          mediaId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return tasks.map(task => ({
        id: task.id,
        taskType: task.taskType as any,
        status: task.status as any,
        progress: task.progress,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        duration: task.duration,
        errorMessage: task.errorMessage,
        options: task.options ? this.parseTaskOptions(task.options) : null,
      }));
    } catch (error) {
      console.error('获取媒体处理任务失败:', error);
      throw TRPCErrorHandler.internalError('获取媒体处理任务失败');
    }
  }

  /**
   * 根据任务ID获取任务详情
   */
  async getTaskById(taskId: string) {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
        include: {
          media: {
            select: {
              filename: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
            },
          },
        },
      });

      if (!task) {
        throw TRPCErrorHandler.notFound('转码任务不存在');
      }

      return task;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      if (error instanceof Error && error.message.includes('转码任务不存在')) {
        throw error;
      }
      throw TRPCErrorHandler.internalError('获取任务详情失败');
    }
  }

  /**
   * 获取用户的转码任务列表
   */
  async getUserTranscodingTasks(userId: string, limit = 20, offset = 0) {
    try {
      const tasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          media: {
            post: {
              authorId: userId,
            },
          },
          taskType: TaskType.TRANSCODE,
        },
        include: {
          media: {
            select: {
              filename: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      const total = await this.prisma.mediaProcessingTask.count({
        where: {
          media: {
            post: {
              authorId: userId,
            },
          },
          taskType: TaskType.TRANSCODE,
        },
      });

      return {
        tasks: tasks.map(task => ({
          id: task.id,
          status: task.status,
          progress: task.progress,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          duration: task.duration,
          errorMessage: task.errorMessage,
          createdAt: task.createdAt,
          mediaId: task.mediaId,
        })),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('获取用户转码任务失败:', error);
      throw TRPCErrorHandler.internalError('获取用户转码任务失败');
    }
  }

  /**
   * 解析任务选项
   */
  private parseTaskOptions(options: string): any {
    try {
      return JSON.parse(options);
    } catch (error) {
      console.warn('解析任务选项失败:', error);
      return null;
    }
  }

  /**
   * 检查任务是否存在
   */
  async taskExists(taskId: string): Promise<boolean> {
    try {
      const count = await this.prisma.mediaProcessingTask.count({
        where: { id: taskId },
      });
      return count > 0;
    } catch (error) {
      console.error('检查任务存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取任务的媒体信息
   */
  async getTaskMediaInfo(taskId: string) {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
        include: {
          media: true,
        },
      });

      return task?.media || null;
    } catch (error) {
      console.error('获取任务媒体信息失败:', error);
      return null;
    }
  }
}

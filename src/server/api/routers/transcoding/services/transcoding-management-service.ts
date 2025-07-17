/**
 * @fileoverview 转码任务管理服务
 * @description 处理转码任务的重试、取消和状态更新
 */

import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  TaskOperationResponse,
  TranscodingValidator,
  TranscodingStatus,
} from '../types/transcoding-types';

export class TranscodingManagementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 重试失败的转码任务
   */
  async retryFailedTask(taskId: string): Promise<TaskOperationResponse> {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
        include: {
          media: true,
        },
      });

      if (!task) {
        throw TRPCErrorHandler.notFound('转码任务不存在');
      }

      if (!TranscodingValidator.canRetryTask(task.status as any)) {
        throw TRPCErrorHandler.validationError('只能重试失败的任务');
      }

      // 重置任务状态
      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          status: TranscodingStatus.PENDING,
          progress: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          duration: null,
        },
      });

      // 这里可以触发重新处理逻辑
      // 实际实现中可能需要队列系统来处理
      await this.triggerTaskReprocessing(taskId);

      return {
        success: true,
        message: '转码任务已重置，等待重新处理',
      };
    } catch (error) {
      console.error('重试转码任务失败:', error);
      if (error instanceof Error && error.message.includes('转码任务不存在')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('只能重试失败的任务')) {
        throw error;
      }
      throw TRPCErrorHandler.internalError('重试转码任务失败');
    }
  }

  /**
   * 取消正在进行的转码任务
   */
  async cancelTask(taskId: string): Promise<TaskOperationResponse> {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw TRPCErrorHandler.notFound('转码任务不存在');
      }

      if (!TranscodingValidator.canCancelTask(task.status as any)) {
        throw TRPCErrorHandler.validationError('只能取消正在进行的任务');
      }

      // 计算任务持续时间
      const duration = TranscodingValidator.calculateDuration(
        task.startedAt,
        new Date()
      );

      // 更新任务状态为已取消
      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          status: TranscodingStatus.CANCELLED,
          errorMessage: '任务已被用户取消',
          completedAt: new Date(),
          duration,
        },
      });

      // 这里可以添加实际的进程终止逻辑
      // 例如杀死FFmpeg进程
      await this.terminateTaskProcess(taskId);

      return {
        success: true,
        message: '转码任务已取消',
      };
    } catch (error) {
      console.error('取消转码任务失败:', error);
      if (error instanceof Error && error.message.includes('转码任务不存在')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('只能取消正在进行的任务')) {
        throw error;
      }
      throw TRPCErrorHandler.internalError('取消转码任务失败');
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId: string, progress: number): Promise<void> {
    try {
      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          progress: Math.max(0, Math.min(100, progress)),
          status: progress >= 100 ? TranscodingStatus.COMPLETED : TranscodingStatus.PROCESSING,
          completedAt: progress >= 100 ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('更新任务进度失败:', error);
      throw TRPCErrorHandler.internalError('更新任务进度失败');
    }
  }

  /**
   * 标记任务为失败
   */
  async markTaskAsFailed(taskId: string, errorMessage: string): Promise<void> {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw TRPCErrorHandler.notFound('转码任务不存在');
      }

      const duration = TranscodingValidator.calculateDuration(
        task.startedAt,
        new Date()
      );

      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          status: TranscodingStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
          duration,
        },
      });
    } catch (error) {
      console.error('标记任务失败状态失败:', error);
      throw TRPCErrorHandler.internalError('标记任务失败状态失败');
    }
  }

  /**
   * 标记任务为完成
   */
  async markTaskAsCompleted(taskId: string, outputPath?: string): Promise<void> {
    try {
      const task = await this.prisma.mediaProcessingTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw TRPCErrorHandler.notFound('转码任务不存在');
      }

      const duration = TranscodingValidator.calculateDuration(
        task.startedAt,
        new Date()
      );

      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          status: TranscodingStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          duration,
          outputPath,
        },
      });
    } catch (error) {
      console.error('标记任务完成状态失败:', error);
      throw TRPCErrorHandler.internalError('标记任务完成状态失败');
    }
  }

  /**
   * 开始任务处理
   */
  async startTaskProcessing(taskId: string): Promise<void> {
    try {
      await this.prisma.mediaProcessingTask.update({
        where: { id: taskId },
        data: {
          status: TranscodingStatus.PROCESSING,
          startedAt: new Date(),
          progress: 0,
        },
      });
    } catch (error) {
      console.error('开始任务处理失败:', error);
      throw TRPCErrorHandler.internalError('开始任务处理失败');
    }
  }

  /**
   * 批量更新任务状态
   */
  async batchUpdateTaskStatus(
    taskIds: string[],
    status: keyof typeof TranscodingStatus,
    errorMessage?: string
  ): Promise<TaskOperationResponse> {
    try {
      const updateData: any = { status };
      
      if (TranscodingValidator.isTaskCompleted(status)) {
        updateData.completedAt = new Date();
      }
      
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      const result = await this.prisma.mediaProcessingTask.updateMany({
        where: {
          id: { in: taskIds },
        },
        data: updateData,
      });

      return {
        success: true,
        message: `已更新 ${result.count} 个任务的状态`,
      };
    } catch (error) {
      console.error('批量更新任务状态失败:', error);
      throw TRPCErrorHandler.internalError('批量更新任务状态失败');
    }
  }

  /**
   * 触发任务重新处理（占位符方法）
   */
  private async triggerTaskReprocessing(taskId: string): Promise<void> {
    // 这里应该实现实际的任务重新处理逻辑
    // 例如：添加到队列、发送消息等
    console.log(`触发任务重新处理: ${taskId}`);
    
    // 示例：可以调用外部服务或队列系统
    // await this.queueService.addTask(taskId);
  }

  /**
   * 终止任务进程（占位符方法）
   */
  private async terminateTaskProcess(taskId: string): Promise<void> {
    // 这里应该实现实际的进程终止逻辑
    // 例如：杀死FFmpeg进程、清理临时文件等
    console.log(`终止任务进程: ${taskId}`);
    
    // 示例：可以调用进程管理器
    // await this.processManager.killTask(taskId);
  }

  /**
   * 获取可重试的任务列表
   */
  async getRetryableTasks(limit = 50) {
    try {
      return await this.prisma.mediaProcessingTask.findMany({
        where: {
          status: TranscodingStatus.FAILED,
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
    } catch (error) {
      console.error('获取可重试任务失败:', error);
      throw TRPCErrorHandler.internalError('获取可重试任务失败');
    }
  }

  /**
   * 获取正在处理的任务列表
   */
  async getProcessingTasks() {
    try {
      return await this.prisma.mediaProcessingTask.findMany({
        where: {
          status: TranscodingStatus.PROCESSING,
        },
        orderBy: {
          startedAt: 'asc',
        },
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
    } catch (error) {
      console.error('获取正在处理任务失败:', error);
      throw TRPCErrorHandler.internalError('获取正在处理任务失败');
    }
  }
}

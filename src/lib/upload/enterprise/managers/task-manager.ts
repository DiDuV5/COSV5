/**
 * @fileoverview 清理任务管理器
 * @description 管理清理任务的生命周期和状态
 * @author Augment AI
 * @date 2025-07-03
 */

import { EventEmitter } from 'events';
import {
  CleanupTaskType,
  CleanupStatus,
  CleanupResult,
  TaskProgress,
  CleanupStats
} from '../types/cleanup-types';

/**
 * 任务管理器类
 */
export class TaskManager extends EventEmitter {
  private runningTasks = new Set<CleanupTaskType>();
  private taskHistory: CleanupResult[] = [];
  private taskProgress = new Map<CleanupTaskType, TaskProgress>();
  private maxHistorySize = 1000;

  constructor() {
    super();
  }

  /**
   * 添加任务到运行列表
   */
  addRunningTask(taskType: CleanupTaskType): void {
    this.runningTasks.add(taskType);
    this.emit('taskAdded', { taskType });
  }

  /**
   * 从运行列表移除任务
   */
  removeRunningTask(taskType: CleanupTaskType): void {
    this.runningTasks.delete(taskType);
    this.taskProgress.delete(taskType);
    this.emit('taskRemoved', { taskType });
  }

  /**
   * 检查任务是否正在运行
   */
  isTaskRunning(taskType: CleanupTaskType): boolean {
    return this.runningTasks.has(taskType);
  }

  /**
   * 获取正在运行的任务列表
   */
  getRunningTasks(): CleanupTaskType[] {
    return Array.from(this.runningTasks);
  }

  /**
   * 获取运行中任务数量
   */
  getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  /**
   * 更新任务进度
   */
  updateTaskProgress(progress: TaskProgress): void {
    this.taskProgress.set(progress.taskType, progress);
    this.emit('progressUpdated', progress);
  }

  /**
   * 获取任务进度
   */
  getTaskProgress(taskType: CleanupTaskType): TaskProgress | undefined {
    return this.taskProgress.get(taskType);
  }

  /**
   * 获取所有任务进度
   */
  getAllTaskProgress(): TaskProgress[] {
    return Array.from(this.taskProgress.values());
  }

  /**
   * 添加任务结果到历史记录
   */
  addTaskResult(result: CleanupResult): void {
    this.taskHistory.push(result);
    
    // 限制历史记录大小
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-this.maxHistorySize);
    }
    
    this.emit('taskCompleted', result);
  }

  /**
   * 获取任务历史记录
   */
  getTaskHistory(limit?: number): CleanupResult[] {
    const history = this.taskHistory.slice().reverse(); // 最新的在前
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取特定类型的任务历史
   */
  getTaskHistoryByType(taskType: CleanupTaskType, limit?: number): CleanupResult[] {
    const filtered = this.taskHistory
      .filter(result => result.taskType === taskType)
      .reverse();
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * 获取任务统计信息
   */
  getTaskStats(): CleanupStats {
    const totalTasks = this.taskHistory.length;
    const successfulTasks = this.taskHistory.filter(r => r.status === CleanupStatus.COMPLETED).length;
    const failedTasks = this.taskHistory.filter(r => r.status === CleanupStatus.FAILED).length;
    
    const totalDuration = this.taskHistory.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;
    
    const totalBytesFreed = this.taskHistory.reduce((sum, r) => sum + r.bytesFreed, 0);
    
    // 找出最频繁的任务类型
    const taskTypeCounts = this.taskHistory.reduce((counts, result) => {
      counts[result.taskType] = (counts[result.taskType] || 0) + 1;
      return counts;
    }, {} as Record<CleanupTaskType, number>);
    
    const mostFrequentTask = Object.entries(taskTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as CleanupTaskType;
    
    const lastExecution = this.taskHistory.length > 0 
      ? this.taskHistory[this.taskHistory.length - 1].endTime || new Date()
      : new Date();

    return {
      totalTasksExecuted: totalTasks,
      successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
      averageDuration,
      totalBytesFreed,
      mostFrequentTask,
      lastExecutionTime: lastExecution,
      uptime: Date.now() - (this.taskHistory[0]?.startTime.getTime() || Date.now())
    };
  }

  /**
   * 获取任务成功率
   */
  getSuccessRate(taskType?: CleanupTaskType): number {
    const relevantTasks = taskType 
      ? this.taskHistory.filter(r => r.taskType === taskType)
      : this.taskHistory;
    
    if (relevantTasks.length === 0) return 0;
    
    const successfulTasks = relevantTasks.filter(r => r.status === CleanupStatus.COMPLETED).length;
    return successfulTasks / relevantTasks.length;
  }

  /**
   * 获取平均执行时间
   */
  getAverageExecutionTime(taskType?: CleanupTaskType): number {
    const relevantTasks = taskType 
      ? this.taskHistory.filter(r => r.taskType === taskType)
      : this.taskHistory;
    
    if (relevantTasks.length === 0) return 0;
    
    const totalDuration = relevantTasks.reduce((sum, r) => sum + (r.duration || 0), 0);
    return totalDuration / relevantTasks.length;
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(limit: number = 10): Array<{
    taskType: CleanupTaskType;
    error: string;
    timestamp: Date;
  }> {
    return this.taskHistory
      .filter(r => r.errors.length > 0)
      .slice(-limit)
      .reverse()
      .flatMap(r => r.errors.map(error => ({
        taskType: r.taskType,
        error,
        timestamp: r.endTime || r.startTime
      })));
  }

  /**
   * 清理旧的历史记录
   */
  cleanupHistory(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.taskHistory.length;
    
    this.taskHistory = this.taskHistory.filter(result => 
      result.startTime > cutoffDate
    );
    
    const removedCount = initialLength - this.taskHistory.length;
    
    if (removedCount > 0) {
      this.emit('historyCleanup', { removedCount, cutoffDate });
    }
    
    return removedCount;
  }

  /**
   * 导出任务历史
   */
  exportHistory(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'TaskType', 'Status', 'StartTime', 'EndTime', 'Duration',
        'ItemsProcessed', 'ItemsDeleted', 'BytesFreed', 'Errors', 'Warnings'
      ];
      
      const rows = this.taskHistory.map(result => [
        result.taskType,
        result.status,
        result.startTime.toISOString(),
        result.endTime?.toISOString() || '',
        result.duration || 0,
        result.itemsProcessed,
        result.itemsDeleted,
        result.bytesFreed,
        result.errors.join('; '),
        result.warnings.join('; ')
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.taskHistory, null, 2);
  }

  /**
   * 重置所有数据
   */
  reset(): void {
    this.runningTasks.clear();
    this.taskHistory = [];
    this.taskProgress.clear();
    this.emit('reset');
  }

  /**
   * 获取任务摘要
   */
  getTaskSummary(): {
    running: number;
    completed: number;
    failed: number;
    totalBytesFreed: number;
    averageSuccessRate: number;
  } {
    const completed = this.taskHistory.filter(r => r.status === CleanupStatus.COMPLETED).length;
    const failed = this.taskHistory.filter(r => r.status === CleanupStatus.FAILED).length;
    const totalBytesFreed = this.taskHistory.reduce((sum, r) => sum + r.bytesFreed, 0);
    const successRate = this.getSuccessRate();

    return {
      running: this.runningTasks.size,
      completed,
      failed,
      totalBytesFreed,
      averageSuccessRate: successRate
    };
  }

  /**
   * 检查是否有失败的任务需要重试
   */
  getFailedTasksForRetry(maxAge: number = 60 * 60 * 1000): CleanupTaskType[] {
    const cutoffTime = Date.now() - maxAge;
    
    return this.taskHistory
      .filter(result => 
        result.status === CleanupStatus.FAILED &&
        result.startTime.getTime() > cutoffTime
      )
      .map(result => result.taskType)
      .filter((taskType, index, array) => array.indexOf(taskType) === index); // 去重
  }
}

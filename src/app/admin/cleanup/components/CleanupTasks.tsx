/**
 * @fileoverview 清理任务组件
 * @description 专门处理清理任务的显示和操作
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React, { useState } from 'react';
import { Play, Pause, Settings, AlertTriangle, Clock, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CleanupService,
  CleanupTaskType,
  type TaskConfig,
  type CleanupResult,
} from '../services/cleanup-service';

/**
 * 清理任务属性接口
 */
export interface CleanupTasksProps {
  tasks: TaskConfig[];
  isPending?: boolean;
  dryRun?: boolean;
  className?: string;
  onExecuteTask: (_taskId: CleanupTaskType, _dryRun: boolean) => Promise<CleanupResult>;
  onToggleTask: (_taskId: CleanupTaskType, enabled: boolean) => Promise<void>;
  onConfigureTask?: (taskId: CleanupTaskType) => void;
}

/**
 * 清理任务组件
 */
export function CleanupTasks({
  tasks,
  isPending = false,
  dryRun = true,
  className,
  onExecuteTask,
  onToggleTask,
  onConfigureTask,
}: CleanupTasksProps) {
  const [executingTask, setExecutingTask] = useState<CleanupTaskType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    task: TaskConfig | null;
  }>({ open: false, task: null });

  /**
   * 获取任务图标
   */
  const getTaskIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Trash2: <HardDrive className="h-4 w-4" />,
      FileX: <AlertTriangle className="h-4 w-4" />,
      Copy: <HardDrive className="h-4 w-4" />,
      FileText: <HardDrive className="h-4 w-4" />,
      Database: <HardDrive className="h-4 w-4" />,
    };
    return icons[iconName] || <HardDrive className="h-4 w-4" />;
  };

  /**
   * 获取危险级别颜色
   */
  const getDangerLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * 处理任务执行
   */
  const handleExecuteTask = async (task: TaskConfig) => {
    // 验证安全性
    const safety = CleanupService.validateCleanupSafety(task.id, dryRun);

    if (!safety.isSafe && !dryRun) {
      setConfirmDialog({ open: true, task });
      return;
    }

    await executeTask(task);
  };

  /**
   * 执行任务
   */
  const executeTask = async (task: TaskConfig) => {
    setExecutingTask(task.id);
    try {
      await onExecuteTask(task.id, dryRun);
    } finally {
      setExecutingTask(null);
    }
  };

  /**
   * 处理任务切换
   */
  const handleToggleTask = async (task: TaskConfig, enabled: boolean) => {
    await onToggleTask(task.id, enabled);
  };

  /**
   * 确认执行危险任务
   */
  const handleConfirmExecution = async () => {
    if (confirmDialog.task) {
      await executeTask(confirmDialog.task);
    }
    setConfirmDialog({ open: false, task: null });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {tasks.map((task) => {
        const isExecuting = executingTask === task.id;
        const safety = CleanupService.validateCleanupSafety(task.id, dryRun);
        const estimate = CleanupService.estimateCleanupTime(
          task.estimatedFiles,
          task.estimatedSize
        );

        return (
          <Card key={task.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTaskIcon(task.icon)}
                  <div>
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className={getDangerLevelColor(task.dangerLevel)}
                  >
                    {task.dangerLevel === 'low' && '低风险'}
                    {task.dangerLevel === 'medium' && '中风险'}
                    {task.dangerLevel === 'high' && '高风险'}
                  </Badge>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`task-${task.id}`} className="text-sm">
                      启用
                    </Label>
                    <Switch
                      id={`task-${task.id}`}
                      checked={task.enabled}
                      onCheckedChange={(enabled) => handleToggleTask(task, enabled)}
                      disabled={isPending || isExecuting}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 任务统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">预计文件</div>
                  <div className="font-medium">{task.estimatedFiles.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">预计大小</div>
                  <div className="font-medium">
                    {CleanupService.formatBytes(task.estimatedSize)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">执行计划</div>
                  <div className="font-medium">{task.schedule}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">上次运行</div>
                  <div className="font-medium">
                    {CleanupService.formatDate(task.lastRun)}
                  </div>
                </div>
              </div>

              {/* 预计时间 */}
              {task.estimatedFiles > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    预计耗时: {estimate.estimatedMinutes} 分钟 - {estimate.description}
                  </span>
                </div>
              )}

              {/* 安全警告 */}
              {safety.warnings.length > 0 && (
                <Alert variant={task.dangerLevel === 'high' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {safety.warnings.map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 执行进度 */}
              {isExecuting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>执行中...</span>
                    <span>{dryRun ? '模拟模式' : '实际执行'}</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleExecuteTask(task)}
                    disabled={!task.enabled || isPending || isExecuting}
                    variant={task.dangerLevel === 'high' ? 'destructive' : 'default'}
                    size="sm"
                  >
                    {isExecuting ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        执行中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {dryRun ? '模拟运行' : '立即执行'}
                      </>
                    )}
                  </Button>

                  {onConfigureTask && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConfigureTask(task.id)}
                      disabled={isPending || isExecuting}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      配置
                    </Button>
                  )}
                </div>

                {!task.enabled && (
                  <Badge variant="secondary">已禁用</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) =>
        setConfirmDialog({ open, task: confirmDialog.task })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认执行清理任务</DialogTitle>
            <DialogDescription>
              您即将执行 &ldquo;{confirmDialog.task?.name}&rdquo;，这是一个高风险操作。
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.task && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">请注意以下风险：</div>
                    {CleanupService.validateCleanupSafety(confirmDialog.task.id, false)
                      .warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground">
                <div>预计处理文件: {confirmDialog.task.estimatedFiles.toLocaleString()}</div>
                <div>预计处理大小: {CleanupService.formatBytes(confirmDialog.task.estimatedSize)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, task: null })}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExecution}
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * 清理任务骨架组件
 */
export function CleanupTasksSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-48" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-6 bg-gray-200 rounded w-12" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-12" />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <div className="h-8 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

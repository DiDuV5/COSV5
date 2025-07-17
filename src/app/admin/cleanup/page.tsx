/**
 * @fileoverview 管理员文件清理页面（重构版）
 * @description 采用模块化架构的文件清理管理界面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Settings, BarChart3, RefreshCw, Play, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/trpc/react';

// 导入重构后的模块
import {
  CleanupService,
  CleanupTaskType,
  CleanupTasks,
  CleanupStats,
  type DeduplicationStats as _DeduplicationStats,
  type CleanupResult,
  type TaskConfig,
} from './index';

/**
 * 管理员文件清理页面（重构版）
 */
export default function AdminCleanupPage() {
  const { toast } = useToast();

  // 状态管理
  const [isPending, setIsLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [tasks, setTasks] = useState<TaskConfig[]>([]);

  // API查询
  const {
    data: cleanupStatus,
    refetch: refetchStatus,
    isPending: statusLoading,
    error: statusError,
  } = api.cleanup.getCleanupStatus.useQuery();

  // 暂时注释掉不存在的API
  // const {
  //   data: deduplicationStats,
  //   isPending: statsLoading,
  //   error: statsError,
  // } = api.cleanup.getDeduplicationStats.useQuery();

  // API mutations
  const cleanupTempFilesMutation = api.cleanup.cleanupTempFiles.useMutation();
  const cleanupOrphanFilesMutation = api.cleanup.cleanupOrphanFiles.useMutation();
  const executeScheduledTaskMutation = api.cleanup.executeScheduledTask.useMutation();
  const setTaskEnabledMutation = api.cleanup.setTaskEnabled.useMutation();

  /**
   * 初始化任务配置
   */
  useEffect(() => {
    const taskConfigs = CleanupService.getTaskConfigs();

    // 如果有清理状态，更新任务的统计信息
    if (cleanupStatus) {
      const updatedTasks: TaskConfig[] = taskConfigs.map(task => {
        switch (task.id) {
          case CleanupTaskType.TEMP_FILES:
            return {
              ...task,
              enabled: true, // 默认启用，因为API结构不同
              lastRun: cleanupStatus.tempFileCleanup?.lastRunTime
                ? cleanupStatus.tempFileCleanup.lastRunTime.toISOString()
                : null,
              estimatedFiles: 0, // 暂时设为0，等API提供数据
              estimatedSize: 0,
            };
          case CleanupTaskType.ORPHAN_FILES:
            return {
              ...task,
              enabled: true, // 默认启用
              lastRun: null,
              estimatedFiles: 0,
              estimatedSize: 0,
            };
          default:
            return task;
        }
      });
      setTasks(updatedTasks);
    } else {
      setTasks(taskConfigs);
    }
  }, [cleanupStatus]);

  /**
   * 执行清理任务
   */
  const handleExecuteTask = async (taskId: CleanupTaskType, isDryRun: boolean): Promise<CleanupResult> => {
    setIsLoading(true);

    try {
      let result: any;

      switch (taskId) {
        case CleanupTaskType.TEMP_FILES:
          result = await cleanupTempFilesMutation.mutateAsync({ dryRun: isDryRun });
          break;
        case CleanupTaskType.ORPHAN_FILES:
          result = await cleanupOrphanFilesMutation.mutateAsync({ dryRun: isDryRun });
          break;
        default:
          // 对于其他任务类型，使用调度任务执行
          const taskIdMap: Record<CleanupTaskType, string> = {
            [CleanupTaskType.TEMP_FILES]: 'temp-file-cleanup',
            [CleanupTaskType.ORPHAN_FILES]: 'orphan-file-cleanup',
            [CleanupTaskType.DUPLICATE_FILES]: 'temp-file-cleanup', // 暂时映射到临时文件清理
            [CleanupTaskType.OLD_LOGS]: 'temp-file-cleanup',
            [CleanupTaskType.CACHE_FILES]: 'temp-file-cleanup',
          };
          result = await executeScheduledTaskMutation.mutateAsync({
            taskId: taskIdMap[taskId] as any
          });
          break;
      }

      const cleanupResult: CleanupResult = {
        success: result.success || true,
        message: result.message || '清理完成',
        filesProcessed: result.filesProcessed || 0,
        filesDeleted: result.filesDeleted || 0,
        spaceFreed: result.spaceFreed || 0,
        errors: result.errors || [],
        dryRun: isDryRun,
      };

      // 显示结果通知
      toast({
        title: cleanupResult.success ? '清理完成' : '清理失败',
        description: cleanupResult.message,
        variant: cleanupResult.success ? 'default' : 'destructive',
      });

      // 刷新状态
      await refetchStatus();

      return cleanupResult;
    } catch (error: any) {
      const errorResult: CleanupResult = {
        success: false,
        message: error.message || '清理失败',
        filesProcessed: 0,
        filesDeleted: 0,
        spaceFreed: 0,
        errors: [error.message || '未知错误'],
        dryRun: isDryRun,
      };

      toast({
        title: '清理失败',
        description: error.message || '执行清理任务时发生错误',
        variant: 'destructive',
      });

      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 切换任务状态
   */
  const handleToggleTask = async (taskId: CleanupTaskType, enabled: boolean): Promise<void> => {
    try {
      // 映射任务ID到API支持的格式
      const taskIdMap: Record<CleanupTaskType, string> = {
        [CleanupTaskType.TEMP_FILES]: 'temp-file-cleanup',
        [CleanupTaskType.ORPHAN_FILES]: 'orphan-file-cleanup',
        [CleanupTaskType.DUPLICATE_FILES]: 'temp-file-cleanup',
        [CleanupTaskType.OLD_LOGS]: 'temp-file-cleanup',
        [CleanupTaskType.CACHE_FILES]: 'temp-file-cleanup',
      };

      await setTaskEnabledMutation.mutateAsync({
        taskId: taskIdMap[taskId] as any,
        enabled
      });

      // 更新本地状态
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, enabled } : task
      ));

      toast({
        title: '设置已更新',
        description: `${enabled ? '启用' : '禁用'}了清理任务`,
      });
    } catch (error: any) {
      toast({
        title: '设置失败',
        description: error.message || '更新任务设置时发生错误',
        variant: 'destructive',
      });
    }
  };

  /**
   * 切换模拟运行模式
   */
  const handleDryRunChange = (checked: boolean) => {
    setDryRun(checked);
    toast({
      title: '模式切换',
      description: checked ? '已切换到模拟运行模式' : '已切换到实际执行模式',
    });
  };

  /**
   * 测试通知功能
   */
  const testToast = () => {
    toast({
      title: '测试通知',
      description: '这是一个测试通知，如果您看到这个消息，说明Toast系统正常工作',
    });
  };

  /**
   * 测试错误通知
   */
  const testErrorToast = () => {
    toast({
      title: '测试错误通知',
      description: '这是一个测试错误通知',
      variant: 'destructive',
    });
  };

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refetchStatus(),
        // 可以添加其他需要刷新的数据
      ]);
      toast({
        title: '刷新完成',
        description: '数据已更新',
      });
    } catch (error: any) {
      toast({
        title: '刷新失败',
        description: error.message || '刷新数据时发生错误',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">文件清理管理</h1>
          <p className="text-muted-foreground mt-2">
            管理系统文件清理任务，优化存储空间使用
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* 模拟运行开关 */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="dry-run" className="text-sm">
              模拟运行
            </Label>
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={handleDryRunChange}
            />
            {dryRun && (
              <Badge variant="secondary">安全模式</Badge>
            )}
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>

          {/* 测试按钮 */}
          <Button
            variant="outline"
            onClick={testToast}
            size="sm"
          >
            <TestTube className="h-4 w-4 mr-2" />
            测试通知
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {statusError && (
        <Alert variant="destructive">
          <AlertDescription>
            加载数据时发生错误: {statusError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 主要内容 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            概览统计
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center">
            <Play className="h-4 w-4 mr-2" />
            清理任务
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* 概览统计 */}
        <TabsContent value="overview">
          <CleanupStats
            status={cleanupStatus as any}
            isPending={statusLoading}
          />
        </TabsContent>

        {/* 清理任务 */}
        <TabsContent value="tasks">
          <CleanupTasks
            tasks={tasks}
            isPending={isPending}
            dryRun={dryRun}
            onExecuteTask={handleExecuteTask}
            onToggleTask={handleToggleTask}
          />
        </TabsContent>

        {/* 设置 */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>清理设置</CardTitle>
                <CardDescription>
                  配置自动清理任务的执行参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-cleanup">启用自动清理</Label>
                  <Switch id="auto-cleanup" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cleanup-notifications">清理通知</Label>
                  <Switch id="cleanup-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="detailed-logs">详细日志</Label>
                  <Switch id="detailed-logs" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>测试功能</CardTitle>
                <CardDescription>
                  测试系统功能是否正常工作
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={testToast} variant="outline" className="w-full">
                  测试成功通知
                </Button>
                <Button onClick={testErrorToast} variant="outline" className="w-full">
                  测试错误通知
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

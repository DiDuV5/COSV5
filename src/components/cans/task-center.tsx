/**
 * @fileoverview 罐头任务中心组件（重构版）
 * @description 采用模块化架构的任务中心，支持任务管理、过滤和完成
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, TrendingUp, Clock, Coins, Trophy, Zap } from "lucide-react";

// 导入重构后的模块
import {
  TaskDataService,
  type Task,
  type TodayProgress,
  type TaskFilterOptions
} from './task-center/services/task-data-service';
import { TaskIconService } from './task-center/services/task-icon-service';
import { TaskCard, TaskCardSkeleton } from './task-center/components/TaskCard';
import { TaskFilter } from './task-center/components/TaskFilter';

/**
 * 任务中心属性接口
 */
export interface TaskCenterProps {
  showOnlyAvailable?: boolean;
  className?: string;
  onTaskComplete?: (taskType: string, cansEarned: number) => void;
}

/**
 * 任务中心组件（重构版）
 */
export function TaskCenter({
  showOnlyAvailable = false,
  className,
  onTaskComplete,
}: TaskCenterProps) {
  // 状态管理
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(showOnlyAvailable);
  const [filters, setFilters] = useState<TaskFilterOptions>({
    category: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // API调用
  const {
    data: allTasks,
    isPending: tasksLoading,
    refetch: refetchTasks
  } = api.cans.getAvailableTasks.useQuery();

  // 完成任务mutation
  const completeTaskMutation = api.cans.completeTask.useMutation({
    onSuccess: (data: {
      message?: string;
      remainingTasks?: number;
      remainingToday?: number;
      taskType?: string;
      cansEarned?: number
    }) => {
      toast.success(data.message || '任务完成成功', {
        description: `剩余 ${data.remainingTasks || data.remainingToday || 0} 次任务机会`,
        duration: 4000,
      });
      refetchTasks();

      // 调用外部回调
      if (onTaskComplete && data.taskType && data.cansEarned) {
        onTaskComplete(data.taskType, data.cansEarned);
      }
    },
    onError: (error) => {
      toast.error("任务完成失败", {
        description: error.message,
        duration: 5000,
        action: {
          label: "重试",
          onClick: () => {
            if (completingTask) {
              handleCompleteTask(completingTask);
            }
          },
        },
      });
    },
    onSettled: () => {
      setCompletingTask(null);
    },
  });

  /**
   * 处理完成任务
   */
  const handleCompleteTask = (taskType: string) => {
    setCompletingTask(taskType);
    completeTaskMutation.mutate({ taskType });
  };

  /**
   * 处理查看任务详情
   */
  const handleViewTaskDetails = (task: Task) => {
    // 这里可以打开任务详情模态框或导航到详情页
    console.log('查看任务详情:', task);
    toast.info(`查看任务详情: ${task.name}`);
  };

  // 数据处理
  const processedTasks = useMemo(() => {
    if (!allTasks) return [];

    // 格式化任务数据
    const formatted: Task[] = allTasks.map(task => TaskDataService.formatTaskForDisplay(task));

    // 应用过滤器
    const filtered = TaskDataService.filterTasks(formatted, {
      ...filters,
      showOnlyAvailable: showAvailableOnly,
    });

    // 应用搜索
    if (searchQuery.trim()) {
      return filtered.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allTasks, filters, showAvailableOnly, searchQuery]);

  // 统计数据
  const categoryStats = useMemo(() => {
    if (!allTasks) return {};
    const formatted: Task[] = allTasks.map(task => TaskDataService.formatTaskForDisplay(task));
    return TaskDataService.calculateCategoryStats(formatted);
  }, [allTasks]);

  const todayProgress = useMemo(() => {
    if (!allTasks) return null;
    const formatted: Task[] = allTasks.map(task => TaskDataService.formatTaskForDisplay(task));
    return TaskDataService.calculateTodayProgress(formatted);
  }, [allTasks]);

  const recommendedTasks = useMemo(() => {
    if (!allTasks) return [];
    const formatted: Task[] = allTasks.map(task => TaskDataService.formatTaskForDisplay(task));
    return TaskDataService.getRecommendedTasks(formatted, 3);
  }, [allTasks]);

  const completionSuggestions = useMemo(() => {
    if (!allTasks) return [];
    const formatted: Task[] = allTasks.map(task => TaskDataService.formatTaskForDisplay(task));
    return TaskDataService.getCompletionSuggestions(formatted);
  }, [allTasks]);

  // 加载状态
  if (tasksLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>每日任务</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-muted-foreground">加载任务列表中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 今日进度概览 */}
      {todayProgress && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>今日进度</span>
            </CardTitle>
            <CardDescription>
              已完成 {todayProgress.completedTasks}/{todayProgress.totalTasks} 个任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>完成率</span>
                <span className="font-medium">{todayProgress.completionRate}%</span>
              </div>
              <Progress value={todayProgress.completionRate} className="h-3" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-orange-500" />
                  <span>今日获得: {todayProgress.totalCansEarned} 罐头</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>经验: {todayProgress.totalExperienceEarned}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 推荐任务 */}
      {recommendedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>推荐任务</span>
            </CardTitle>
            <CardDescription>
              根据你的情况为你推荐的高价值任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {recommendedTasks.map((task) => (
                <TaskCard
                  key={task.type}
                  task={task}
                  isCompleting={completingTask === task.type}
                  compact={true}
                  onComplete={handleCompleteTask}
                  onViewDetails={handleViewTaskDetails}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 任务过滤器 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>
            完成任务获得罐头和经验奖励
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskFilter
            filters={filters}
            categoryStats={categoryStats}
            searchQuery={searchQuery}
            showOnlyAvailable={showAvailableOnly}
            onFiltersChange={setFilters}
            onSearchChange={setSearchQuery}
            onToggleAvailableOnly={setShowAvailableOnly}
          />
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <div className="grid gap-4">
        {processedTasks.length > 0 ? (
          processedTasks.map((task) => (
            <TaskCard
              key={task.type}
              task={task}
              isCompleting={completingTask === task.type}
              onComplete={handleCompleteTask}
              onViewDetails={handleViewTaskDetails}
            />
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                没有找到匹配的任务
              </h3>
              <p className="text-gray-500 mb-4">
                尝试调整过滤条件或搜索关键词
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ category: 'all', sortBy: 'name', sortOrder: 'asc' });
                  setSearchQuery('');
                  setShowAvailableOnly(false);
                }}
              >
                重置过滤器
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 完成建议 */}
      {completionSuggestions.length > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-500" />
              <span>完成建议</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {completionSuggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-green-700">
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * 导出类型
 */
export type {
  Task,
  TodayProgress,
  TaskFilterOptions,
} from './task-center/services/task-data-service';

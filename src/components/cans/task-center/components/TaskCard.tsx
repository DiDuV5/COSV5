/**
 * @fileoverview 任务卡片组件
 * @description 专门处理单个任务的显示、交互和状态管理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { CheckCircle2, Coins, TrendingUp, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TaskIconService } from '../services/task-icon-service';
import type { Task } from '../services/task-data-service';

/**
 * 任务卡片属性接口
 */
export interface TaskCardProps {
  task: Task;
  isCompleting?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  onComplete?: (taskType: string) => void;
  onViewDetails?: (task: Task) => void;
}

/**
 * 任务卡片组件
 */
export function TaskCard({
  task,
  isCompleting = false,
  showActions = true,
  compact = false,
  className,
  onComplete,
  onViewDetails,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const isAvailable = task.status === 'available';
  const isLocked = task.status === 'locked';
  const canComplete = isAvailable && task.completed < task.dailyLimit;

  /**
   * 处理完成任务
   */
  const handleComplete = () => {
    if (canComplete && onComplete) {
      onComplete(task.type);
    }
  };

  /**
   * 处理查看详情
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(task);
    }
  };

  /**
   * 获取卡片样式
   */
  const getCardStyle = () => {
    if (isCompleted) return 'bg-gray-50 border-gray-200';
    if (isAvailable) return 'hover:shadow-md border-blue-200';
    if (isLocked) return 'border-gray-200 opacity-60';
    return 'border-gray-200';
  };

  /**
   * 获取状态指示器
   */
  const getStatusIndicator = () => {
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    }
    if (isLocked) {
      return <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    }
    if (task.timeLimit) {
      return <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />;
    }
    return null;
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      getCardStyle(),
      compact && 'p-2',
      className
    )}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* 任务图标 */}
            <div className="flex-shrink-0 mt-1">
              {TaskIconService.getTaskIcon(task.icon, compact ? 'sm' : 'md')}
            </div>

            <div className="flex-1 min-w-0">
              {/* 任务标题和状态 */}
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={cn(
                  'font-medium truncate',
                  compact ? 'text-sm' : 'text-sm',
                  isCompleted && 'text-gray-500'
                )}>
                  {task.name}
                </h4>
                <span className="text-xs">
                  {TaskIconService.getCategoryIcon(task.category)}
                </span>
                {getStatusIndicator()}
              </div>

              {/* 任务描述 */}
              {!compact && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* 任务标签 */}
              <div className="flex items-center space-x-2 mb-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-2 py-0.5',
                    TaskIconService.getDifficultyStyle(task.difficulty)
                  )}
                >
                  {TaskIconService.getDifficultyText(task.difficulty)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {TaskIconService.getCategoryText(task.category)}
                </span>
              </div>

              {/* 奖励信息 */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Coins className="h-3 w-3 text-orange-500" />
                    <span className="font-medium">{task.cansReward}</span>
                    <span className="text-muted-foreground">罐头/次</span>
                  </span>
                  {(task.experienceReward || 0) > 0 && (
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{task.experienceReward || 0}</span>
                      <span className="text-muted-foreground">经验</span>
                    </span>
                  )}
                </div>
                {!compact && (
                  <span className="text-muted-foreground">
                    最多 {task.totalReward} 罐头/日
                  </span>
                )}
              </div>

              {/* 进度条 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>进度: {task.completed}/{task.dailyLimit}</span>
                  <span className="font-medium">{task.progress}%</span>
                </div>
                <Progress
                  value={task.progress}
                  className={cn('h-2', isCompleted && 'opacity-60')}
                />
              </div>

              {/* 任务要求 */}
              {!compact && task.requirements && task.requirements.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">完成条件:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {task.requirements.slice(0, 2).map((req, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                        <span className="truncate">{req}</span>
                      </li>
                    ))}
                    {task.requirements.length > 2 && (
                      <li className="text-blue-500 cursor-pointer" onClick={handleViewDetails}>
                        查看更多...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              {showActions && (
                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    {canComplete && (
                      <Button
                        size="sm"
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="text-xs"
                      >
                        {isCompleting ? '完成中...' : '完成任务'}
                      </Button>
                    )}
                    
                    {!compact && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewDetails}
                        className="text-xs"
                      >
                        查看详情
                      </Button>
                    )}
                  </div>

                  {/* 冷却时间 */}
                  {task.cooldown && task.cooldown > 0 && (
                    <span className="text-xs text-muted-foreground">
                      冷却: {Math.ceil(task.cooldown / 60)}分钟
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 紧凑任务卡片组件
 */
export function CompactTaskCard(props: Omit<TaskCardProps, 'compact'>) {
  return <TaskCard {...props} compact={true} />;
}

/**
 * 任务卡片骨架组件
 */
export function TaskCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="animate-pulse">
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            {!compact && <div className="h-3 bg-gray-200 rounded w-full" />}
            <div className="flex space-x-2">
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-2 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

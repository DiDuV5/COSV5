/**
 * @fileoverview 创建进度显示组件
 * @description 显示批量创建用户的进度和状态
 */

"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Loader2,
  TrendingUp 
} from "lucide-react";
import type { CreateStatus, BatchCreateResult } from "../types/batch-create-types";

interface CreateProgressDisplayProps {
  createStatus: CreateStatus;
  className?: string;
}

/**
 * 创建进度显示组件
 */
export function CreateProgressDisplay({ 
  createStatus, 
  className 
}: CreateProgressDisplayProps) {
  const { 
    isCreating, 
    totalUsers, 
    processedUsers, 
    successfulUsers, 
    failedUsers, 
    currentUser 
  } = createStatus;

  const progressPercentage = totalUsers > 0 ? (processedUsers / totalUsers) * 100 : 0;
  const successRate = processedUsers > 0 ? (successfulUsers / processedUsers) * 100 : 0;

  return (
    <div className={className}>
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">创建进度</h4>
          <span className="text-sm text-gray-600">
            {processedUsers} / {totalUsers}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="text-xs text-gray-500 mt-1">
          {progressPercentage.toFixed(1)}% 完成
        </div>
      </div>

      {/* 当前状态 */}
      {isCreating && currentUser && (
        <Alert className="mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            正在创建用户: <strong>{currentUser}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">总计</span>
          </div>
          <div className="text-xl font-bold text-blue-600">{totalUsers}</div>
        </div>

        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600">成功</span>
          </div>
          <div className="text-xl font-bold text-green-600">{successfulUsers}</div>
        </div>

        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600">失败</span>
          </div>
          <div className="text-xl font-bold text-red-600">{failedUsers}</div>
        </div>

        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-600">成功率</span>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {successRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 状态标识 */}
      <div className="flex items-center gap-2">
        {isCreating ? (
          <Badge variant="default" className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            创建中...
          </Badge>
        ) : processedUsers === totalUsers ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            创建完成
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            等待中
          </Badge>
        )}
      </div>
    </div>
  );
}

interface CreateResultsDisplayProps {
  results: BatchCreateResult;
  className?: string;
}

/**
 * 创建结果显示组件
 */
export function CreateResultsDisplay({ 
  results, 
  className 
}: CreateResultsDisplayProps) {
  const { total, successful, failed, results: userResults } = results;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return (
    <div className={className}>
      {/* 总体结果 */}
      <div className="mb-6">
        <Alert variant={failed > 0 ? "destructive" : "default"}>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">批量创建完成</div>
            <div>
              总计 {total} 个用户，成功 {successful} 个，失败 {failed} 个
              （成功率 {successRate.toFixed(1)}%）
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* 详细结果 */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium">详细结果</h5>
        <div className="max-h-60 overflow-y-auto border rounded-lg">
          {userResults.map((result, index) => (
            <div 
              key={index} 
              className={`p-3 border-b last:border-b-0 ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{result.username}</span>
                  {result.userId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {result.userId}
                    </Badge>
                  )}
                </div>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? '成功' : '失败'}
                </Badge>
              </div>
              {result.error && (
                <div className="mt-1 text-sm text-red-600">
                  错误: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 操作建议 */}
      {failed > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">处理建议</h5>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• 检查失败用户的错误信息，修正数据后重新导入</li>
            <li>• 确保用户名唯一且符合格式要求</li>
            <li>• 检查邮箱格式是否正确</li>
            <li>• 确认用户等级设置是否有效</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 简化的进度指示器
 */
export function SimpleProgressIndicator({ 
  current, 
  total, 
  label 
}: { 
  current: number; 
  total: number; 
  label?: string; 
}) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label || '进度'}</span>
        <span>{current} / {total}</span>
      </div>
      <Progress value={percentage} className="h-1" />
    </div>
  );
}

/**
 * 状态徽章组件
 */
export function StatusBadge({ 
  status, 
  count 
}: { 
  status: 'pending' | 'processing' | 'success' | 'error'; 
  count?: number; 
}) {
  const configs = {
    pending: {
      variant: 'secondary' as const,
      icon: Clock,
      label: '等待中',
      color: 'text-gray-500'
    },
    processing: {
      variant: 'default' as const,
      icon: Loader2,
      label: '处理中',
      color: 'text-blue-500'
    },
    success: {
      variant: 'default' as const,
      icon: CheckCircle,
      label: '成功',
      color: 'text-green-500'
    },
    error: {
      variant: 'destructive' as const,
      icon: AlertCircle,
      label: '失败',
      color: 'text-red-500'
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className={`w-3 h-3 mr-1 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
      {count !== undefined && ` (${count})`}
    </Badge>
  );
}

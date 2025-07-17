/**
 * @fileoverview 性能概览组件
 * @description 专门显示整体性能状态和健康度
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PerformanceService,
  type PerformanceMetrics,
  type PerformanceStatus,
} from '../services/performance-service';

/**
 * 性能概览属性接口
 */
export interface PerformanceOverviewProps {
  metrics: PerformanceMetrics;
  lastUpdated: Date;
  isPending?: boolean;
  autoRefresh?: boolean;
  className?: string;
  onRefresh?: () => void;
  onToggleAutoRefresh?: (enabled: boolean) => void;
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: PerformanceStatus, size = 'h-5 w-5') => {
  switch (status) {
    case 'excellent':
      return <CheckCircle className={`${size} text-green-500`} />;
    case 'good':
      return <CheckCircle className={`${size} text-blue-500`} />;
    case 'warning':
      return <AlertTriangle className={`${size} text-yellow-500`} />;
    case 'critical':
      return <XCircle className={`${size} text-red-500`} />;
    default:
      return <CheckCircle className={`${size} text-gray-500`} />;
  }
};

/**
 * 性能概览组件
 */
export function PerformanceOverview({
  metrics,
  lastUpdated,
  isPending = false,
  autoRefresh = true,
  className,
  onRefresh,
  onToggleAutoRefresh,
}: PerformanceOverviewProps) {
  const health = PerformanceService.calculateOverallHealth(metrics);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 整体健康度 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-3">
                {getStatusIcon(health.status, 'h-6 w-6')}
                <span>系统健康度</span>
                <Badge className={PerformanceService.getStatusColorClass(health.status)}>
                  {PerformanceService.getStatusText(health.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                整体性能评分: {health.score}/100
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              
              {onToggleAutoRefresh && (
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToggleAutoRefresh(!autoRefresh)}
                >
                  自动刷新
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 健康度进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>整体健康度</span>
              <span className="font-medium">{health.score}%</span>
            </div>
            <Progress value={health.score} className="h-3" />
          </div>

          {/* 各模块状态 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getStatusIcon(PerformanceService.getCacheStatus(metrics.cache))}
              </div>
              <div className="text-sm font-medium">缓存</div>
              <div className="text-xs text-muted-foreground">
                {PerformanceService.formatPercentage(metrics.cache.hitRate)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getStatusIcon(PerformanceService.getDatabaseStatus(metrics.database))}
              </div>
              <div className="text-sm font-medium">数据库</div>
              <div className="text-xs text-muted-foreground">
                {metrics.database.averageQueryTime.toFixed(0)}ms
              </div>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getStatusIcon(PerformanceService.getStorageStatus(metrics.storage))}
              </div>
              <div className="text-sm font-medium">存储</div>
              <div className="text-xs text-muted-foreground">
                {PerformanceService.formatPercentage(metrics.storage.usagePercentage)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getStatusIcon(PerformanceService.getSystemStatus(metrics.system))}
              </div>
              <div className="text-sm font-medium">系统</div>
              <div className="text-xs text-muted-foreground">
                CPU {PerformanceService.formatPercentage(metrics.system.cpuUsage)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getStatusIcon(PerformanceService.getUploadStatus(metrics.upload))}
              </div>
              <div className="text-sm font-medium">上传</div>
              <div className="text-xs text-muted-foreground">
                {PerformanceService.formatPercentage(
                  (metrics.upload.successfulUploads / metrics.upload.totalUploads) * 100
                )}
              </div>
            </div>
          </div>

          {/* 问题提醒 */}
          {health.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">发现以下问题:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {health.issues.map((issue, index) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 更新时间 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>
                最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            </div>
            
            {autoRefresh && (
              <Badge variant="outline" className="text-xs">
                自动刷新中
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.system.activeUsers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">在线用户</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {PerformanceService.formatPercentage(metrics.cache.hitRate)}
              </div>
              <div className="text-sm text-muted-foreground">缓存命中率</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.database.averageQueryTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground">平均查询时间</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {PerformanceService.formatPercentage(
                  (metrics.upload.successfulUploads / metrics.upload.totalUploads) * 100
                )}
              </div>
              <div className="text-sm text-muted-foreground">上传成功率</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>性能建议</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {health.score >= 90 && (
              <div className="text-green-600">
                ✓ 系统运行状态良好，各项指标正常
              </div>
            )}
            
            {metrics.cache.hitRate < 80 && (
              <div className="text-yellow-600">
                ⚠ 缓存命中率偏低，建议检查缓存策略
              </div>
            )}
            
            {metrics.database.averageQueryTime > 100 && (
              <div className="text-yellow-600">
                ⚠ 数据库查询时间较长，建议优化查询语句
              </div>
            )}
            
            {metrics.system.cpuUsage > 80 && (
              <div className="text-red-600">
                ⚠ CPU使用率过高，建议检查系统负载
              </div>
            )}
            
            {metrics.storage.usagePercentage > 85 && (
              <div className="text-red-600">
                ⚠ 存储空间不足，建议清理或扩容
              </div>
            )}
            
            {health.score < 70 && (
              <div className="text-red-600">
                ⚠ 系统性能较差，建议立即检查和优化
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 性能概览骨架组件
 */
export function PerformanceOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-12" />
            </div>
            <div className="h-3 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-5 w-5 bg-gray-200 rounded-full mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-12 mx-auto" />
                <div className="h-3 bg-gray-200 rounded w-8 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="h-8 bg-gray-200 rounded w-16 mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

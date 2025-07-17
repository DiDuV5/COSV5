/**
 * @fileoverview 性能指标卡片组件
 * @description 专门显示各类性能指标的卡片组件
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Zap, 
  Users, 
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PerformanceService,
  type PerformanceMetrics,
  type PerformanceStatus,
} from '../services/performance-service';

/**
 * 指标卡片属性接口
 */
export interface MetricsCardsProps {
  metrics: PerformanceMetrics;
  isPending?: boolean;
  className?: string;
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: PerformanceStatus) => {
  switch (status) {
    case 'excellent':
    case 'good':
      return <CheckCircle className="h-4 w-4" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'critical':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

/**
 * 性能指标卡片组件
 */
export function MetricsCards({ metrics, isPending = false, className }: MetricsCardsProps) {
  if (isPending) {
    return <MetricsCardsSkeleton />;
  }

  const cacheStatus = PerformanceService.getCacheStatus(metrics.cache);
  const databaseStatus = PerformanceService.getDatabaseStatus(metrics.database);
  const storageStatus = PerformanceService.getStorageStatus(metrics.storage);
  const systemStatus = PerformanceService.getSystemStatus(metrics.system);
  const uploadStatus = PerformanceService.getUploadStatus(metrics.upload);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {/* 缓存性能 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>缓存性能</span>
            </div>
            <Badge className={PerformanceService.getStatusColorClass(cacheStatus)}>
              {getStatusIcon(cacheStatus)}
              <span className="ml-1">{PerformanceService.getStatusText(cacheStatus)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>命中率</span>
              <span className="font-medium">
                {PerformanceService.formatPercentage(metrics.cache.hitRate)}
              </span>
            </div>
            <Progress value={metrics.cache.hitRate} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">命中次数</div>
              <div className="font-medium">{metrics.cache.hits.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">未命中</div>
              <div className="font-medium">{metrics.cache.misses.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Redis连接</span>
            <Badge variant={metrics.cache.redisConnected ? 'default' : 'destructive'}>
              {metrics.cache.redisConnected ? '正常' : '异常'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 数据库性能 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>数据库性能</span>
            </div>
            <Badge className={PerformanceService.getStatusColorClass(databaseStatus)}>
              {getStatusIcon(databaseStatus)}
              <span className="ml-1">{PerformanceService.getStatusText(databaseStatus)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">平均查询时间</div>
              <div className="font-medium">{metrics.database.averageQueryTime.toFixed(1)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">慢查询</div>
              <div className="font-medium">{metrics.database.slowQueries}</div>
            </div>
            <div>
              <div className="text-muted-foreground">活跃连接</div>
              <div className="font-medium">{metrics.database.activeConnections}</div>
            </div>
            <div>
              <div className="text-muted-foreground">总查询数</div>
              <div className="font-medium">{metrics.database.totalQueries.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 存储性能 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>存储性能</span>
            </div>
            <Badge className={PerformanceService.getStatusColorClass(storageStatus)}>
              {getStatusIcon(storageStatus)}
              <span className="ml-1">{PerformanceService.getStatusText(storageStatus)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>存储使用率</span>
              <span className="font-medium">
                {PerformanceService.formatPercentage(metrics.storage.usagePercentage)}
              </span>
            </div>
            <Progress value={metrics.storage.usagePercentage} className="h-2" />
          </div>

          <div className="text-sm">
            <div className="text-muted-foreground">已使用 / 总容量</div>
            <div className="font-medium">
              {PerformanceService.formatBytes(metrics.storage.totalUsed)} / {' '}
              {PerformanceService.formatBytes(metrics.storage.totalAvailable)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">上传速度</div>
              <div className="font-medium">
                {PerformanceService.formatSpeed(metrics.storage.uploadSpeed)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">下载速度</div>
              <div className="font-medium">
                {PerformanceService.formatSpeed(metrics.storage.downloadSpeed)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>R2连接</span>
            <Badge variant={metrics.storage.r2Connected ? 'default' : 'destructive'}>
              {metrics.storage.r2Connected ? '正常' : '异常'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 系统性能 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>系统性能</span>
            </div>
            <Badge className={PerformanceService.getStatusColorClass(systemStatus)}>
              {getStatusIcon(systemStatus)}
              <span className="ml-1">{PerformanceService.getStatusText(systemStatus)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>CPU使用率</span>
                <span className="font-medium">
                  {PerformanceService.formatPercentage(metrics.system.cpuUsage)}
                </span>
              </div>
              <Progress value={metrics.system.cpuUsage} className="h-2" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>内存使用率</span>
                <span className="font-medium">
                  {PerformanceService.formatPercentage(metrics.system.memoryUsage)}
                </span>
              </div>
              <Progress value={metrics.system.memoryUsage} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">在线用户</div>
              <div className="font-medium">{metrics.system.activeUsers.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">运行时间</div>
              <div className="font-medium">
                {PerformanceService.formatDuration(metrics.system.uptime)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户统计 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Users className="h-5 w-5" />
            <span>用户统计</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.system.totalUsers.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">总用户数</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>在线用户比例</span>
              <span className="font-medium">
                {PerformanceService.formatPercentage(
                  (metrics.system.activeUsers / metrics.system.totalUsers) * 100
                )}
              </span>
            </div>
            <Progress 
              value={(metrics.system.activeUsers / metrics.system.totalUsers) * 100} 
              className="h-2" 
            />
          </div>

          <div className="text-sm text-center text-muted-foreground">
            当前在线: {metrics.system.activeUsers.toLocaleString()} 人
          </div>
        </CardContent>
      </Card>

      {/* 上传统计 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>上传统计</span>
            </div>
            <Badge className={PerformanceService.getStatusColorClass(uploadStatus)}>
              {getStatusIcon(uploadStatus)}
              <span className="ml-1">{PerformanceService.getStatusText(uploadStatus)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>成功率</span>
              <span className="font-medium">
                {PerformanceService.formatPercentage(
                  (metrics.upload.successfulUploads / metrics.upload.totalUploads) * 100
                )}
              </span>
            </div>
            <Progress 
              value={(metrics.upload.successfulUploads / metrics.upload.totalUploads) * 100} 
              className="h-2" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">总上传数</div>
              <div className="font-medium">{metrics.upload.totalUploads.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">失败数</div>
              <div className="font-medium">{metrics.upload.failedUploads.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">平均时间</div>
              <div className="font-medium">{metrics.upload.averageUploadTime.toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-muted-foreground">总文件大小</div>
              <div className="font-medium">
                {PerformanceService.formatBytes(metrics.upload.totalFilesSize)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 指标卡片骨架组件
 */
export function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gray-200 rounded" />
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-2 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

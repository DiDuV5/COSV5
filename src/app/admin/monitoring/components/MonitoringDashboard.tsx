/**
 * @fileoverview 监控仪表板组件
 * @description 专门显示系统状态和关键指标的仪表板
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  Users, 
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MonitoringService,
  type SystemStatus,
  type UserActivity,
  type ErrorStats,
  type MonitoringMetrics,
} from '../services/monitoring-service';

/**
 * 监控仪表板属性接口
 */
export interface MonitoringDashboardProps {
  systemStatus: SystemStatus;
  userActivity: UserActivity;
  errorStats: ErrorStats;
  latestMetrics?: MonitoringMetrics;
  isPending?: boolean;
  className?: string;
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: string, size = 'h-5 w-5') => {
  switch (status) {
    case 'healthy':
    case 'online':
      return <CheckCircle className={`${size} text-green-500`} />;
    case 'warning':
    case 'degraded':
      return <AlertTriangle className={`${size} text-yellow-500`} />;
    case 'critical':
    case 'offline':
      return <AlertTriangle className={`${size} text-red-500`} />;
    default:
      return <Activity className={`${size} text-gray-500`} />;
  }
};

/**
 * 获取趋势图标
 */
const getTrendIcon = (value: number, threshold: number) => {
  if (value > threshold * 1.1) return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (value < threshold * 0.9) return <TrendingDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
};

/**
 * 监控仪表板组件
 */
export function MonitoringDashboard({
  systemStatus,
  userActivity,
  errorStats,
  latestMetrics,
  isPending = false,
  className,
}: MonitoringDashboardProps) {
  if (isPending) {
    return <MonitoringDashboardSkeleton />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 系统整体状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus.overall, 'h-6 w-6')}
              <span>系统状态</span>
              <Badge className={MonitoringService.getStatusColor(systemStatus.overall)}>
                {MonitoringService.getStatusText(systemStatus.overall)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              运行时间: {MonitoringService.formatDuration(systemStatus.uptime)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(systemStatus.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  {service === 'database' && <Database className="h-4 w-4" />}
                  {service === 'redis' && <Zap className="h-4 w-4" />}
                  {service === 'storage' && <HardDrive className="h-4 w-4" />}
                  {service === 'api' && <Activity className="h-4 w-4" />}
                  <span className="text-sm font-medium capitalize">{service}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={MonitoringService.getStatusColor(status)}
                >
                  {MonitoringService.getStatusText(status)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">在线用户</p>
                <p className="text-2xl font-bold">{userActivity.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  总用户: {userActivity.totalSessions.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">新注册</p>
                <p className="text-2xl font-bold">{userActivity.newRegistrations}</p>
                <p className="text-xs text-muted-foreground">今日新增</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">错误总数</p>
                <p className="text-2xl font-bold">{errorStats.total}</p>
                <p className="text-xs text-muted-foreground">过去24小时</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均会话</p>
                <p className="text-2xl font-bold">
                  {userActivity.averageSessionDuration.toFixed(0)}m
                </p>
                <p className="text-xs text-muted-foreground">会话时长</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 实时性能指标 */}
      {latestMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                CPU使用率
                {getTrendIcon(latestMetrics.cpu, 50)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>当前</span>
                  <span className="font-medium">
                    {MonitoringService.formatPercentage(latestMetrics.cpu)}
                  </span>
                </div>
                <Progress value={latestMetrics.cpu} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                内存使用率
                {getTrendIcon(latestMetrics.memory, 60)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>当前</span>
                  <span className="font-medium">
                    {MonitoringService.formatPercentage(latestMetrics.memory)}
                  </span>
                </div>
                <Progress value={latestMetrics.memory} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                响应时间
                {getTrendIcon(latestMetrics.responseTime, 100)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {latestMetrics.responseTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">平均响应</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                请求量
                {getTrendIcon(latestMetrics.requests, 150)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {latestMetrics.requests.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">每分钟</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 最近错误 */}
      <Card>
        <CardHeader>
          <CardTitle>最近错误</CardTitle>
          <CardDescription>系统最新的错误和警告信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errorStats.recent.slice(0, 5).map((error, index) => (
              <Alert key={index} variant={error.level === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{error.level === 'error' ? '错误' : error.level === 'warning' ? '警告' : '信息'}</span>
                  <span className="text-xs text-muted-foreground">
                    {MonitoringService.formatTime(error.timestamp)}
                  </span>
                </AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 监控仪表板骨架组件
 */
export function MonitoringDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 系统状态骨架 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-gray-200 rounded-full" />
              <div className="h-6 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 关键指标骨架 */}
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-8 bg-gray-200 rounded w-12" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 实时指标骨架 */}
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-8" />
                  <div className="h-4 bg-gray-200 rounded w-12" />
                </div>
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * @fileoverview 增强的性能图表组件
 * @description 集成P1级缓存和权限优化的性能可视化
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Database,
  Activity,
  Zap,
  Shield,
  Clock,
  Info
} from "lucide-react";

interface EnhancedPerformanceChartsProps {
  data?: {
    // 缓存性能时序数据
    cachePerformance: Array<{
      timestamp: string;
      hitRate: number;
      responseTime: number;
      penetrationPrevented: number;
      dynamicTTLAdjustments: number;
    }>;
    // 权限性能时序数据
    permissionPerformance: Array<{
      timestamp: string;
      checkTime: number;
      totalChecks: number;
      cacheHits: number;
      auditLogs: number;
    }>;
    // 系统整体性能对比
    performanceComparison: {
      beforeOptimization: {
        cacheHitRate: number;
        permissionCheckTime: number;
        systemResponseTime: number;
      };
      afterOptimization: {
        cacheHitRate: number;
        permissionCheckTime: number;
        systemResponseTime: number;
      };
    };
  };
  isLoading: boolean;
  timeRange: number;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F97316',
};

export function EnhancedPerformanceCharts({ data, isLoading, timeRange }: EnhancedPerformanceChartsProps) {
  if (isLoading) {
    return <EnhancedPerformanceChartsSkeleton />;
  }

  if (!data) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          暂无增强性能监控数据。请确保P1级缓存和权限优化功能已启用。
        </AlertDescription>
      </Alert>
    );
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatMs = (value: number) => `${value.toFixed(1)}ms`;

  // 计算性能提升百分比
  const calculateImprovement = (before: number, after: number) => {
    const improvement = ((before - after) / before) * 100;
    return improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* 性能对比概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>P1级优化效果对比</span>
            <Badge variant="outline" className="ml-2">
              优化前后对比
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 缓存命中率对比 */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">缓存命中率</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercentage(data.performanceComparison.afterOptimization.cacheHitRate)}
                </div>
                <div className="text-xs text-gray-500">
                  优化前: {formatPercentage(data.performanceComparison.beforeOptimization.cacheHitRate)}
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {calculateImprovement(
                    data.performanceComparison.beforeOptimization.cacheHitRate,
                    data.performanceComparison.afterOptimization.cacheHitRate
                  )}
                </Badge>
              </div>
            </div>

            {/* 权限检查时间对比 */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">权限检查时间</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  {formatMs(data.performanceComparison.afterOptimization.permissionCheckTime)}
                </div>
                <div className="text-xs text-gray-500">
                  优化前: {formatMs(data.performanceComparison.beforeOptimization.permissionCheckTime)}
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {calculateImprovement(
                    data.performanceComparison.beforeOptimization.permissionCheckTime,
                    data.performanceComparison.afterOptimization.permissionCheckTime
                  )}
                </Badge>
              </div>
            </div>

            {/* 系统响应时间对比 */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">系统响应时间</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600">
                  {formatMs(data.performanceComparison.afterOptimization.systemResponseTime)}
                </div>
                <div className="text-xs text-gray-500">
                  优化前: {formatMs(data.performanceComparison.beforeOptimization.systemResponseTime)}
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {calculateImprovement(
                    data.performanceComparison.beforeOptimization.systemResponseTime,
                    data.performanceComparison.afterOptimization.systemResponseTime
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 缓存性能趋势图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>缓存性能趋势</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.cachePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => `时间: ${formatTime(value)}`}
                  formatter={(value: number, name: string) => {
                    switch (name) {
                      case 'hitRate':
                        return [formatPercentage(value), '命中率'];
                      case 'responseTime':
                        return [formatMs(value), '响应时间'];
                      case 'penetrationPrevented':
                        return [value, '穿透防护'];
                      case 'dynamicTTLAdjustments':
                        return [value, 'TTL调整'];
                      default:
                        return [value, name];
                    }
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hitRate" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.success} 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 权限性能趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <span>权限性能趋势</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.permissionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => `时间: ${formatTime(value)}`}
                  formatter={(value: number, name: string) => {
                    switch (name) {
                      case 'checkTime':
                        return [formatMs(value), '检查时间'];
                      case 'totalChecks':
                        return [value, '总检查数'];
                      case 'cacheHits':
                        return [value, '缓存命中'];
                      case 'auditLogs':
                        return [value, '审计日志'];
                      default:
                        return [value, name];
                    }
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="checkTime" 
                  stackId="1"
                  stroke={COLORS.orange} 
                  fill={COLORS.orange}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="cacheHits" 
                  stackId="2"
                  stroke={COLORS.success} 
                  fill={COLORS.success}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EnhancedPerformanceChartsSkeleton() {
  return (
    <div className="space-y-6">
      {/* 对比概览骨架 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-6 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 图表骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

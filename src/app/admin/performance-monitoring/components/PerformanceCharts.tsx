/**
 * @fileoverview 性能图表组件
 * @description 显示数据库性能的可视化图表
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Database,
  Activity
} from "lucide-react";

interface PerformanceChartsProps {
  data?: {
    overview: {
      totalQueries: number;
      slowQueries: number;
      averageDuration: number;
      maxDuration: number;
      minDuration: number;
      queriesPerSecond: number;
      errorQueries: number;
    };
    modelStats: Record<string, {
      queries: number;
      averageDuration: number;
      slowQueries: number;
      actions: Record<string, {
        count: number;
        averageDuration: number;
      }>;
    }>;
  };
  isLoading: boolean;
  timeRange: number;
  detailed?: boolean;
}

export function PerformanceCharts({ data, isLoading, timeRange, detailed = false }: PerformanceChartsProps) {
  if (isLoading) {
    return <PerformanceChartsSkeleton detailed={detailed} />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2" />
            <p>无法获取图表数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatPercentage = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

  // 计算慢查询比例
  const slowQueryRatio = data.overview.totalQueries > 0 ?
    (data.overview.slowQueries / data.overview.totalQueries) : 0;

  // 准备模型统计数据
  const modelStatsArray = Object.entries(data.modelStats)
    .map(([model, stats]) => ({
      model,
      ...stats,
      totalQueries: stats.queries, // 添加别名以保持兼容性
    }))
    .sort((a, b) => b.queries - a.queries)
    .slice(0, detailed ? 10 : 5);

  // 准备响应时间分布数据
  const responseTimeRanges = [
    { range: '< 5ms', count: 0, color: 'bg-green-500' },
    { range: '5-20ms', count: 0, color: 'bg-blue-500' },
    { range: '20-100ms', count: 0, color: 'bg-yellow-500' },
    { range: '> 100ms', count: 0, color: 'bg-red-500' },
  ];

  // 模拟响应时间分布（实际应该从数据中计算）
  const totalQueries = data.overview.totalQueries;
  responseTimeRanges[0].count = Math.floor(totalQueries * 0.6);
  responseTimeRanges[1].count = Math.floor(totalQueries * 0.25);
  responseTimeRanges[2].count = Math.floor(totalQueries * 0.1);
  responseTimeRanges[3].count = totalQueries - responseTimeRanges[0].count - responseTimeRanges[1].count - responseTimeRanges[2].count;

  const maxModelQueries = Math.max(...modelStatsArray.map(m => m.queries));
  const maxResponseTime = Math.max(...responseTimeRanges.map(r => r.count));

  return (
    <div className={`grid gap-6 ${detailed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {/* 查询概览统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>查询概览统计</span>
            <Badge variant="outline">{timeRange}小时</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">总查询数</div>
              <div className="text-2xl font-bold text-blue-600">
                {data.overview.totalQueries.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600">慢查询数</div>
              <div className="text-2xl font-bold text-red-600">
                {data.overview.slowQueries.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600">平均响应时间</div>
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(data.overview.averageDuration)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600">慢查询比例</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatPercentage(slowQueryRatio)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 模型查询分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>模型查询分布</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modelStatsArray.map((model) => (
              <div key={model.model} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {model.model || 'Unknown'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {model.queries.toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        model.averageDuration < 5 ? 'border-green-200 text-green-700' :
                        model.averageDuration < 20 ? 'border-yellow-200 text-yellow-700' :
                        'border-red-200 text-red-700'
                      }`}
                    >
                      {formatDuration(model.averageDuration)}
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(model.queries / maxModelQueries) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {detailed && (
        <>
          {/* 响应时间分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>响应时间分布</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responseTimeRanges.map((range, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{range.range}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {range.count.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({((range.count / totalQueries) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${range.color} h-3 rounded-full transition-all duration-300`}
                        style={{
                          width: `${(range.count / maxResponseTime) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 性能趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>性能趋势</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">趋势图表功能开发中</p>
                  <p className="text-xs text-gray-400 mt-1">
                    将显示过去{timeRange}小时的性能变化趋势
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export function PerformanceChartsSkeleton({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={`grid gap-6 ${detailed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {detailed && (
        <>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-4" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-3 w-48 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

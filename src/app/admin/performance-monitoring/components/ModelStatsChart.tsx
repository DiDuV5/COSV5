/**
 * @fileoverview 模型统计图表组件
 * @description 显示各数据模型的查询统计和性能分析
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle
} from "lucide-react";

interface ModelStatsChartProps {
  data?: {
    modelStats: Array<{
      model: string;
      queries: number;
      averageDuration: number;
      slowQueries: number;
      actions: Record<string, {
        count: number;
        averageDuration: number;
      }>;
      actionsArray?: Array<{
        action: string;
        count: number;
        averageDuration: number;
      }>;
    }>;
    timeRange: number;
  };
  isLoading: boolean;
  timeRange: number;
}

export function ModelStatsChart({ data, isLoading, timeRange }: ModelStatsChartProps) {
  if (isLoading) {
    return <ModelStatsChartSkeleton />;
  }

  if (!data || !data.modelStats || data.modelStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>模型查询统计</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无模型统计数据</p>
            <p className="text-sm text-gray-400 mt-1">
              当前时间范围内没有查询记录
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 准备数据
  const modelStatsArray = data.modelStats
    .map((stats) => ({
      ...stats,
      totalQueries: stats.queries, // 添加totalQueries别名以保持兼容性
      slowQueryRatio: stats.queries > 0 ? (stats.slowQueries / stats.queries) : 0,
    }))
    .sort((a, b) => b.queries - a.queries);

  const totalQueries = modelStatsArray.reduce((sum, model) => sum + model.queries, 0);
  const maxQueries = Math.max(...modelStatsArray.map(m => m.queries));

  const formatDuration = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatPercentage = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

  const getDurationColor = (duration: number) => {
    if (duration < 5) return 'text-green-600';
    if (duration < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSlowQueryColor = (ratio: number) => {
    if (ratio === 0) return 'bg-green-100 text-green-800';
    if (ratio < 0.05) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>模型查询统计</span>
            <Badge variant="outline">{timeRange}小时</Badge>
          </div>
          <div className="text-sm text-gray-500">
            总计: {totalQueries.toLocaleString()} 查询
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 概览统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {modelStatsArray.length}
              </div>
              <div className="text-sm text-gray-600">活跃模型数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(
                  modelStatsArray.reduce((sum, m) => sum + m.averageDuration, 0) / modelStatsArray.length || 0
                )}
              </div>
              <div className="text-sm text-gray-600">平均响应时间</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {modelStatsArray.reduce((sum, m) => sum + m.slowQueries, 0)}
              </div>
              <div className="text-sm text-gray-600">慢查询总数</div>
            </div>
          </div>

          {/* 模型详细统计 */}
          <div className="space-y-4">
            {modelStatsArray.map((model, index) => (
              <div key={model.model} className="border border-gray-200 rounded-lg p-4">
                {/* 模型标题和基础指标 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-gray-600" />
                      <h4 className="font-medium capitalize text-lg">
                        {model.model || 'Unknown'}
                      </h4>
                    </div>
                    <Badge variant="outline">
                      #{index + 1}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">
                      {model.queries.toLocaleString()} 查询
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        model.averageDuration < 5 ? 'border-green-200 text-green-700' :
                        model.averageDuration < 20 ? 'border-yellow-200 text-yellow-700' :
                        'border-red-200 text-red-700'
                      }
                    >
                      {formatDuration(model.averageDuration)}
                    </Badge>
                    {model.slowQueries > 0 && (
                      <Badge className={getSlowQueryColor(model.slowQueryRatio)}>
                        {model.slowQueries} 慢查询
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 查询量进度条 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">查询量占比</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(model.queries / totalQueries)}
                    </span>
                  </div>
                  <Progress
                    value={(model.queries / maxQueries) * 100}
                    className="h-2"
                  />
                </div>

                {/* 详细指标 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-gray-600">总查询数</div>
                      <div className="font-medium">{model.queries.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className={`h-4 w-4 ${getDurationColor(model.averageDuration)}`} />
                    <div>
                      <div className="text-gray-600">平均响应时间</div>
                      <div className={`font-medium ${getDurationColor(model.averageDuration)}`}>
                        {formatDuration(model.averageDuration)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-gray-600">慢查询数</div>
                      <div className="font-medium text-red-600">{model.slowQueries}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-gray-600">慢查询比例</div>
                      <div className="font-medium text-orange-600">
                        {formatPercentage(model.slowQueryRatio)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作统计 */}
                {Object.keys(model.actions).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      操作分布 ({Object.keys(model.actions).length} 种操作)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(model.actions)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .slice(0, 6)
                        .map(([action, actionStats]) => (
                          <div key={action} className="bg-gray-50 rounded p-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium capitalize">
                                {action}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {actionStats.count}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600">
                              平均: {formatDuration(actionStats.averageDuration)}
                            </div>
                            <div className="mt-1">
                              <Progress
                                value={(actionStats.count / model.queries) * 100}
                                className="h-1"
                              />
                            </div>
                          </div>
                        ))}
                    </div>

                    {Object.keys(model.actions).length > 6 && (
                      <div className="text-center mt-3">
                        <span className="text-xs text-gray-500">
                          还有 {Object.keys(model.actions).length - 6} 种操作...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ModelStatsChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full mb-4" />
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

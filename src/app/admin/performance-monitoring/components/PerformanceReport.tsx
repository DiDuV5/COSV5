/**
 * @fileoverview 性能报告组件
 * @description 显示详细的性能分析报告
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  Clock,
  Database,
  Zap
} from "lucide-react";

interface PerformanceReportProps {
  data?: {
    generatedAt: Date;
    timeRange: {
      start: Date;
      end: Date;
    };
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
    alerts: Array<{
      level: 'info' | 'warning' | 'error' | 'critical';
      type: 'slow_query' | 'high_frequency' | 'poor_performance' | 'connection_issue';
      message: string;
      suggestion?: string;
      metric?: string;
      value?: number;
    }>;
    recommendations: string[];
    slowQueries: any[];
    frequentQueries: any[];
  };
  isLoading: boolean;
  timeRange: number;
}

export function PerformanceReport({ data, isLoading, timeRange }: PerformanceReportProps) {
  if (isLoading) {
    return <PerformanceReportSkeleton />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>无法生成性能报告</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      default: return '低';
    }
  };

  const formatDuration = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatPercentage = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

  // 计算慢查询比例
  const slowQueryRatio = data.overview.totalQueries > 0 ?
    (data.overview.slowQueries / data.overview.totalQueries) : 0;

  return (
    <div className="space-y-6">
      {/* 报告概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>性能报告概览</span>
            <Badge variant="outline">{timeRange}小时</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">总查询数</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {data.overview.totalQueries.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-600">慢查询数</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {data.overview.slowQueries.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">平均响应时间</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(data.overview.averageDuration)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-gray-600">慢查询比例</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatPercentage(slowQueryRatio)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              报告生成时间: {new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能告警 */}
      {data.alerts && data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>性能告警</span>
              <Badge variant="destructive">{data.alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <Alert key={index} className={getAlertColor(alert.level)}>
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.level)}
                    <div className="flex-1 space-y-1">
                      <AlertDescription className="font-medium">
                        {alert.message}
                      </AlertDescription>
                      {alert.suggestion && (
                        <AlertDescription className="text-sm text-gray-600">
                          建议: {alert.suggestion}
                        </AlertDescription>
                      )}
                      {alert.metric && alert.value && (
                        <div className="text-xs text-gray-500">
                          指标: {alert.metric} = {alert.value}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 模型性能详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>模型性能详情</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.modelStats).map(([model, stats]) => (
              <div key={model} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium capitalize">{model || 'Unknown'}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {stats.queries.toLocaleString()} 查询
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        stats.averageDuration < 5 ? 'border-green-200 text-green-700' :
                        stats.averageDuration < 20 ? 'border-yellow-200 text-yellow-700' :
                        'border-red-200 text-red-700'
                      }
                    >
                      {formatDuration(stats.averageDuration)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">总查询数:</span>
                    <span className="ml-2 font-medium">{stats.queries.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">平均响应时间:</span>
                    <span className="ml-2 font-medium">{formatDuration(stats.averageDuration)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">慢查询数:</span>
                    <span className="ml-2 font-medium text-red-600">{stats.slowQueries}</span>
                  </div>
                </div>

                {/* 操作详情 */}
                {Object.keys(stats.actions).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600 mb-2">操作详情:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {Object.entries(stats.actions)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .slice(0, 6)
                        .map(([action, actionStats]) => (
                          <div key={action} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{action}:</span>
                            <span className="font-medium">
                              {actionStats.count} ({formatDuration(actionStats.averageDuration)})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 优化建议 */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>优化建议</span>
              <Badge variant="outline">{data.recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PerformanceReportSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
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
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

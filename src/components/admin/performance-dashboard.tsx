/**
 * @fileoverview 性能监控仪表板组件
 * @description 实时显示系统性能指标、缓存状态、数据库性能等
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Database,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
  cache: {
    hitRate: number;
    totalRequests: number;
    avgResponseTime: number;
    l1HitRate: number;
    l2HitRate: number;
  };
  database: {
    totalQueries: number;
    avgQueryTime: number;
    slowQueryCount: number;
    cacheHitRate: number;
    connectionPoolUsage: number;
  };
  api: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

/**
 * 性能状态类型
 */
type PerformanceStatus = 'excellent' | 'good' | 'warning' | 'critical';

/**
 * 性能监控仪表板组件
 */
export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * 获取性能指标
   */
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/performance/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('获取性能指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 自动刷新
   */
  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // 30秒刷新
      return () => clearInterval(interval);
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [autoRefresh]);

  /**
   * 获取性能状态
   */
  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }): PerformanceStatus => {
    if (value >= thresholds.good) return 'excellent';
    if (value >= thresholds.warning) return 'good';
    if (value >= thresholds.warning * 0.7) return 'warning';
    return 'critical';
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: PerformanceStatus): string => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: PerformanceStatus) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载性能数据...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">无法加载性能数据</p>
        <Button onClick={fetchMetrics} className="mt-4">
          重试
        </Button>
      </div>
    );
  }

  const cacheStatus = getPerformanceStatus(metrics.cache.hitRate, { good: 85, warning: 70 });
  const dbStatus = getPerformanceStatus(100 - metrics.database.avgQueryTime / 10, { good: 90, warning: 80 });
  const apiStatus = getPerformanceStatus(100 - metrics.api.avgResponseTime / 10, { good: 95, warning: 85 });

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">性能监控仪表板</h1>
          <p className="text-gray-600">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? "停止自动刷新" : "开启自动刷新"}
          </Button>
          <Button onClick={fetchMetrics} size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">缓存性能</CardTitle>
            {getStatusIcon(cacheStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cache.hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              命中率 • {metrics.cache.totalRequests.toLocaleString()} 请求
            </p>
            <Progress value={metrics.cache.hitRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据库性能</CardTitle>
            {getStatusIcon(dbStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.database.avgQueryTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              平均查询时间 • {metrics.database.slowQueryCount} 慢查询
            </p>
            <Progress value={Math.max(0, 100 - metrics.database.avgQueryTime / 10)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API性能</CardTitle>
            {getStatusIcon(apiStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api.avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              平均响应时间 • {metrics.api.errorRate.toFixed(2)}% 错误率
            </p>
            <Progress value={Math.max(0, 100 - metrics.api.avgResponseTime / 10)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 详细指标 */}
      <Tabs defaultValue="cache" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cache">缓存系统</TabsTrigger>
          <TabsTrigger value="database">数据库</TabsTrigger>
          <TabsTrigger value="api">API服务</TabsTrigger>
          <TabsTrigger value="system">系统资源</TabsTrigger>
        </TabsList>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  分层缓存性能
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>L1缓存命中率</span>
                  <Badge variant={metrics.cache.l1HitRate > 80 ? "default" : "secondary"}>
                    {metrics.cache.l1HitRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.cache.l1HitRate} />

                <div className="flex justify-between items-center">
                  <span>L2缓存命中率</span>
                  <Badge variant={metrics.cache.l2HitRate > 70 ? "default" : "secondary"}>
                    {metrics.cache.l2HitRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.cache.l2HitRate} />

                <div className="flex justify-between items-center">
                  <span>平均响应时间</span>
                  <Badge variant={metrics.cache.avgResponseTime < 10 ? "default" : "secondary"}>
                    {metrics.cache.avgResponseTime.toFixed(1)}ms
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  缓存统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.cache.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">总请求数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(metrics.cache.totalRequests * metrics.cache.hitRate / 100).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">缓存命中</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  查询性能
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>平均查询时间</span>
                  <Badge variant={metrics.database.avgQueryTime < 100 ? "default" : "destructive"}>
                    {metrics.database.avgQueryTime.toFixed(0)}ms
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>慢查询数量</span>
                  <Badge variant={metrics.database.slowQueryCount < 10 ? "default" : "destructive"}>
                    {metrics.database.slowQueryCount}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>连接池使用率</span>
                  <Badge variant={metrics.database.connectionPoolUsage < 80 ? "default" : "secondary"}>
                    {metrics.database.connectionPoolUsage.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.database.connectionPoolUsage} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  数据库统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.database.totalQueries.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">总查询数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.database.cacheHitRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">查询缓存命中率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  API性能指标
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>平均响应时间</span>
                  <Badge variant={metrics.api.avgResponseTime < 500 ? "default" : "destructive"}>
                    {metrics.api.avgResponseTime.toFixed(0)}ms
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>P95响应时间</span>
                  <Badge variant={metrics.api.p95ResponseTime < 1000 ? "default" : "secondary"}>
                    {metrics.api.p95ResponseTime.toFixed(0)}ms
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span>错误率</span>
                  <Badge variant={metrics.api.errorRate < 1 ? "default" : "destructive"}>
                    {metrics.api.errorRate.toFixed(2)}%
                  </Badge>
                </div>
                <Progress value={Math.max(0, 100 - metrics.api.errorRate * 10)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API请求统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {metrics.api.totalRequests.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">总请求数</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>系统资源使用</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>CPU使用率</span>
                    <span>{metrics.system.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.cpuUsage} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>内存使用率</span>
                    <span>{metrics.system.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.memoryUsage} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>磁盘使用率</span>
                    <span>{metrics.system.diskUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.diskUsage} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>网络性能</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {metrics.system.networkLatency.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600">网络延迟</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

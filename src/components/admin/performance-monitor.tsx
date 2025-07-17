/**
 * @fileoverview 性能监控组件（重构版）
 * @description 采用模块化架构的性能监控管理界面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Settings, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// 导入重构后的模块
import {
  PerformanceService,
  MetricsCards,
  PerformanceOverview,
  type PerformanceMetrics,
} from './performance-monitor/index';

/**
 * 性能监控组件属性接口
 */
export interface PerformanceMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 性能监控组件（重构版）
 */
export function PerformanceMonitor({
  className,
  autoRefresh: initialAutoRefresh = true,
  refreshInterval = 30000, // 30秒
}: PerformanceMonitorProps) {
  const { toast } = useToast();

  // 状态管理
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isPending, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取性能指标
   */
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 这里应该调用实际的API，现在使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟网络延迟
      
      const newMetrics = PerformanceService.generateMockMetrics();
      setMetrics(newMetrics);
      setLastUpdated(new Date());

      // 检查是否有严重问题
      const health = PerformanceService.calculateOverallHealth(newMetrics);
      if (health.status === 'critical' && health.issues.length > 0) {
        toast({
          title: '系统性能警告',
          description: `发现${health.issues.length}个严重问题，请及时处理`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || '获取性能数据失败';
      setError(errorMessage);
      toast({
        title: '数据获取失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * 手动刷新
   */
  const handleRefresh = useCallback(() => {
    fetchMetrics();
    toast({
      title: '刷新完成',
      description: '性能数据已更新',
    });
  }, [fetchMetrics, toast]);

  /**
   * 切换自动刷新
   */
  const handleToggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefresh(enabled);
    toast({
      title: '自动刷新设置',
      description: enabled ? '已启用自动刷新' : '已禁用自动刷新',
    });
  }, [toast]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  /**
   * 自动刷新定时器
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  /**
   * 导出性能报告
   */
  const handleExportReport = useCallback(() => {
    if (!metrics) return;

    const health = PerformanceService.calculateOverallHealth(metrics);
    const report = {
      timestamp: new Date().toISOString(),
      overallHealth: health,
      metrics,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '报告导出成功',
      description: '性能报告已下载到本地',
    });
  }, [metrics, toast]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Activity className="h-6 w-6" />
            <span>性能监控</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            实时监控系统性能指标和健康状态
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleExportReport}
            disabled={!metrics}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            导出报告
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 主要内容 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            详细指标
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* 概览页面 */}
        <TabsContent value="overview">
          {metrics ? (
            <PerformanceOverview
              metrics={metrics}
              lastUpdated={lastUpdated}
              isPending={isPending}
              autoRefresh={autoRefresh}
              onRefresh={handleRefresh}
              onToggleAutoRefresh={handleToggleAutoRefresh}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">正在加载性能数据...</div>
            </div>
          )}
        </TabsContent>

        {/* 详细指标页面 */}
        <TabsContent value="details">
          {metrics ? (
            <MetricsCards
              metrics={metrics}
              isPending={isPending}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">正在加载详细指标...</div>
            </div>
          )}
        </TabsContent>

        {/* 设置页面 */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>监控设置</CardTitle>
                <CardDescription>
                  配置性能监控的参数和行为
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh">自动刷新</Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={handleToggleAutoRefresh}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">性能警告通知</Label>
                  <Switch id="notifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="detailed-logs">详细日志记录</Label>
                  <Switch id="detailed-logs" />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="export-auto">自动导出报告</Label>
                  <Switch id="export-auto" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>阈值配置</CardTitle>
                <CardDescription>
                  设置性能指标的警告阈值
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">缓存命中率警告阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 60%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">数据库查询时间警告阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 200ms</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">存储使用率警告阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 90%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">CPU使用率警告阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 85%</div>
                </div>

                <Button variant="outline" className="w-full">
                  保存设置
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 导出类型
 */
export type {
  PerformanceMetrics,
  PerformanceStatus,
} from './performance-monitor/index';

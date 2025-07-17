/**
 * @fileoverview 管理员监控页面（重构版）
 * @description 采用模块化架构的系统监控管理界面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, BarChart3, Settings, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// 导入重构后的模块
import {
  MonitoringService,
  MonitoringDashboard,
  MonitoringCharts,
  type MonitoringMetrics,
  type SystemStatus,
  type UserActivity,
  type ErrorStats,
} from './index';

/**
 * 管理员监控页面（重构版）
 */
export default function AdminMonitoringPage() {
  const { toast } = useToast();

  // 状态管理
  const [isPending, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30秒
  const [error, setError] = useState<string | null>(null);

  // 数据状态
  const [metrics, setMetrics] = useState<MonitoringMetrics[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * 获取监控数据
   */
  const fetchMonitoringData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 生成模拟数据
      const newMetrics = MonitoringService.generateMockMetrics(24);
      const newSystemStatus = MonitoringService.generateMockSystemStatus();
      const newUserActivity = MonitoringService.generateMockUserActivity();
      const newErrorStats = MonitoringService.generateMockErrorStats();

      setMetrics(newMetrics);
      setSystemStatus(newSystemStatus);
      setUserActivity(newUserActivity);
      setErrorStats(newErrorStats);
      setLastUpdated(new Date());

      // 检查是否有严重问题
      if (newSystemStatus.overall === 'critical') {
        toast({
          title: '系统状态严重',
          description: '检测到系统状态异常，请立即检查',
          variant: 'destructive',
        });
      }

      // 生成告警
      const alerts = MonitoringService.generateAlerts(
        newMetrics,
        newSystemStatus,
        newErrorStats
      );

      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter(alert => alert.level === 'error');
        if (criticalAlerts.length > 0) {
          toast({
            title: '发现严重问题',
            description: `检测到${criticalAlerts.length}个严重问题`,
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || '获取监控数据失败';
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
    fetchMonitoringData();
    toast({
      title: '刷新完成',
      description: '监控数据已更新',
    });
  }, [fetchMonitoringData, toast]);

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
   * 导出监控报告
   */
  const handleExportReport = useCallback(() => {
    if (!metrics.length || !systemStatus || !userActivity || !errorStats) {
      toast({
        title: '导出失败',
        description: '监控数据不完整，无法导出报告',
        variant: 'destructive',
      });
      return;
    }

    const trend = MonitoringService.calculatePerformanceTrend(metrics);
    const alerts = MonitoringService.generateAlerts(metrics, systemStatus, errorStats);

    const report = {
      timestamp: new Date().toISOString(),
      period: '24h',
      systemStatus,
      userActivity,
      errorStats,
      performanceTrend: trend,
      alerts,
      summary: {
        totalMetrics: metrics.length,
        avgCpu: trend.summary.avgCpu,
        avgMemory: trend.summary.avgMemory,
        avgResponseTime: trend.summary.avgResponseTime,
        totalRequests: trend.summary.totalRequests,
        errorRate: trend.summary.errorRate,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '报告导出成功',
      description: '监控报告已下载到本地',
    });
  }, [metrics, systemStatus, userActivity, errorStats, toast]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  /**
   * 自动刷新定时器
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitoringData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMonitoringData]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Activity className="h-8 w-8" />
            <span>系统监控</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            实时监控系统性能、用户活动和错误统计
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleExportReport}
            disabled={isPending || !metrics.length}
          >
            <Download className="h-4 w-4 mr-2" />
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

      {/* 最后更新时间 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>最后更新: {lastUpdated.toLocaleString('zh-CN')}</span>
        {autoRefresh && (
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>自动刷新中</span>
          </span>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 主要内容 */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            仪表板
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            图表分析
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* 仪表板页面 */}
        <TabsContent value="dashboard">
          {systemStatus && userActivity && errorStats ? (
            <MonitoringDashboard
              systemStatus={systemStatus}
              userActivity={userActivity}
              errorStats={errorStats}
              latestMetrics={metrics[metrics.length - 1]}
              isPending={isPending}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">正在加载监控数据...</div>
            </div>
          )}
        </TabsContent>

        {/* 图表分析页面 */}
        <TabsContent value="charts">
          {metrics.length > 0 && userActivity && errorStats ? (
            <MonitoringCharts
              metrics={metrics}
              userActivity={userActivity}
              errorStats={errorStats}
              isPending={isPending}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">正在加载图表数据...</div>
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
                  配置监控系统的参数和行为
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
                  <Label htmlFor="alerts">实时告警</Label>
                  <Switch id="alerts" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="detailed-logs">详细日志</Label>
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
                <CardTitle>告警阈值</CardTitle>
                <CardDescription>
                  设置系统监控的告警阈值
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">CPU使用率告警阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 80%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">内存使用率告警阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 85%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">响应时间告警阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 200ms</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">错误率告警阈值</Label>
                  <div className="text-sm text-muted-foreground">当前: 5%</div>
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

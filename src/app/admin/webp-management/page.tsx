/**
 * @fileoverview WebP转换管理页面
 * @description 管理员用于监控和管理WebP转换任务的页面
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Trash2,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '@/trpc/react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * WebP管理页面组件
 */
export default function WebPManagementPage() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // API查询
  const { data: stats, refetch: refetchStats } = api.webpConversion.getStats.useQuery();
  const { data: queueStatus, refetch: refetchQueue } = api.webpConversion.getQueueStatus.useQuery();
  const { data: config } = api.webpConversion.getConfig.useQuery();
  const { data: tasksData, refetch: refetchTasks } = api.webpConversion.getTasks.useQuery({
    limit: 50,
    offset: 0,
  });

  // 类型安全的数据访问
  const statsData = stats && 'success' in stats && stats.success ? stats.stats : null;
  const queueData = queueStatus && 'success' in queueStatus && queueStatus.success ? queueStatus.status : null;
  const configData = config && 'success' in config && config.success ? config.config : null;
  const tasksListData = tasksData && 'success' in tasksData && tasksData.success ? tasksData.data : null;

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchStats();
      refetchQueue();
      refetchTasks();
    }, 5000); // 每5秒刷新

    return () => clearInterval(interval);
  }, [autoRefresh, refetchStats, refetchQueue, refetchTasks]);

  /**
   * 获取任务状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  /**
   * 获取任务状态文本
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'processing': return '处理中';
      case 'pending': return '等待中';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WebP转换管理</h1>
          <p className="text-muted-foreground">监控和管理图片WebP格式转换</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats();
              refetchQueue();
              refetchTasks();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="w-4 h-4 mr-2" />
            {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="tasks">任务列表</TabsTrigger>
          <TabsTrigger value="config">配置</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 队列状态卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">队列长度</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueData?.queueLength || 0}</div>
                <p className="text-xs text-muted-foreground">等待处理的任务</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">处理中</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueData?.processingCount || 0}</div>
                <p className="text-xs text-muted-foreground">正在处理的任务</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已完成</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueData?.completedTasks || 0}</div>
                <p className="text-xs text-muted-foreground">成功完成的任务</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">失败</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueData?.failedTasks || 0}</div>
                <p className="text-xs text-muted-foreground">处理失败的任务</p>
              </CardContent>
            </Card>
          </div>

          {/* 转换统计 */}
          {statsData && (
            <Card>
              <CardHeader>
                <CardTitle>转换统计</CardTitle>
                <CardDescription>WebP转换的整体效果统计</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statsData.totalSavingsMB}MB
                    </div>
                    <p className="text-sm text-muted-foreground">总节省空间</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statsData.averageCompressionRatio}%
                    </div>
                    <p className="text-sm text-muted-foreground">平均压缩比</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {statsData.averageProcessingTimeMs}ms
                    </div>
                    <p className="text-sm text-muted-foreground">平均处理时间</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>成功率</span>
                    <span>
                      {statsData.totalConversions > 0
                        ? ((statsData.successfulConversions / statsData.totalConversions) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={
                      statsData.totalConversions > 0
                        ? (statsData.successfulConversions / statsData.totalConversions) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 任务列表标签页 */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>转换任务</CardTitle>
              <CardDescription>查看所有WebP转换任务的详细信息</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksListData?.tasks && tasksListData.tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasksListData.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{task.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.mimeType} • {task.fileSizeMB}MB
                          </div>
                          <div className="text-xs text-muted-foreground">
                            创建于 {formatDistanceToNow(new Date(task.createdAt), {
                              addSuffix: true,
                              locale: zhCN
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {task.result && (
                          <div className="text-right text-sm">
                            <div className="text-green-600 font-medium">
                              节省 {task.result.savingsMB}MB
                            </div>
                            <div className="text-muted-foreground">
                              压缩 {task.result.compressionRatio}%
                            </div>
                          </div>
                        )}

                        <Badge className={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无转换任务
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置标签页 */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebP转换配置</CardTitle>
              <CardDescription>当前的WebP转换配置参数</CardDescription>
            </CardHeader>
            <CardContent>
              {configData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">转换状态</label>
                    <Badge variant={configData.enabled ? "default" : "secondary"}>
                      {configData.enabled ? "已启用" : "已禁用"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">有损压缩质量</label>
                    <div className="text-sm">{configData.lossyQuality}%</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">大文件压缩质量</label>
                    <div className="text-sm">{configData.largeLossyQuality}%</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">压缩努力程度</label>
                    <div className="text-sm">{configData.effort}/6</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">大文件阈值</label>
                    <div className="text-sm">{(configData.largeSizeThreshold / 1024 / 1024).toFixed(1)}MB</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">异步处理</label>
                    <Badge variant={configData.asyncProcessing ? "default" : "secondary"}>
                      {configData.asyncProcessing ? "已启用" : "已禁用"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 统计标签页 */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>详细统计</CardTitle>
              <CardDescription>WebP转换的详细统计信息</CardDescription>
            </CardHeader>
            <CardContent>
              {statsData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">转换数量</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>总转换数:</span>
                        <span>{statsData.totalConversions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>成功:</span>
                        <span className="text-green-600">{statsData.successfulConversions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>失败:</span>
                        <span className="text-red-600">{statsData.failedConversions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">存储统计</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>原始总大小:</span>
                        <span>{((statsData.totalOriginalSize || 0) / 1024 / 1024).toFixed(2)}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WebP总大小:</span>
                        <span>{((statsData.totalWebpSize || 0) / 1024 / 1024).toFixed(2)}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>节省空间:</span>
                        <span className="text-green-600">{statsData.totalSavingsMB}MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">性能指标</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>平均压缩比:</span>
                        <span>{statsData.averageCompressionRatio}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>平均处理时间:</span>
                        <span>{statsData.averageProcessingTimeMs}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

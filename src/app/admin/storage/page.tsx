/**
 * @fileoverview 存储管理页面
 * @description 管理员存储监控和清理管理界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - tRPC
 * - Tailwind CSS
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持存储监控和清理管理
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Activity,
  Clock,
  FileText,
  Database,
  Folder
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

export default function StorageManagementPage() {
  const { toast } = useToast();
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);

  // 获取当前存储状态
  const { data: storageStatus, refetch: refetchStatus } = api.storage.getCurrentStatus.useQuery();
  
  // 获取存储使用趋势
  const { data: usageTrend } = api.storage.getUsageTrend.useQuery({ days: 7 });
  
  // 获取清理历史
  const { data: cleanupHistory } = api.storage.getCleanupHistory.useQuery({ limit: 5 });
  
  // 获取服务状态
  const { data: serviceStatus } = api.storage.getServiceStatus.useQuery();

  // 手动触发监控检查
  const triggerCheck = api.storage.triggerMonitorCheck.useMutation({
    onSuccess: () => {
      toast({
        title: '检查完成',
        description: '存储空间检查已完成',
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: '检查失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 执行清理任务
  const performCleanup = api.storage.performCleanup.useMutation({
    onSuccess: (data) => {
      setIsCleanupRunning(false);
      toast({
        title: '清理完成',
        description: `删除了 ${data.report.totalFilesDeleted} 个文件，释放了 ${formatBytes(data.report.totalSpaceFreed)} 空间`,
      });
      refetchStatus();
    },
    onError: (error) => {
      setIsCleanupRunning(false);
      toast({
        title: '清理失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 切换监控状态
  const toggleMonitoring = api.storage.toggleMonitoring.useMutation({
    onSuccess: (data) => {
      toast({
        title: data.monitoring ? '监控已启动' : '监控已停止',
        description: `存储监控${data.monitoring ? '已启动' : '已停止'}`,
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCleanup = (dryRun: boolean = false) => {
    setIsCleanupRunning(true);
    performCleanup.mutate({ dryRun });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (usage: number): string => {
    if (usage >= 95) return 'text-red-500';
    if (usage >= 85) return 'text-orange-500';
    if (usage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getAlertVariant = (level: string): 'default' | 'destructive' => {
    return level === 'EMERGENCY' || level === 'CRITICAL' ? 'destructive' : 'default';
  };

  if (!storageStatus) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">存储管理</h1>
          <p className="text-muted-foreground">监控和管理系统存储空间</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => triggerCheck.mutate()}
            disabled={triggerCheck.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerCheck.isPending ? 'animate-spin' : ''}`} />
            刷新检查
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleMonitoring.mutate({ 
              enable: !serviceStatus?.monitor?.isMonitoring 
            })}
            disabled={toggleMonitoring.isPending}
          >
            <Activity className="h-4 w-4 mr-2" />
            {serviceStatus?.monitor?.isMonitoring ? '停止监控' : '启动监控'}
          </Button>
        </div>
      </div>

      {/* 存储状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">磁盘使用率</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getUsageColor(storageStatus.diskInfo.usage)}>
                {storageStatus.diskInfo.usage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={storageStatus.diskInfo.usage} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              已用 {formatBytes(Number(storageStatus.diskInfo.used))} / 总计 {formatBytes(Number(storageStatus.diskInfo.total))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可用空间</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(Number(storageStatus.diskInfo.free))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              剩余可用空间
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃预警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageStatus.alerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              未解决的预警数量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 预警信息 */}
      {storageStatus.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">活跃预警</h3>
          {storageStatus.alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.level)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                <Badge variant={alert.level === 'EMERGENCY' ? 'destructive' : 'secondary'}>
                  {alert.level}
                </Badge>
                <span className="ml-2">{alert.message}</span>
              </AlertTitle>
              <AlertDescription>
                {new Date(alert.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="directories">目录详情</TabsTrigger>
          <TabsTrigger value="cleanup">清理管理</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 使用趋势图表 */}
          <Card>
            <CardHeader>
              <CardTitle>7天使用趋势</CardTitle>
              <CardDescription>磁盘空间使用率变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              {usageTrend && usageTrend.length > 0 ? (
                <div className="space-y-2">
                  {usageTrend.slice(-7).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">
                        {new Date(trend.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress value={trend.usage} className="w-32" />
                        <span className="text-sm font-medium w-12">
                          {trend.usage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">暂无趋势数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>目录空间使用情况</CardTitle>
              <CardDescription>各目录的文件数量和占用空间</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storageStatus.directoryInfos.map((dir, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{dir.path.split('/').pop() || dir.path}</p>
                        <p className="text-sm text-muted-foreground">{dir.path}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatBytes(dir.size)}</p>
                      <p className="text-sm text-muted-foreground">{dir.fileCount} 个文件</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>清理操作</CardTitle>
                <CardDescription>执行文件清理任务</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCleanup(true)}
                    disabled={isCleanupRunning}
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    预览清理
                  </Button>
                  <Button
                    onClick={() => handleCleanup(false)}
                    disabled={isCleanupRunning}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isCleanupRunning ? '清理中...' : '执行清理'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  预览清理将显示可清理的文件，但不会实际删除。执行清理将永久删除文件。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>清理历史</CardTitle>
                <CardDescription>最近的清理任务记录</CardDescription>
              </CardHeader>
              <CardContent>
                {cleanupHistory && cleanupHistory.length > 0 ? (
                  <div className="space-y-3">
                    {cleanupHistory.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">
                            删除 {record.totalFilesDeleted} 个文件
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatBytes(record.totalSpaceFreed)}
                          </p>
                          <Badge variant={record.success ? 'default' : 'destructive'}>
                            {record.success ? '成功' : '失败'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">暂无清理记录</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>监控设置</CardTitle>
              <CardDescription>配置存储监控参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用存储监控</Label>
                  <p className="text-sm text-muted-foreground">
                    自动监控磁盘空间使用情况
                  </p>
                </div>
                <Switch 
                  checked={serviceStatus?.monitor?.isMonitoring || false}
                  onCheckedChange={(checked) => 
                    toggleMonitoring.mutate({ enable: checked })
                  }
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>警告阈值 (%)</Label>
                  <Input 
                    type="number" 
                    defaultValue={serviceStatus?.monitor?.config?.warningThreshold || 75}
                    min={50}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>严重阈值 (%)</Label>
                  <Input 
                    type="number" 
                    defaultValue={serviceStatus?.monitor?.config?.criticalThreshold || 85}
                    min={50}
                    max={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

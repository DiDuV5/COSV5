/**
 * @fileoverview 系统监控组件
 * @description 展示CPU、内存、磁盘等系统资源使用情况
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
  loadAverage: number[];
}

interface SystemMonitorProps {
  data?: SystemStats;
  isLoading?: boolean;
  showAlerts?: boolean;
}

export function SystemMonitor({
  data,
  isLoading = false,
  showAlerts = true
}: SystemMonitorProps) {
  if (isLoading) {
    return <SystemMonitorSkeleton />;
  }

  if (!data) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          暂无系统监控数据。请确保系统监控服务已启用。
        </AlertDescription>
      </Alert>
    );
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'text-red-600';
    if (usage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageStatus = (usage: number) => {
    if (usage >= 90) return { text: '危险', variant: 'destructive' as const };
    if (usage >= 75) return { text: '警告', variant: 'secondary' as const };
    return { text: '正常', variant: 'default' as const };
  };

  const alerts: Array<{ type: 'error' | 'warning'; message: string }> = [];
  if (showAlerts) {
    if (data.cpu.usage >= 90) {
      alerts.push({ type: 'error', message: `CPU使用率过高: ${data.cpu.usage.toFixed(1)}%` });
    }
    if (data.memory.usage >= 90) {
      alerts.push({ type: 'error', message: `内存使用率过高: ${data.memory.usage.toFixed(1)}%` });
    }
    if (data.disk.usage >= 90) {
      alerts.push({ type: 'error', message: `磁盘使用率过高: ${data.disk.usage.toFixed(1)}%` });
    }
    if (data.loadAverage[0] > data.cpu.cores * 2) {
      alerts.push({ type: 'warning', message: `系统负载过高: ${data.loadAverage[0].toFixed(2)}` });
    }
  }

  return (
    <div className="space-y-6">
      {/* 系统告警 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 系统资源监控 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU监控 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span>CPU使用率</span>
              </div>
              <Badge variant={getUsageStatus(data.cpu.usage).variant}>
                {getUsageStatus(data.cpu.usage).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getUsageColor(data.cpu.usage)}`}>
                  {data.cpu.usage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  {data.cpu.cores} 核心
                </span>
              </div>
              <Progress value={data.cpu.usage} className="h-2" />
              {data.cpu.temperature && (
                <div className="text-xs text-gray-500">
                  温度: {data.cpu.temperature}°C
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 内存监控 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-4 w-4 text-green-600" />
                <span>内存使用率</span>
              </div>
              <Badge variant={getUsageStatus(data.memory.usage).variant}>
                {getUsageStatus(data.memory.usage).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getUsageColor(data.memory.usage)}`}>
                  {data.memory.usage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  {formatBytes(data.memory.total)}
                </span>
              </div>
              <Progress value={data.memory.usage} className="h-2" />
              <div className="text-xs text-gray-500">
                已用: {formatBytes(data.memory.used)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 磁盘监控 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-purple-600" />
                <span>磁盘使用率</span>
              </div>
              <Badge variant={getUsageStatus(data.disk.usage).variant}>
                {getUsageStatus(data.disk.usage).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getUsageColor(data.disk.usage)}`}>
                  {data.disk.usage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  {formatBytes(data.disk.total)}
                </span>
              </div>
              <Progress value={data.disk.usage} className="h-2" />
              <div className="text-xs text-gray-500">
                已用: {formatBytes(data.disk.used)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 网络监控 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center space-x-2">
                <Network className="h-4 w-4 text-orange-600" />
                <span>网络流量</span>
              </div>
              <Badge variant="outline">
                实时
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">入站</span>
                  <span className="font-medium text-green-600">
                    {formatBytes(data.network.bytesIn)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">出站</span>
                  <span className="font-medium text-blue-600">
                    {formatBytes(data.network.bytesOut)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                数据包: {data.network.packetsIn.toLocaleString()} / {data.network.packetsOut.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>系统信息</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">系统运行时间</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatUptime(data.uptime)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">系统负载</div>
              <div className="text-lg font-semibold text-green-600">
                {data.loadAverage.map(load => load.toFixed(2)).join(' / ')}
              </div>
              <div className="text-xs text-gray-500">
                1分钟 / 5分钟 / 15分钟
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">系统状态</div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-lg font-semibold text-green-600">运行正常</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SystemMonitorSkeleton() {
  return (
    <div className="space-y-6">
      {/* 资源监控骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 系统信息骨架 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

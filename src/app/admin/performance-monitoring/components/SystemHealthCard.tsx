/**
 * @fileoverview 系统健康状态卡片组件
 * @description 显示系统整体健康状态和连接状态
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import type { SystemHealthCardProps } from './types';
import { getHealthColor, getHealthText, getSlowQueryStatusColor } from './utils';

/**
 * 系统健康状态卡片组件
 */
export function SystemHealthCard({
  systemHealth,
  redisConnected,
  databaseConnected,
  recentSlowQueries,
  className = ""
}: SystemHealthCardProps) {
  return (
    <Card className={`md:col-span-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <span>系统健康状态</span>
          </div>
          <Badge className={getHealthColor(systemHealth)}>
            {getHealthText(systemHealth)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <ConnectionStatus
              label="Redis连接"
              connected={redisConnected}
            />
            <ConnectionStatus
              label="数据库连接"
              connected={databaseConnected}
            />
          </div>

          <div className="space-y-2">
            <SlowQueryStatus count={recentSlowQueries} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 连接状态组件
 */
function ConnectionStatus({ 
  label, 
  connected 
}: { 
  label: string; 
  connected: boolean; 
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center space-x-1">
        {connected ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? '正常' : '异常'}
        </span>
      </div>
    </div>
  );
}

/**
 * 慢查询状态组件
 */
function SlowQueryStatus({ count }: { count: number }) {
  const getIcon = () => {
    if (count === 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (count < 5) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">慢查询</span>
      <div className="flex items-center space-x-1">
        {getIcon()}
        <span className={`text-xs ${getSlowQueryStatusColor(count)}`}>
          {count} 个
        </span>
      </div>
    </div>
  );
}

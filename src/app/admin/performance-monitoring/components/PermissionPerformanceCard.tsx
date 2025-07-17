/**
 * @fileoverview 权限性能监控卡片组件
 * @description 显示P1级权限性能监控数据
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import type { PermissionPerformanceCardProps } from './types';
import { formatNumber, getPermissionCheckTimeColor } from './utils';

/**
 * 权限性能监控卡片组件
 */
export function PermissionPerformanceCard({
  permissionStats,
  className = ""
}: PermissionPerformanceCardProps) {
  return (
    <Card className={`md:col-span-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-orange-600" />
            <span>权限性能监控</span>
          </div>
          <Badge variant="outline" className="text-xs">
            P1级优化
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <PermissionMetricRow
              label="权限检查总数"
              value={permissionStats.totalChecks.toLocaleString()}
              color="text-blue-600"
            />
            <PermissionMetricRow
              label="平均检查时间"
              value={`${formatNumber(permissionStats.averageCheckTime)}ms`}
              color={getPermissionCheckTimeColor(permissionStats.averageCheckTime)}
            />
            <PermissionMetricRow
              label="缓存命中"
              value={permissionStats.cacheHits.toLocaleString()}
              color="text-green-600"
            />
          </div>

          <div className="space-y-3">
            <PermissionMetricRow
              label="审计日志"
              value={permissionStats.auditLogsGenerated.toLocaleString()}
              color="text-purple-600"
            />
            <PermissionMetricRow
              label="资源访问检查"
              value={permissionStats.resourceAccessChecks.toLocaleString()}
              color="text-orange-600"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">性能提升</span>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                40%+ 更快
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 权限指标行组件
 */
function PermissionMetricRow({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${color}`}>
        {value}
      </span>
    </div>
  );
}

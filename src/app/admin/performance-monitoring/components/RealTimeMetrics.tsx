/**
 * @fileoverview 实时性能指标组件 - 主入口文件
 * @description 重构后的实时性能指标组件，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// 导入重构后的子组件
import { QPSCard, ResponseTimeCard, ActiveConnectionsCard, CacheHitRateCard } from "./MetricCard";
import { SystemHealthCard } from "./SystemHealthCard";
import { CachePerformanceCard } from "./CachePerformanceCard";
import { PermissionPerformanceCard } from "./PermissionPerformanceCard";
import { RealTimeMetricsSkeleton } from "./RealTimeMetricsSkeleton";
import { MetricsCard, CacheHitRateCard as LegacyCacheCard, PermissionCheckTimeCard } from "./MetricsCard";

// 导入类型和工具函数
import type { RealTimeMetricsProps } from './types';
import {
  getResponseTimeStatusText,
  getResponseTimeStatusColor,
  getConnectionStatusText,
  getConnectionStatusColor,
  getCacheHitRateStatusText,
  getCacheHitRateStatusColor
} from './utils';

/**
 * 实时性能指标主组件
 * 保持100%向后兼容性，所有原有API接口不变
 */

export function RealTimeMetrics({ data, isLoading }: RealTimeMetricsProps) {
  // 加载状态处理
  if (isLoading) {
    return <RealTimeMetricsSkeleton />;
  }

  // 数据为空处理
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>无法获取实时指标数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 为可选字段提供默认值
  const cacheHitRate = data.cacheHitRate ?? 0;
  const systemHealth = data.systemHealth ?? 'good';
  const redisConnected = data.redisConnected ?? false;
  const databaseConnected = data.databaseConnected ?? false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 基础性能指标 */}
      <QPSCard qps={data.currentQPS} />

      <ResponseTimeCard
        responseTime={data.averageResponseTime}
        getStatusText={getResponseTimeStatusText}
        getStatusColor={getResponseTimeStatusColor}
      />

      <ActiveConnectionsCard
        connections={data.activeConnections}
        getStatusText={getConnectionStatusText}
        getStatusColor={getConnectionStatusColor}
      />

      <CacheHitRateCard
        hitRate={cacheHitRate}
        getStatusText={getCacheHitRateStatusText}
        getStatusColor={getCacheHitRateStatusColor}
      />

      {/* 系统健康状态 */}
      <SystemHealthCard
        systemHealth={systemHealth}
        redisConnected={redisConnected}
        databaseConnected={databaseConnected}
        recentSlowQueries={data.recentSlowQueries}
      />



      {/* P1级缓存性能监控 */}
      {data.cacheStats && (
        <CachePerformanceCard cacheStats={data.cacheStats} />
      )}

      {/* P1级权限性能监控 */}
      {data.permissionStats && (
        <PermissionPerformanceCard permissionStats={data.permissionStats} />
      )}

      {/* 使用新的MetricsCard组件展示关键指标（保持向后兼容） */}
      {data.cacheStats && (
        <LegacyCacheCard
          hitRate={data.cacheStats.hitRate}
          isLoading={false}
        />
      )}

      {data.permissionStats && (
        <PermissionCheckTimeCard
          checkTime={data.permissionStats.averageCheckTime}
          isLoading={false}
        />
      )}
    </div>
  );
}

// 骨架屏组件已移动到独立文件 RealTimeMetricsSkeleton.tsx
// 保持向后兼容性的导出
export { RealTimeMetricsSkeleton } from './RealTimeMetricsSkeleton';

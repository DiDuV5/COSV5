/**
 * @fileoverview 实时指标骨架屏组件
 * @description 加载状态下的骨架屏显示
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 实时指标骨架屏组件
 */
export function RealTimeMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 基础指标骨架 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <BasicMetricSkeleton key={i} />
      ))}

      {/* 系统健康状态骨架 */}
      <SystemHealthSkeleton />

      {/* P1级缓存监控骨架 */}
      <PerformanceCardSkeleton />

      {/* P1级权限监控骨架 */}
      <PerformanceCardSkeleton />
    </div>
  );
}

/**
 * 基础指标卡片骨架
 */
function BasicMetricSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-12" />
      </CardContent>
    </Card>
  );
}

/**
 * 系统健康状态骨架
 */
function SystemHealthSkeleton() {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 性能监控卡片骨架
 */
function PerformanceCardSkeleton() {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

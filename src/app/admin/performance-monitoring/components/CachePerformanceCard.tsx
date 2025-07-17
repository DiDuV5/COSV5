/**
 * @fileoverview 缓存性能监控卡片组件
 * @description 显示P1级缓存性能监控数据
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import type { CachePerformanceCardProps } from './types';
import { formatPercentage, getCacheHitRateColor } from './utils';

/**
 * 缓存性能监控卡片组件
 */
export function CachePerformanceCard({
  cacheStats,
  className = ""
}: CachePerformanceCardProps) {
  return (
    <Card className={`md:col-span-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-purple-600" />
            <span>缓存性能监控</span>
          </div>
          <Badge variant="outline" className="text-xs">
            P1级优化
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <CacheMetricRow
              label="命中率"
              value={formatPercentage(cacheStats.hitRate)}
              color={getCacheHitRateColor(cacheStats.hitRate)}
            />
            <CacheMetricRow
              label="穿透防护"
              value={cacheStats.penetrationPrevented.toLocaleString()}
              color="text-blue-600"
            />
            <CacheMetricRow
              label="预热执行"
              value={cacheStats.warmupExecuted.toLocaleString()}
              color="text-green-600"
            />
          </div>

          <div className="space-y-3">
            <CacheMetricRow
              label="缓存命中"
              value={cacheStats.hits.toLocaleString()}
              color="text-green-600"
            />
            <CacheMetricRow
              label="缓存未命中"
              value={cacheStats.misses.toLocaleString()}
              color="text-orange-600"
            />
            <CacheMetricRow
              label="动态TTL调整"
              value={cacheStats.dynamicTTLAdjustments.toLocaleString()}
              color="text-purple-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 缓存指标行组件
 */
function CacheMetricRow({
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

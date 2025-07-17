/**
 * @fileoverview 基础指标卡片组件
 * @description 可复用的指标显示卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MetricCardProps } from './types';

/**
 * 基础指标卡片组件
 */
export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  color,
  badge,
  className = ""
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span>{title}</span>
          </div>
          {badge && (
            <Badge variant={badge.variant} className={`text-xs ${badge.className || ''}`}>
              {badge.text}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-2xl font-bold ${color}`}>
            {value}
          </div>
          {unit && (
            <div className="text-xs text-gray-500">
              {unit}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * QPS指标卡片
 */
export function QPSCard({ 
  qps, 
  className = "" 
}: { 
  qps: number; 
  className?: string; 
}) {
  return (
    <MetricCard
      title="每秒查询数"
      value={qps.toFixed(1)}
      unit="查询/秒"
      icon={({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
      color="text-blue-600"
      badge={{
        text: "QPS",
        variant: "outline"
      }}
      className={className}
    />
  );
}

/**
 * 响应时间指标卡片
 */
export function ResponseTimeCard({ 
  responseTime, 
  getStatusText,
  getStatusColor,
  className = "" 
}: { 
  responseTime: number; 
  getStatusText: (time: number) => string;
  getStatusColor: (time: number) => string;
  className?: string; 
}) {
  return (
    <MetricCard
      title="平均响应时间"
      value={responseTime.toFixed(1)}
      unit="毫秒"
      icon={({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
      )}
      color="text-green-600"
      badge={{
        text: getStatusText(responseTime),
        variant: "outline",
        className: getStatusColor(responseTime)
      }}
      className={className}
    />
  );
}

/**
 * 活跃连接数指标卡片
 */
export function ActiveConnectionsCard({ 
  connections, 
  getStatusText,
  getStatusColor,
  className = "" 
}: { 
  connections: number; 
  getStatusText: (connections: number) => string;
  getStatusColor: (connections: number) => string;
  className?: string; 
}) {
  return (
    <MetricCard
      title="活跃连接"
      value={connections}
      unit="个连接"
      icon={({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      )}
      color="text-purple-600"
      badge={{
        text: getStatusText(connections),
        variant: "outline",
        className: getStatusColor(connections)
      }}
      className={className}
    />
  );
}

/**
 * 缓存命中率指标卡片
 */
export function CacheHitRateCard({ 
  hitRate, 
  getStatusText,
  getStatusColor,
  className = "" 
}: { 
  hitRate: number; 
  getStatusText: (rate: number) => string;
  getStatusColor: (rate: number) => string;
  className?: string; 
}) {
  return (
    <MetricCard
      title="缓存命中率"
      value={`${hitRate.toFixed(1)}%`}
      unit="命中率"
      icon={({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      )}
      color="text-orange-600"
      badge={{
        text: getStatusText(hitRate),
        variant: "outline",
        className: getStatusColor(hitRate)
      }}
      className={className}
    />
  );
}

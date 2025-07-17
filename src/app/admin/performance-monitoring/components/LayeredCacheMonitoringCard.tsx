/**
 * @fileoverview 三级缓存架构监控卡片组件
 * @description 显示L1(内存) -> L2(Redis) -> L3(数据库)三级缓存架构的详细监控数据
 * @author Augment AI
 * @date 2025-07-07
 * @version 1.0.0
 */

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Zap, 
  Server, 
  HardDrive,
  TrendingUp,
  Clock,
  Activity,
  BarChart3
} from "lucide-react";

/**
 * 三级缓存统计数据接口
 */
export interface LayeredCacheStats {
  overall: {
    totalRequests: number;
    totalHits: number;
    hitRate: number;
    avgResponseTime: number;
  };
  l1Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    size: number;
    maxSize: number;
  };
  l2Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    memoryUsage: number;
    keyCount: number;
  };
  l3Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    slowQueries: number;
    totalQueries: number;
  };
}

/**
 * 组件属性接口
 */
export interface LayeredCacheMonitoringCardProps {
  stats: LayeredCacheStats;
  className?: string;
  isLoading?: boolean;
}

/**
 * 三级缓存监控卡片组件
 */
export function LayeredCacheMonitoringCard({
  stats,
  className = "",
  isLoading = false
}: LayeredCacheMonitoringCardProps) {
  if (isLoading) {
    return <LayeredCacheMonitoringCardSkeleton className={className} />;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">三级缓存架构监控</h3>
              <p className="text-sm text-gray-500">L1(内存) → L2(Redis) → L3(数据库)</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-blue-50 text-green-700 border-green-200">
            P2级优化
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 整体性能概览 */}
        <OverallPerformanceSection stats={stats.overall} />
        
        <Separator />
        
        {/* L1 内存缓存层 */}
        <CacheLayerSection
          title="L1 内存缓存"
          icon={<Zap className="h-4 w-4" />}
          color="text-green-600"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          stats={stats.l1Stats}
          targetResponseTime="<1ms"
          additionalMetrics={[
            { label: "缓存大小", value: `${stats.l1Stats.size}/${stats.l1Stats.maxSize}` },
            { label: "内存使用率", value: `${Math.round((stats.l1Stats.size / stats.l1Stats.maxSize) * 100)}%` }
          ]}
        />
        
        <Separator />
        
        {/* L2 Redis缓存层 */}
        <CacheLayerSection
          title="L2 Redis缓存"
          icon={<Server className="h-4 w-4" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          stats={stats.l2Stats}
          targetResponseTime="<10ms"
          additionalMetrics={[
            { label: "键数量", value: stats.l2Stats.keyCount.toLocaleString() },
            { label: "内存使用", value: `${Math.round(stats.l2Stats.memoryUsage / 1024 / 1024)}MB` }
          ]}
        />
        
        <Separator />
        
        {/* L3 数据库层 */}
        <CacheLayerSection
          title="L3 数据库"
          icon={<HardDrive className="h-4 w-4" />}
          color="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          stats={stats.l3Stats}
          targetResponseTime="<100ms"
          additionalMetrics={[
            { label: "总查询数", value: stats.l3Stats.totalQueries.toLocaleString() },
            { label: "慢查询数", value: stats.l3Stats.slowQueries.toLocaleString() }
          ]}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 整体性能概览组件
 */
function OverallPerformanceSection({ stats }: { stats: LayeredCacheStats['overall'] }) {
  const getHitRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 10) return "text-green-600";
    if (time <= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-2">
          <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
          <span className="text-sm font-medium text-gray-600">总命中率</span>
        </div>
        <div className={`text-2xl font-bold ${getHitRateColor(stats.hitRate)}`}>
          {stats.hitRate.toFixed(1)}%
        </div>
        <Progress value={stats.hitRate} className="mt-2 h-2" />
      </div>
      
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-2">
          <Clock className="h-4 w-4 text-purple-600 mr-1" />
          <span className="text-sm font-medium text-gray-600">平均响应</span>
        </div>
        <div className={`text-2xl font-bold ${getResponseTimeColor(stats.avgResponseTime)}`}>
          {stats.avgResponseTime.toFixed(1)}ms
        </div>
      </div>
      
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-2">
          <Activity className="h-4 w-4 text-green-600 mr-1" />
          <span className="text-sm font-medium text-gray-600">总请求数</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {stats.totalRequests.toLocaleString()}
        </div>
      </div>
      
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-2">
          <BarChart3 className="h-4 w-4 text-orange-600 mr-1" />
          <span className="text-sm font-medium text-gray-600">总命中数</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {stats.totalHits.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

/**
 * 缓存层级组件属性接口
 */
interface CacheLayerSectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
  };
  targetResponseTime: string;
  additionalMetrics: Array<{ label: string; value: string }>;
}

/**
 * 缓存层级组件
 */
function CacheLayerSection({
  title,
  icon,
  color,
  bgColor,
  borderColor,
  stats,
  targetResponseTime,
  additionalMetrics
}: CacheLayerSectionProps) {
  const getHitRateColor = (rate: number) => {
    if (rate >= 85) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={`p-4 ${bgColor} border ${borderColor} rounded-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`${color}`}>{icon}</div>
          <h4 className={`font-semibold ${color}`}>{title}</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          目标: {targetResponseTime}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-600">命中率</span>
          <div className={`font-semibold ${getHitRateColor(stats.hitRate)}`}>
            {stats.hitRate.toFixed(1)}%
          </div>
        </div>
        
        <div>
          <span className="text-gray-600">响应时间</span>
          <div className="font-semibold text-gray-900">
            {stats.avgResponseTime.toFixed(1)}ms
          </div>
        </div>
        
        <div>
          <span className="text-gray-600">命中数</span>
          <div className="font-semibold text-green-600">
            {stats.hits.toLocaleString()}
          </div>
        </div>
        
        <div>
          <span className="text-gray-600">未命中数</span>
          <div className="font-semibold text-orange-600">
            {stats.misses.toLocaleString()}
          </div>
        </div>
        
        {additionalMetrics.map((metric, index) => (
          <div key={index}>
            <span className="text-gray-600">{metric.label}</span>
            <div className="font-semibold text-gray-900">{metric.value}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-3">
        <Progress value={stats.hitRate} className="h-2" />
      </div>
    </div>
  );
}

/**
 * 加载骨架屏组件
 */
function LayeredCacheMonitoringCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div>
              <div className="w-48 h-5 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-64 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg">
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

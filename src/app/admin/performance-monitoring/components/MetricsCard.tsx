/**
 * @fileoverview 性能指标卡片组件
 * @description 可复用的性能指标展示卡片
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricsCardProps {
  /** 卡片标题 */
  title: string;
  /** 主要数值 */
  value: string | number;
  /** 数值单位 */
  unit?: string;
  /** 图标 */
  icon: LucideIcon;
  /** 图标颜色 */
  iconColor?: string;
  /** 趋势指示 */
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  /** 进度条（可选） */
  progress?: {
    value: number;
    max: number;
    color?: string;
  };
  /** 状态徽章 */
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    color?: string;
  };
  /** 额外信息 */
  description?: string;
  /** 子内容 */
  children?: ReactNode;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 卡片大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 点击事件 */
  onClick?: () => void;
}

export function MetricsCard({
  title,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  progress,
  badge,
  description,
  children,
  isLoading = false,
  size = 'md',
  onClick,
}: MetricsCardProps) {
  if (isLoading) {
    return <MetricsCardSkeleton size={size} />;
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = (isPositive: boolean) => {
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (isPositive: boolean) => {
    return isPositive ? '↗' : '↘';
  };

  const cardSizeClasses = {
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6',
  };

  const titleSizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-xs sm:text-sm',
    lg: 'text-sm sm:text-base',
  };

  const valueSizeClasses = {
    sm: 'text-base sm:text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className={`pb-2 ${cardSizeClasses[size]}`}>
        <CardTitle className={`flex items-center justify-between ${titleSizeClasses[size]} font-medium`}>
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span>{title}</span>
          </div>
          {badge && (
            <Badge
              variant={badge.variant || 'outline'}
              className={`text-xs ${badge.color || ''}`}
            >
              {badge.text}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className={cardSizeClasses[size]}>
        <div className="space-y-3">
          {/* 主要数值 */}
          <div className="flex items-baseline space-x-2">
            <div className={`font-bold ${iconColor} ${valueSizeClasses[size]}`}>
              {formatValue(value)}
            </div>
            {unit && (
              <div className="text-sm text-gray-500">
                {unit}
              </div>
            )}
          </div>

          {/* 趋势指示 */}
          {trend && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getTrendColor(trend.isPositive)}`}>
                {getTrendIcon(trend.isPositive)} {Math.abs(trend.value).toFixed(1)}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-500">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {/* 进度条 */}
          {progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{progress.value.toLocaleString()}</span>
                <span>{progress.max.toLocaleString()}</span>
              </div>
              <Progress
                value={(progress.value / progress.max) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* 描述信息 */}
          {description && (
            <div className="text-xs text-gray-500">
              {description}
            </div>
          )}

          {/* 子内容 */}
          {children && (
            <div className="mt-3">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cardSizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  return (
    <Card>
      <CardHeader className={`pb-2 ${cardSizeClasses[size]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>

      <CardContent className={cardSizeClasses[size]}>
        <div className="space-y-3">
          <div className="flex items-baseline space-x-2">
            <Skeleton className={`w-20 ${valueSizeClasses[size]}`} />
            <Skeleton className="h-4 w-8" />
          </div>

          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>

          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// 预定义的常用指标卡片
export function CacheHitRateCard({
  hitRate,
  isLoading = false
}: {
  hitRate: number;
  isLoading?: boolean;
}) {
  return (
    <MetricsCard
      title="缓存命中率"
      value={hitRate.toFixed(1)}
      unit="%"
      icon={require('lucide-react').Database}
      iconColor="text-blue-600"
      isLoading={isLoading}
      progress={{
        value: hitRate,
        max: 100,
        color: hitRate >= 85 ? 'bg-green-500' : hitRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
      }}
      badge={{
        text: hitRate >= 85 ? '优秀' : hitRate >= 70 ? '良好' : '需优化',
        variant: hitRate >= 85 ? 'default' : hitRate >= 70 ? 'secondary' : 'destructive'
      }}
      description="P1级缓存优化目标: 85%+"
    />
  );
}

export function PermissionCheckTimeCard({
  checkTime,
  isLoading = false
}: {
  checkTime: number;
  isLoading?: boolean;
}) {
  return (
    <MetricsCard
      title="权限检查时间"
      value={checkTime.toFixed(1)}
      unit="ms"
      icon={require('lucide-react').Shield}
      iconColor="text-orange-600"
      isLoading={isLoading}
      trend={{
        value: 40, // P1级优化减少40%
        isPositive: true,
        label: 'P1级优化'
      }}
      badge={{
        text: checkTime < 10 ? '优秀' : checkTime < 20 ? '良好' : '需优化',
        variant: checkTime < 10 ? 'default' : checkTime < 20 ? 'secondary' : 'destructive'
      }}
      description="P1级权限优化目标: <10ms"
    />
  );
}

/**
 * @fileoverview 用户统计卡片组件
 * @description 显示用户统计数据的卡片组件
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Eye,
} from "lucide-react";
import {
  type UserStatsOverview,
  formatNumber,
  formatPercentage
} from "../types/user-groups-types";

interface UserStatsCardsProps {
  overview: UserStatsOverview | null;
  isPending?: boolean;
  className?: string;
}

/**
 * 用户统计卡片组件
 */
export function UserStatsCards({ overview, isPending, className }: UserStatsCardsProps) {
  if (isPending) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-12" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-gray-500">
              暂无数据
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      {/* 总用户数 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总用户数</p>
              <p className="text-2xl font-bold">{formatNumber(overview.totalUsers)}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* 活跃用户 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">活跃用户</p>
              <p className="text-2xl font-bold">{formatNumber(overview.totalActiveUsers)}</p>
              <p className="text-xs text-gray-500">
                活跃率: {formatPercentage(overview.activeRate)}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* 新用户 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">新用户</p>
              <p className="text-2xl font-bold">{formatNumber(overview.totalNewUsers)}</p>
              <div className="flex items-center gap-1">
                {overview.growthRate >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <p className={`text-xs ${overview.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {overview.growthRate >= 0 ? '+' : ''}{formatPercentage(overview.growthRate)}
                </p>
              </div>
            </div>
            <UserPlus className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      {/* 总发布数 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总发布数</p>
              <p className="text-2xl font-bold">{formatNumber(overview.totalPosts)}</p>
              <p className="text-xs text-gray-500">最近7天</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 单个统计卡片组件
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "yellow";
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}) {
  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
    red: "text-red-500",
    yellow: "text-yellow-500",
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <p className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
                </p>
              </div>
            )}
          </div>
          <Icon className={`w-8 h-8 ${colorClasses[color]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 详细统计卡片组件
 */
export function DetailedStatsCard({
  title,
  description,
  stats,
  className,
}: {
  title: string;
  description?: string;
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    color?: string;
  }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stat.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                )}
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                </span>
                {stat.change !== undefined && (
                  <Badge variant={stat.change >= 0 ? "default" : "destructive"}>
                    {stat.change >= 0 ? '+' : ''}{formatPercentage(stat.change)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 活动统计卡片组件
 */
export function ActivityStatsCard({
  activityMetrics,
  isPending,
  className,
}: {
  activityMetrics: any;
  isPending?: boolean;
  className?: string;
}) {
  if (isPending) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>用户活动统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activityMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>用户活动统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            暂无活动数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          用户活动统计
        </CardTitle>
        <CardDescription>
          用户活动和参与度指标
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(activityMetrics.totalSessions)}
            </div>
            <div className="text-sm text-gray-600">总会话数</div>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(activityMetrics.avgSessionDuration / 60)}m
            </div>
            <div className="text-sm text-gray-600">平均会话时长</div>
          </div>

          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(activityMetrics.totalPageViews)}
            </div>
            <div className="text-sm text-gray-600">页面浏览量</div>
          </div>

          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatPercentage(activityMetrics.bounceRate)}
            </div>
            <div className="text-sm text-gray-600">跳出率</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 快速统计组件
 */
export function QuickStats({ overview }: { overview: UserStatsOverview }) {
  const conversionRate = overview.totalUsers > 0
    ? (overview.totalNewUsers / overview.totalUsers) * 100
    : 0;

  const postsPerUser = overview.totalUsers > 0
    ? overview.totalPosts / overview.totalUsers
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">
          {formatNumber(overview.totalUsers)}
        </div>
        <div className="text-sm text-gray-600">总用户</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {formatPercentage(overview.activeRate)}
        </div>
        <div className="text-sm text-gray-600">活跃率</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-600">
          {formatPercentage(conversionRate)}
        </div>
        <div className="text-sm text-gray-600">新用户率</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">
          {postsPerUser.toFixed(1)}
        </div>
        <div className="text-sm text-gray-600">人均发布</div>
      </div>
    </div>
  );
}

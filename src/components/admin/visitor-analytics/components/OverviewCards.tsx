/**
 * @fileoverview 概览统计卡片组件
 * @description 显示访客分析的概览统计数据
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
  Eye,
  Globe,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Clock,
  Activity,
} from "lucide-react";
import {
  type OverviewStats,
  formatNumber,
  formatDuration,
  formatPercentage
} from "../types/analytics-types";

interface OverviewCardsProps {
  stats: OverviewStats | null;
  isPending?: boolean;
  className?: string;
}

/**
 * 概览统计卡片组件
 */
export function OverviewCards({ stats, isPending, className }: OverviewCardsProps) {
  if (isPending) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg animate-pulse">
                  <div className="w-6 h-6 bg-gray-300 rounded" />
                </div>
                <div className="ml-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              暂无数据
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* 总访客数 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总访客</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.totalVisitors)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 独立访客数 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">独立访客</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.uniqueVisitors)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 页面浏览量 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Globe className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">页面浏览</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.pageViews)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 增长率 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              {stats.growth >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">增长率</p>
              <p className={`text-2xl font-bold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growth >= 0 ? '+' : ''}{formatPercentage(stats.growth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新注册用户 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">新注册</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.newRegistrations)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 跳出率 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">跳出率</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(stats.bounceRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 平均会话时长 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Clock className="w-6 h-6 text-pink-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">会话时长</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(stats.avgSessionDuration)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户活跃度 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">活跃度</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(100 - stats.bounceRate)}
                </p>
                <Badge variant={stats.bounceRate < 50 ? "default" : "secondary"}>
                  {stats.bounceRate < 50 ? "良好" : "一般"}
                </Badge>
              </div>
            </div>
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
  icon: Icon,
  color = "blue",
  trend,
  description,
  className,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "orange" | "purple" | "red" | "yellow" | "indigo" | "pink" | "teal";
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    indigo: "bg-indigo-100 text-indigo-600",
    pink: "bg-pink-100 text-pink-600",
    teal: "bg-teal-100 text-teal-600",
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? formatNumber(value) : value}
              </p>
              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className="flex items-center">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ml-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 快速统计组件
 */
export function QuickStats({ stats }: { stats: OverviewStats }) {
  const conversionRate = stats.totalVisitors > 0
    ? (stats.newRegistrations / stats.totalVisitors) * 100
    : 0;

  const engagementRate = 100 - stats.bounceRate;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">
          {formatNumber(stats.totalVisitors)}
        </div>
        <div className="text-sm text-gray-600">总访客</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {formatPercentage(conversionRate)}
        </div>
        <div className="text-sm text-gray-600">转化率</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-600">
          {formatPercentage(engagementRate)}
        </div>
        <div className="text-sm text-gray-600">参与度</div>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">
          {formatDuration(stats.avgSessionDuration)}
        </div>
        <div className="text-sm text-gray-600">会话时长</div>
      </div>
    </div>
  );
}

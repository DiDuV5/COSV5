/**
 * @fileoverview 监控图表组件
 * @description 专门显示各类监控数据的图表组件
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  MonitoringService,
  type MonitoringMetrics,
  type UserActivity,
  type ErrorStats,
} from '../services/monitoring-service';

/**
 * 监控图表属性接口
 */
export interface MonitoringChartsProps {
  metrics: MonitoringMetrics[];
  userActivity: UserActivity;
  errorStats: ErrorStats;
  isPending?: boolean;
  className?: string;
}

/**
 * 图表颜色配置
 */
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  success: '#22c55e',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#f97316', '#6b7280'];

/**
 * 监控图表组件
 */
export function MonitoringCharts({
  metrics,
  userActivity,
  errorStats,
  isPending = false,
  className,
}: MonitoringChartsProps) {
  if (isPending) {
    return <MonitoringChartsSkeleton />;
  }

  // 准备图表数据
  const chartData = metrics.map(metric => ({
    ...metric,
    time: MonitoringService.formatTime(metric.timestamp),
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 系统性能趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CPU & 内存使用率</CardTitle>
            <CardDescription>过去24小时的系统资源使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'cpu' ? 'CPU' : '内存'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={CHART_COLORS.danger} 
                  strokeWidth={2}
                  name="cpu"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={CHART_COLORS.warning} 
                  strokeWidth={2}
                  name="memory"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>响应时间 & 请求量</CardTitle>
            <CardDescription>API性能和流量监控</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'responseTime' ? `${value.toFixed(0)}ms` : `${value.toFixed(0)}`,
                    name === 'responseTime' ? '响应时间' : '请求数'
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="responseTime"
                  stackId="1"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.3}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="requests"
                  stackId="2"
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 用户活动和错误统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>热门页面访问</CardTitle>
            <CardDescription>用户最常访问的页面统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivity.topPages} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="page" type="category" width={80} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString()}`, '访问量']}
                />
                <Bar 
                  dataKey="views" 
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>错误类型分布</CardTitle>
            <CardDescription>系统错误的类型和占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={errorStats.byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {errorStats.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    '错误数量'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 网络和磁盘使用 */}
      <Card>
        <CardHeader>
          <CardTitle>网络 & 磁盘使用情况</CardTitle>
          <CardDescription>系统I/O性能监控</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'network' ? `${value.toFixed(1)} MB/s` : `${value.toFixed(1)}%`,
                  name === 'network' ? '网络流量' : '磁盘使用率'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="network" 
                stroke={CHART_COLORS.info} 
                strokeWidth={2}
                name="network"
              />
              <Line 
                type="monotone" 
                dataKey="disk" 
                stroke={CHART_COLORS.secondary} 
                strokeWidth={2}
                name="disk"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 错误趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>错误趋势</CardTitle>
          <CardDescription>系统错误数量变化趋势</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value}`, '错误数量']}
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke={CHART_COLORS.danger}
                fill={CHART_COLORS.danger}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 监控图表骨架组件
 */
export function MonitoringChartsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 系统性能趋势骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 用户活动和错误统计骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 其他图表骨架 */}
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] bg-gray-200 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

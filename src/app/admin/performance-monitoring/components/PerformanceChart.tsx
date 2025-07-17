/**
 * @fileoverview 性能图表组件
 * @description 可复用的性能数据可视化图表
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LucideIcon, Download, Maximize2 } from "lucide-react";

interface PerformanceChartProps {
  /** 图表标题 */
  title: string;
  /** 图表数据 */
  data: Array<Record<string, any>>;
  /** 图表类型 */
  type: 'line' | 'area' | 'bar';
  /** 数据键配置 */
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
    unit?: string;
  }>;
  /** X轴数据键 */
  xAxisKey: string;
  /** 图标 */
  icon?: LucideIcon;
  /** 图标颜色 */
  iconColor?: string;
  /** 徽章 */
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** 是否加载中 */
  isLoading?: boolean;
  /** 图表高度 */
  height?: number;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 是否可导出 */
  exportable?: boolean;
  /** 是否可全屏 */
  expandable?: boolean;
  /** 自定义格式化函数 */
  formatters?: {
    xAxis?: (value: any) => string;
    yAxis?: (value: any) => string;
    tooltip?: (value: any, name: string) => [string, string];
  };
  /** 点击事件 */
  onExport?: () => void;
  onExpand?: () => void;
}

const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F97316',
  teal: '#14B8A6',
  pink: '#EC4899',
};

export function PerformanceChart({
  title,
  data,
  type,
  dataKeys,
  xAxisKey,
  icon: Icon,
  iconColor = 'text-blue-600',
  badge,
  isLoading = false,
  height = 300,
  showLegend = true,
  showGrid = true,
  exportable = false,
  expandable = false,
  formatters,
  onExport,
  onExpand,
}: PerformanceChartProps) {
  if (isLoading) {
    return <PerformanceChartSkeleton height={height} />;
  }

  const defaultFormatters = {
    xAxis: (value: any) => {
      if (value instanceof Date || typeof value === 'string') {
        return new Date(value).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return String(value);
    },
    yAxis: (value: any) => String(value),
    tooltip: (value: any, name: string) => {
      const dataKey = dataKeys.find(key => key.name === name);
      const unit = dataKey?.unit || '';
      return [
        typeof value === 'number' ? `${value.toFixed(2)}${unit}` : String(value),
        name
      ] as [string, string];
    },
  };

  const finalFormatters = { ...defaultFormatters, ...formatters };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: xAxisKey,
      tickFormatter: finalFormatters.xAxis,
      fontSize: 12,
    };

    const yAxisProps = {
      tickFormatter: finalFormatters.yAxis,
      fontSize: 12,
    };

    const tooltipProps = {
      labelFormatter: (value: any) => `时间: ${finalFormatters.xAxis(value)}`,
      formatter: finalFormatters.tooltip,
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {dataKeys.map((dataKey, index) => (
              <Line
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                stroke={dataKey.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={dataKey.name}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {dataKeys.map((dataKey, index) => (
              <Area
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                stackId={index}
                stroke={dataKey.color}
                fill={dataKey.color}
                fillOpacity={0.6}
                name={dataKey.name}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {showLegend && <Legend />}
            {dataKeys.map((dataKey) => (
              <Bar
                key={dataKey.key}
                dataKey={dataKey.key}
                fill={dataKey.color}
                name={dataKey.name}
              />
            ))}
          </BarChart>
        );

      default:
        return <div>不支持的图表类型</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
            <span>{title}</span>
            {badge && (
              <Badge variant={badge.variant || 'outline'} className="ml-2">
                {badge.text}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {exportable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {expandable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExpand}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PerformanceChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// 预定义的常用图表组件
export function CachePerformanceChart({
  data,
  isLoading = false
}: {
  data: Array<{
    timestamp: string;
    hitRate: number;
    responseTime: number;
    penetrationPrevented: number;
  }>;
  isLoading?: boolean;
}) {
  return (
    <PerformanceChart
      title="缓存性能趋势"
      data={data}
      type="line"
      xAxisKey="timestamp"
      dataKeys={[
        { key: 'hitRate', name: '命中率', color: CHART_COLORS.primary, unit: '%' },
        { key: 'responseTime', name: '响应时间', color: CHART_COLORS.success, unit: 'ms' },
        { key: 'penetrationPrevented', name: '穿透防护', color: CHART_COLORS.warning, unit: '次' },
      ]}
      icon={require('lucide-react').Database}
      iconColor="text-blue-600"
      badge={{ text: 'P1级优化', variant: 'outline' }}
      isLoading={isLoading}
      height={300}
      exportable
      expandable
    />
  );
}

export function PermissionPerformanceChart({
  data,
  isLoading = false
}: {
  data: Array<{
    timestamp: string;
    checkTime: number;
    totalChecks: number;
    cacheHits: number;
  }>;
  isLoading?: boolean;
}) {
  return (
    <PerformanceChart
      title="权限性能趋势"
      data={data}
      type="area"
      xAxisKey="timestamp"
      dataKeys={[
        { key: 'checkTime', name: '检查时间', color: CHART_COLORS.orange, unit: 'ms' },
        { key: 'totalChecks', name: '总检查数', color: CHART_COLORS.purple, unit: '次' },
        { key: 'cacheHits', name: '缓存命中', color: CHART_COLORS.success, unit: '次' },
      ]}
      icon={require('lucide-react').Shield}
      iconColor="text-orange-600"
      badge={{ text: 'P1级优化', variant: 'outline' }}
      isLoading={isLoading}
      height={300}
      exportable
      expandable
    />
  );
}

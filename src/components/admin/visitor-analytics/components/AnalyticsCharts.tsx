/**
 * @fileoverview 访客分析图表组件
 * @description 显示各种访客分析图表
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Smartphone,
  Monitor,
  Globe,
  MapPin,
  TrendingUp,
} from "lucide-react";
import {
  type ChartData,
  type TrendDataPoint,
  formatNumber,
  formatPercentage
} from "../types/analytics-types";

interface AnalyticsChartsProps {
  visitorChartData: ChartData[];
  deviceChartData: ChartData[];
  browserChartData: ChartData[];
  locationChartData: ChartData[];
  trendData?: TrendDataPoint[] | null;
  className?: string;
}

/**
 * 访客分析图表组件
 */
export function AnalyticsCharts({
  visitorChartData,
  deviceChartData,
  browserChartData,
  locationChartData,
  trendData,
  className,
}: AnalyticsChartsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 访客类型分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              访客类型分布
            </CardTitle>
            <CardDescription>
              按用户等级分布的访客统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={visitorChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {visitorChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(value as number), '访客数']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 设备类型统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              设备类型统计
            </CardTitle>
            <CardDescription>
              访客使用的设备类型分布
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceChartData.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={device.percentage || 0}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 w-12">
                      {formatPercentage(device.percentage || 0)}
                    </span>
                    <span className="text-sm text-gray-500 w-8">
                      {formatNumber(device.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 浏览器和地理位置统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              浏览器统计
            </CardTitle>
            <CardDescription>
              访客使用的浏览器分布
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={browserChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [formatNumber(value as number), '访客数']} />
                <Bar dataKey="value" fill="#8884d8">
                  {browserChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              地理位置分布
            </CardTitle>
            <CardDescription>
              访客的地理位置统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {locationChartData.slice(0, 8).map((location, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: location.color }}
                    />
                    <span className="text-sm font-medium">{location.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={location.percentage || 0}
                      className="w-16"
                    />
                    <span className="text-sm text-gray-600 w-12">
                      {formatPercentage(location.percentage || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      {trendData && trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              访客趋势
            </CardTitle>
            <CardDescription>
              访客数量和页面浏览量的时间趋势
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    formatNumber(value as number),
                    name === 'visitors' ? '访客数' :
                    name === 'pageViews' ? '页面浏览' :
                    name === 'uniqueVisitors' ? '独立访客' : '注册数'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stackId="3"
                  stroke="#ffc658"
                  fill="#ffc658"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * 简化的饼图组件
 */
export function SimplePieChart({
  data,
  title,
  description,
  height = 200,
}: {
  data: ChartData[];
  title: string;
  description?: string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [formatNumber(value as number), '数量']} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * 简化的柱状图组件
 */
export function SimpleBarChart({
  data,
  title,
  description,
  height = 200,
  color = "#8884d8",
}: {
  data: ChartData[];
  title: string;
  description?: string;
  height?: number;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [formatNumber(value as number), '数量']} />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * 趋势线图组件
 */
export function TrendLineChart({
  data,
  title,
  description,
  height = 300,
}: {
  data: TrendDataPoint[];
  title: string;
  description?: string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                formatNumber(value as number),
                name === 'visitors' ? '访客数' : '页面浏览'
              ]}
            />
            <Line
              type="monotone"
              dataKey="visitors"
              stroke="#8884d8"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="pageViews"
              stroke="#82ca9d"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

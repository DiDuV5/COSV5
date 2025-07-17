/**
 * @fileoverview 交易分析组件
 * @description 显示交易数据分析图表和统计信息
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";

import { CHART_COLORS, TIME_RANGE_OPTIONS } from "../data/constants";
import { mockTrendData, mockTypeDistribution } from "../data/mock-data";
import type { TimeRange } from "../types";

interface TransactionAnalyticsProps {
  onExport?: (format: string) => void;
}

/**
 * 交易分析组件
 */
export function TransactionAnalytics({ onExport }: TransactionAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [chartType, setChartType] = useState<"line" | "area">("line");

  // 使用模拟数据（实际项目中应该从API获取）
  const trendData = mockTrendData;
  const typeDistribution = mockTypeDistribution;

  /**
   * 计算趋势统计
   */
  const getTrendStats = () => {
    const totalEarn = trendData.reduce((sum, item) => sum + item.earn, 0);
    const totalSpend = trendData.reduce((sum, item) => sum + item.spend, 0);
    const totalNet = totalEarn - totalSpend;
    const avgDaily = totalNet / trendData.length;

    return {
      totalEarn,
      totalSpend,
      totalNet,
      avgDaily,
    };
  };

  const stats = getTrendStats();

  /**
   * 自定义工具提示
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`日期: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  /**
   * 饼图自定义标签
   */
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span>交易数据分析</span>
            </CardTitle>

            <div className="flex items-center space-x-2">
              {/* 时间范围选择 */}
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 图表类型选择 */}
              <Select value={chartType} onValueChange={(value) => setChartType(value as "line" | "area")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">折线图</SelectItem>
                  <SelectItem value="area">面积图</SelectItem>
                </SelectContent>
              </Select>

              {/* 导出按钮 */}
              <Button variant="outline" size="sm" onClick={() => onExport?.('csv')}>
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>

              {/* 刷新按钮 */}
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">总收入</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {stats.totalEarn.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {timeRange === "7d" ? "近7天" : "近30天"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              <span className="text-sm font-medium">总支出</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-600">
                {stats.totalSpend.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {timeRange === "7d" ? "近7天" : "近30天"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">净流入</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${stats.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalNet >= 0 ? '+' : ''}{stats.totalNet.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                收入减支出
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">日均净值</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${stats.avgDaily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.avgDaily >= 0 ? '+' : ''}{Math.round(stats.avgDaily).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                每日平均
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span>交易趋势分析</span>
            <Badge variant="outline">{timeRange === '7d' ? '近7天' : '近30天'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="earn"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    name="收入"
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke={CHART_COLORS.danger}
                    strokeWidth={2}
                    name="支出"
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    name="净值"
                  />
                </LineChart>
              ) : (
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="earn"
                    stackId="1"
                    stroke={CHART_COLORS.secondary}
                    fill={CHART_COLORS.secondary}
                    fillOpacity={0.6}
                    name="收入"
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stackId="2"
                    stroke={CHART_COLORS.danger}
                    fill={CHART_COLORS.danger}
                    fillOpacity={0.6}
                    name="支出"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 交易类型分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5 text-purple-500" />
            <span>交易类型分布</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 饼图 */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 统计列表 */}
            <div className="space-y-3">
              {typeDistribution.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]
                      }}
                    />
                    <span className="font-medium">{item.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.count}</div>
                    <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

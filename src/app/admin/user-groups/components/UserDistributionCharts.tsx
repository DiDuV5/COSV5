/**
 * @fileoverview 用户分布图表组件
 * @description 显示用户分布的各种图表组件
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Activity, Eye } from "lucide-react";
import {
  type ChartDataPoint,
  type UserGroupStats,
  formatNumber,
  formatPercentage,
  getUserLevelLabel
} from "../types/user-groups-types";

interface UserDistributionChartsProps {
  chartData: ChartDataPoint[];
  groupStats: UserGroupStats[] | null;
  className?: string;
}

/**
 * 用户分布图表组件
 */
export function UserDistributionCharts({
  chartData,
  groupStats,
  className
}: UserDistributionChartsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 用户等级分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              用户等级分布
            </CardTitle>
            <CardDescription>各用户等级的用户数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(value as number), '用户数']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 用户等级柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              用户等级统计
            </CardTitle>
            <CardDescription>各等级用户数量对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [formatNumber(value as number), '用户数']} />
                <Bar dataKey="value" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计列表 */}
      {groupStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              详细统计
            </CardTitle>
            <CardDescription>各用户等级的详细数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupStats.map((stat, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stat.color }}
                      />
                      <h4 className="font-medium">{getUserLevelLabel(stat.userLevel)}</h4>
                      <Badge variant="outline">
                        {formatPercentage(stat.percentage)}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(stat.count)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">活跃用户</div>
                      <div className="font-medium">{formatNumber(stat.activeUsers)}</div>
                      <Progress
                        value={(stat.activeUsers / stat.count) * 100}
                        className="h-1 mt-1"
                      />
                    </div>

                    <div>
                      <div className="text-gray-600">新用户</div>
                      <div className="font-medium">{formatNumber(stat.newUsers)}</div>
                      <div className="text-xs text-gray-500">最近7天</div>
                    </div>

                    <div>
                      <div className="text-gray-600">发布数</div>
                      <div className="font-medium">{formatNumber(stat.totalPosts)}</div>
                      <div className="text-xs text-gray-500">
                        人均 {stat.count > 0 ? (stat.totalPosts / stat.count).toFixed(1) : 0}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600">会话时长</div>
                      <div className="font-medium">{Math.round(stat.avgSessionTime / 60)}m</div>
                      <div className="text-xs text-gray-500">平均</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
  data: ChartDataPoint[];
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
 * 用户增长趋势图
 */
export function UserGrowthChart({
  growthData,
  title = "用户增长趋势",
  height = 300,
}: {
  growthData: any[];
  title?: string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          用户注册数量的时间趋势
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                formatNumber(value as number),
                name === 'total' ? '总用户' : '新增用户'
              ]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="new"
              stackId="2"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * 用户活动热力图
 */
export function UserActivityHeatmap({
  activityData,
  title = "用户活动热力图",
}: {
  activityData: any[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          用户活动时间分布
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {activityData.map((day, index) => (
            <div key={index} className="space-y-1">
              <div className="text-xs text-center text-gray-600">
                {day.name}
              </div>
              {day.hours.map((hour: any, hourIndex: number) => (
                <div
                  key={hourIndex}
                  className="w-full h-3 rounded-sm"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${hour.intensity})`,
                  }}
                  title={`${day.name} ${hour.hour}:00 - ${hour.activity} 活动`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>活动较少</span>
          <div className="flex items-center gap-1">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                }}
              />
            ))}
          </div>
          <span>活动较多</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 用户参与度图表
 */
export function UserEngagementChart({
  engagementData,
  title = "用户参与度",
}: {
  engagementData: any[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          用户参与度指标对比
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                formatPercentage(value as number),
                name === 'engagement' ? '参与度' : '活跃度'
              ]}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#8884d8"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="activity"
              stroke="#82ca9d"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * @fileoverview 访客数据统计分析组件 (重构版)
 * @description 访客数据统计分析组件，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @props
 * - onUpdate: () => void - 更新回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - recharts
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Download,
  Calendar,
  Users,
  Activity,
  FileText,
  MapPin,
} from "lucide-react";

// 导入拆分的组件和Hook
import { OverviewCards } from "./visitor-analytics/components/OverviewCards";
import { AnalyticsCharts } from "./visitor-analytics/components/AnalyticsCharts";
import { useAnalyticsData, useRealTimeVisitors, useExportData } from "./visitor-analytics/hooks/use-analytics-data";

// 导入类型和函数
import {
  type VisitorAnalyticsProps,
  type TimeRange,
  type UserVisitorStats,
  TIME_RANGE_OPTIONS,
  getUserLevelLabel,
  getUserLevelColor,
  formatDateTime,
  formatDuration,
  isUserOnline,
} from "./visitor-analytics/types/analytics-types";

/**
 * 访客数据统计分析组件 (重构版)
 */
export function VisitorAnalytics({ onUpdate }: VisitorAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('week');

  // 使用数据获取Hook
  const {
    visitorStats,
    registrationStats,
    userVisitorStats,
    overviewStats,
    trendData,
    isPending,
    isError,
    error,
    visitorChartData,
    deviceChartData,
    browserChartData,
    locationChartData,
    refetch,
    setTimeRange,
  } = useAnalyticsData({
    timeRange: selectedTimeRange,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // 实时访客数据
  const { onlineUsers, onlineCount } = useRealTimeVisitors();

  // 导出功能
  const { isExporting, exportToCsv } = useExportData();

  /**
   * 处理时间范围变化
   */
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setTimeRange(range);
  };

  /**
   * 处理刷新
   */
  const handleRefresh = () => {
    refetch();
    onUpdate?.();
  };

  /**
   * 导出数据
   */
  const handleExport = async () => {
    if (userVisitorStats) {
      await exportToCsv(userVisitorStats, `visitor_analytics_${Date.now()}.csv`);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">访客分析</h2>
          <div className="flex items-center gap-2">
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <OverviewCards stats={null} isPending={true} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">访客分析</h2>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              数据加载失败: {error?.message || '未知错误'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">访客分析</h2>
          <p className="text-gray-600">实时监控平台访客数据和用户行为</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={(value: string) => handleTimeRangeChange(value as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? '导出中...' : '导出'}
          </Button>
        </div>
      </div>

      {/* 概览统计卡片 */}
      <OverviewCards stats={overviewStats} />

      {/* 实时在线用户 */}
      {onlineCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              实时在线用户
              <Badge variant="default" className="bg-green-500">
                {onlineCount} 人在线
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {onlineUsers?.slice(0, 10).map((user) => (
                <div key={user.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <UnifiedAvatar
                    user={{
                      username: user.username,
                      displayName: user.displayName,
                      avatarUrl: user.avatar,
                    }}
                    size="sm"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{user.displayName || user.username}</div>
                    <div className="text-gray-500">{getUserLevelLabel(user.userLevel)}</div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ))}
              {onlineCount > 10 && (
                <div className="flex items-center justify-center p-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                  +{onlineCount - 10} 更多
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细分析标签页 */}
      <Tabs defaultValue="visitors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visitors">
            <Users className="w-4 h-4 mr-2" />
            访客分析
          </TabsTrigger>
          <TabsTrigger value="pages">
            <FileText className="w-4 h-4 mr-2" />
            页面统计
          </TabsTrigger>
          <TabsTrigger value="registration">
            <Activity className="w-4 h-4 mr-2" />
            注册来源
          </TabsTrigger>
          <TabsTrigger value="users">
            <MapPin className="w-4 h-4 mr-2" />
            用户访客
          </TabsTrigger>
        </TabsList>

        {/* 访客分析页面 */}
        <TabsContent value="visitors" className="space-y-6">
          <AnalyticsCharts
            visitorChartData={visitorChartData}
            deviceChartData={deviceChartData}
            browserChartData={browserChartData}
            locationChartData={locationChartData}
            trendData={trendData}
          />
        </TabsContent>

        {/* 页面统计页面 */}
        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>页面访问统计</CardTitle>
              <CardDescription>
                各页面的访问量和用户行为数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                页面统计功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 注册来源页面 */}
        <TabsContent value="registration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>注册来源分析</CardTitle>
              <CardDescription>
                用户注册来源渠道统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registrationStats ? (
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    总注册数: {registrationStats.total}
                  </div>
                  <div className="space-y-2">
                    {registrationStats.sources?.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{source.source}</div>
                          <div className="text-sm text-gray-500">
                            {source._count.id} 人注册
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{source.percentage.toFixed(1)}%</div>
                          <div className={`text-sm ${source.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {source.growth >= 0 ? '+' : ''}{source.growth.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无注册来源数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户访客页面 */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户访客列表</CardTitle>
              <CardDescription>
                注册用户的访问记录和行为数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userVisitorStats && userVisitorStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>访问次数</TableHead>
                      <TableHead>最后访问</TableHead>
                      <TableHead>总时长</TableHead>
                      <TableHead>页面数</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userVisitorStats?.slice(0, 20).map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UnifiedAvatar
                              user={{
                                username: user.username,
                                displayName: user.displayName,
                                avatarUrl: user.avatar,
                              }}
                              size="sm"
                            />
                            <div>
                              <div className="font-medium">{user.displayName || user.username}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: getUserLevelColor(user.userLevel),
                              color: getUserLevelColor(user.userLevel)
                            }}
                          >
                            {getUserLevelLabel(user.userLevel)}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.visitCount}</TableCell>
                        <TableCell>{formatDateTime(user.lastVisit)}</TableCell>
                        <TableCell>{formatDuration(user.totalTimeSpent)}</TableCell>
                        <TableCell>{user.pagesViewed}</TableCell>
                        <TableCell>
                          <Badge variant={isUserOnline(user.lastVisit) ? "default" : "secondary"}>
                            {isUserOnline(user.lastVisit) ? '在线' : '离线'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无用户访客数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

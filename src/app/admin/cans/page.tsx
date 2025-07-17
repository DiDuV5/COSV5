/**
 * @fileoverview 罐头系统管理页面
 * @description 管理员用于管理罐头系统配置、查看统计数据和监控交易
 * @author Augment AI
 * @date 2024-12-01
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持罐头系统管理功能
 */

"use client";

// import { useState } from "react"; // 暂时未使用
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge"; // 暂时未使用
import { TabsList as _TabsList, TabsTrigger as _TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  Users,
  TrendingUp as _TrendingUp,
  Calendar,
  Settings,
  BarChart3,
  Activity,
  Target
} from "lucide-react";

function CansSystemStats() {
  const { data: stats, isPending } = api.cans.analytics.getSystemStats.useQuery();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.overview.totalAccounts}</div>
              <div className="text-sm text-muted-foreground">罐头账户总数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{stats.overview.totalCansInCirculation.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">罐头总量</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.overview.totalTransactions}</div>
              <div className="text-sm text-muted-foreground">交易记录总数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{stats.today.checkins}</div>
              <div className="text-sm text-muted-foreground">今日签到数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{stats.today.tasks}</div>
              <div className="text-sm text-muted-foreground">今日任务完成</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function _CansConfigManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-500" />
          <span>系统配置管理</span>
        </CardTitle>
        <CardDescription>
          管理不同用户等级的罐头系统配置
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">配置管理功能</h3>
          <p className="text-muted-foreground mb-4">
            此功能正在开发中，将支持动态调整各用户等级的奖励配置
          </p>
          <Button variant="outline" disabled>
            即将推出
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function _CansTransactionMonitor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-green-500" />
          <span>交易监控</span>
        </CardTitle>
        <CardDescription>
          实时监控罐头交易情况和异常检测
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">交易监控功能</h3>
          <p className="text-muted-foreground mb-4">
            此功能正在开发中，将提供实时交易监控和异常检测
          </p>
          <Button variant="outline" disabled>
            即将推出
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CansAdminPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">罐头系统管理</h1>
        <p className="text-muted-foreground mt-2">
          管理平台的罐头积分系统，包括配置管理、数据统计和交易监控
        </p>
      </div>

      {/* 系统统计 */}
      <CansSystemStats />

      {/* 管理功能导航 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <a href="/admin/cans/overview" className="block">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">系统概览</h3>
                  <p className="text-sm text-muted-foreground">实时数据统计和可视化分析</p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <a href="/admin/cans/config" className="block">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">配置管理</h3>
                  <p className="text-sm text-muted-foreground">用户等级配置和模板管理</p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <a href="/admin/cans/transactions" className="block">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">交易监控</h3>
                  <p className="text-sm text-muted-foreground">交易流水监控和异常检测</p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <span>快速操作</span>
          </CardTitle>
          <CardDescription>
            常用的罐头系统管理操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Users className="h-6 w-6 text-blue-500" />
              <span className="text-sm">用户排行榜</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <BarChart3 className="h-6 w-6 text-green-500" />
              <span className="text-sm">导出报告</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Settings className="h-6 w-6 text-orange-500" />
              <span className="text-sm">配置备份</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Target className="h-6 w-6 text-purple-500" />
              <span className="text-sm">重置限制</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

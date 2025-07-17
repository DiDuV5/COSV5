/**
 * @page CanTransactionsPage
 * @description 罐头系统交易监控页面
 * @author Augment AI
 * @date 2025-06-14
 * @version 2.0.0 - 重构为模块化结构
 *
 * @features
 * - 实时交易流水监控
 * - 交易数据分析和可视化
 * - 异常交易检测和预警
 * - 用户行为分析
 * - 数据导出和报告生成
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - Recharts
 * - Tailwind CSS
 *
 * @changelog
 * - 2025-06-14: 初始版本创建
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  AlertTriangle,
  FileText,
  RefreshCw,
  Download,
  Users,
  DollarSign,
  Flag,
} from "lucide-react";

// 导入子组件
import { RealTimeTransactions } from "./components/RealTimeTransactions";
import { TransactionAnalytics } from "./components/TransactionAnalytics";

// 导入Hook和工具
import { useTransactionMonitoring } from "./hooks/use-transaction-monitoring";
import { mockTransactionStats } from "./data/mock-data";
import { formatAmount } from "./utils";

export default function CanTransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const {
    // 状态
    monitoringState,
    searchFilters,
    realTimeConfig,

    // 数据
    transactions,
    transactionStats,
    isPending,
    error,

    // 操作函数
    updateSearchFilters,
    updateRealTimeConfig,
    refreshData,
    startMonitoring,
    stopMonitoring,
    exportData,

    // 实时监控
    isMonitoring,
    lastUpdate,
    connectionStatus,
  } = useTransactionMonitoring();

  // 使用模拟数据作为后备
  const stats = transactionStats || mockTransactionStats;

  /**
   * 处理交易点击
   */
  const handleTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction);
  };

  /**
   * 处理导出
   */
  const handleExport = async (format: string) => {
    try {
      await exportData(format as "csv" | "excel" | "pdf");
    } catch (error) {
      console.error("导出失败:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和控制面板 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-500" />
            罐头交易监控
          </h1>
          <p className="text-gray-600 mt-1">
            实时监控罐头系统交易流水，检测异常行为并生成分析报告
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* 连接状态指示器 */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected" ? "bg-green-500 animate-pulse" :
              connectionStatus === "reconnecting" ? "bg-yellow-500 animate-pulse" :
              "bg-red-500"
            }`} />
            <span className="text-sm text-muted-foreground">
              {connectionStatus === "connected" ? "已连接" :
               connectionStatus === "reconnecting" ? "重连中" :
               "已断开"}
            </span>
          </div>

          {/* 监控控制按钮 */}
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={isPending}
          >
            {isMonitoring ? "停止监控" : "开始监控"}
          </Button>

          {/* 刷新按钮 */}
          <Button variant="outline" onClick={refreshData} disabled={isPending}>
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </Button>

          {/* 导出按钮 */}
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">今日交易</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{stats.todayTransactions.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                +{stats.growthRate}% 较昨日
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">交易总额</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatAmount(stats.todayVolume, false)}</div>
              <div className="text-xs text-muted-foreground">
                平均 {formatAmount(stats.avgTransactionValue, false)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">活跃用户</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                总用户 {stats.totalUsers.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">异常交易</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-600">{stats.flaggedTransactions}</div>
              <div className="text-xs text-muted-foreground">
                需要关注
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容标签页 */}
      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            实时监控
            <Badge variant="secondary">{transactions.length}</Badge>
          </TabsTrigger>

          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            数据分析
          </TabsTrigger>

          <TabsTrigger value="anomaly" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            异常检测
            <Badge variant="destructive">{stats.flaggedTransactions}</Badge>
          </TabsTrigger>

          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            报告中心
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="mt-6">
          <RealTimeTransactions
            config={realTimeConfig}
            onTransactionClick={handleTransactionClick}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <TransactionAnalytics
            onExport={handleExport}
          />
        </TabsContent>

        <TabsContent value="anomaly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>异常检测</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                异常检测功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>报告中心</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                报告中心功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">错误</span>
            </div>
            <div className="mt-1 text-red-700">{error}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * @fileoverview 管理后台用户组管理页面 (重构版)
 * @description 用户组统计、批量操作、权限模板管理，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.0.0
 * - recharts: ^2.8.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Settings,
  Edit,
  RefreshCw,
  Shield,
  Image,
  Coins,
  Activity,
} from "lucide-react";

// 导入拆分的组件和Hook
import { UserStatsCards } from "./components/UserStatsCards";
import { UserDistributionCharts } from "./components/UserDistributionCharts";
import { BatchOperationDialog } from "./components/BatchOperationDialog";
import { useUserStats, useBatchOperations } from "./hooks/use-user-stats";

// 导入现有组件
import { GuestPermissionConfig } from "@/components/admin/GuestPermissionConfig";
import { BatchUserOperations } from "@/components/admin/BatchUserOperations";
import PermissionManagement from "@/components/admin/PermissionManagement";
import { MediaPermissionConfig } from "@/components/admin/MediaPermissionConfig";
import { VisitorAnalytics } from "@/components/admin/VisitorAnalytics";
import CansConfigManager from "@/components/admin/cans-config-manager";

// 导入类型
/**
 * 管理后台用户组管理页面 (重构版)
 */
export default function UserGroupsPage() {
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // 使用数据获取Hook
  const {
    groupStats,
    overview,
    chartData,
    isPending,
    isError,
    error,
    refresh,
  } = useUserStats({
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // 使用批量操作Hook
  const {
    isProcessing,
    selectedUserIds,
    updateUserLevel,
    updateUserStatus,
    deleteUsers,
    clearSelection,
  } = useBatchOperations();

  /**
   * 处理批量操作
   */
  const handleBatchOperation = (operation: any) => {
    switch (operation.operation) {
      case "updateLevel":
        updateUserLevel.mutate({
          userIds: selectedUserIds,
          userLevel: operation.targetLevel,
          reason: operation.reason,
        });
        break;
      case "updateStatus":
        updateUserStatus.mutate({
          userIds: selectedUserIds,
          isActive: operation.isActive,
        });
        break;
      case "delete":
        deleteUsers.mutate({
          userIds: selectedUserIds,
        });
        break;
    }
    setBatchDialogOpen(false);
  };

  /**
   * 处理刷新
   */
  const handleRefresh = () => {
    refresh();
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">用户组管理</h1>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <UserStatsCards overview={null} isPending={true} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">用户组管理</h1>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
        <div className="text-center text-red-500 py-8">
          数据加载失败: {error?.message || '未知错误'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户组管理</h1>
          <p className="text-gray-600">管理用户等级、权限配置和批量操作</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUserIds.length > 0 && (
            <Badge variant="outline" className="mr-2">
              已选择 {selectedUserIds.length} 个用户
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => setBatchDialogOpen(true)}
            disabled={selectedUserIds.length === 0}
          >
            <Edit className="w-4 h-4 mr-2" />
            批量操作
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <UserStatsCards overview={overview} />

      {/* 主要内容标签页 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">
            <Users className="w-4 h-4 mr-2" />
            统计概览
          </TabsTrigger>
          <TabsTrigger value="details">
            <Activity className="w-4 h-4 mr-2" />
            详细分析
          </TabsTrigger>
          <TabsTrigger value="visitors">
            <Users className="w-4 h-4 mr-2" />
            访客分析
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="w-4 h-4 mr-2" />
            权限管理
          </TabsTrigger>
          <TabsTrigger value="media-permissions">
            <Image className="w-4 h-4 mr-2" />
            媒体权限
          </TabsTrigger>
          <TabsTrigger value="cans">
            <Coins className="w-4 h-4 mr-2" />
            罐头配置
          </TabsTrigger>
          <TabsTrigger value="management">
            <Settings className="w-4 h-4 mr-2" />
            批量操作
          </TabsTrigger>
        </TabsList>

        {/* 统计概览页面 */}
        <TabsContent value="overview" className="space-y-6">
          <UserDistributionCharts
            chartData={chartData}
            groupStats={groupStats}
          />
        </TabsContent>

        {/* 详细分析页面 */}
        <TabsContent value="details" className="space-y-6">
          <UserDistributionCharts
            chartData={chartData}
            groupStats={groupStats}
          />
        </TabsContent>

        {/* 访客分析页面 */}
        <TabsContent value="visitors" className="space-y-6">
          <VisitorAnalytics onUpdate={handleRefresh} />
        </TabsContent>

        {/* 权限管理页面 */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GuestPermissionConfig />
            <PermissionManagement />
          </div>
        </TabsContent>

        {/* 媒体权限页面 */}
        <TabsContent value="media-permissions" className="space-y-6">
          <MediaPermissionConfig />
        </TabsContent>

        {/* 罐头配置页面 */}
        <TabsContent value="cans" className="space-y-6">
          <CansConfigManager />
        </TabsContent>

        {/* 批量操作页面 */}
        <TabsContent value="management" className="space-y-6">
          <BatchUserOperations selectedUsers={[]} />
        </TabsContent>
      </Tabs>

      {/* 批量操作对话框 */}
      <BatchOperationDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        selectedUserIds={selectedUserIds}
        onOperation={handleBatchOperation}
        isProcessing={isProcessing}
      />
    </div>
  );
}

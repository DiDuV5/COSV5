/**
 * @fileoverview 管理员评论管理页面
 * @description 提供评论审核、统计、配置等功能的综合管理界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 3.0.0 - 重构为模块化结构
 * @since 1.0.0
 *
 * @features
 * - 全局评论统计概览
 * - 最新、热门、点踩评论列表
 * - 评论审核管理（通过/拒绝/批量操作）
 * - 用户评论记录查询
 * - 反应系统配置管理
 * - 实时数据刷新
 *
 * @dependencies
 * - @trpc/react: ^10.45.0
 * - @tanstack/react-query: ^4.36.1
 * - date-fns: ^2.30.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 添加评论审核功能
 * - 2024-01-XX: 添加反应系统配置
 * - 2024-01-XX: 优化用户体验和错误处理
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { useAdminComments } from "./hooks/use-admin-comments";
import { StatisticsOverview } from "./components/StatisticsOverview";
import { CommentsList } from "./components/CommentsList";
import { UserCommentsRecord } from "./components/UserCommentsRecord";
import { ModerationPanel } from "./components/ModerationPanel";
import { ReactionConfigPanel } from "./components/ReactionConfigPanel";
import { validateConfigForm } from "./utils";

export default function AdminCommentsPage() {
  const {
    filters,
    setFilters,
    tabState,
    selectionState,
    configState,
    queries,
    mutations,
    actions,
  } = useAdminComments();

  const handleSaveConfig = () => {
    const validation = validateConfigForm(configState.configForm);
    if (!validation.isValid) {
      return;
    }

    mutations.updateConfigMutation.mutate(configState.configForm);
  };

  const handleResetConfig = () => {
    mutations.resetConfigMutation.mutate(undefined);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">评论管理</h1>
          <p className="text-gray-600 mt-1">
            管理和审核平台上的所有评论，配置反应系统参数
          </p>
        </div>
        <Button onClick={actions.handleRefreshAll} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新数据
        </Button>
      </div>

      {/* 主要内容区域 */}
      <Tabs value={tabState.activeTab} onValueChange={tabState.setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="lists">评论列表</TabsTrigger>
          <TabsTrigger value="moderation">审核管理</TabsTrigger>
          <TabsTrigger value="users">用户记录</TabsTrigger>
          <TabsTrigger value="config">系统配置</TabsTrigger>
        </TabsList>

        {/* 概览页面 */}
        <TabsContent value="overview" className="space-y-6">
          <StatisticsOverview
            globalStats={queries.globalStats.data}
            isLoadingStats={queries.globalStats.isPending}
            selectedUserLevel={filters.selectedUserLevel}
            onUserLevelChange={setFilters.setSelectedUserLevel}
            includeGuests={filters.includeGuests}
            onIncludeGuestsChange={setFilters.setIncludeGuests}
          />
        </TabsContent>

        {/* 评论列表页面 */}
        <TabsContent value="lists" className="space-y-6">
          <StatisticsOverview
            globalStats={queries.globalStats.data}
            isLoadingStats={queries.globalStats.isPending}
            selectedUserLevel={filters.selectedUserLevel}
            onUserLevelChange={setFilters.setSelectedUserLevel}
            includeGuests={filters.includeGuests}
            onIncludeGuestsChange={setFilters.setIncludeGuests}
          />
          <CommentsList
            latestComments={queries.latestComments.data}
            hotComments={queries.hotComments.data}
            dislikedComments={queries.dislikedComments.data}
            isLoadingLatest={queries.latestComments.isPending}
            isLoadingHot={queries.hotComments.isPending}
            isLoadingDisliked={queries.dislikedComments.isPending}
            onCommentAction={actions.handleCommentAction}
          />
        </TabsContent>

        {/* 审核管理页面 */}
        <TabsContent value="moderation" className="space-y-6">
          <ModerationPanel
            selectedStatus={filters.selectedStatus}
            onSelectedStatusChange={setFilters.setSelectedStatus}
            pendingCommentsData={queries.pendingCommentsData.data}
            isLoadingPending={queries.pendingCommentsData.isPending}
            selectedComments={selectionState.selectedComments}
            onCommentSelect={actions.handleCommentSelect}
            onSelectAll={actions.handleSelectAll}
            onBatchAction={actions.handleBatchAction}
            onCommentAction={actions.handleCommentAction}
            isBatchProcessing={mutations.batchModerateMutation.isPending}
          />
        </TabsContent>

        {/* 用户记录页面 */}
        <TabsContent value="users" className="space-y-6">
          <UserCommentsRecord
            userSearchQuery={filters.userSearchQuery}
            onUserSearchQueryChange={setFilters.setUserSearchQuery}
            onUserSearch={actions.handleUserSearch}
            userCommentsData={queries.userCommentsData.data}
            isLoadingUserComments={queries.userCommentsData.isPending}
          />
        </TabsContent>

        {/* 系统配置页面 */}
        <TabsContent value="config" className="space-y-6">
          <ReactionConfigPanel
            reactionConfig={queries.reactionConfig.data}
            isLoadingConfig={queries.reactionConfig.isPending}
            configForm={configState.configForm}
            onConfigFormChange={configState.setConfigForm}
            onSaveConfig={handleSaveConfig}
            onResetConfig={handleResetConfig}
            isSaving={mutations.updateConfigMutation.isPending}
            isResetting={mutations.resetConfigMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

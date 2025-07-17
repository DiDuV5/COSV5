/**
 * @page AdminTagsPage
 * @description 管理员标签管理页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0 - 重构为模块化结构
 *
 * @features
 * - 标签列表展示
 * - 标签搜索和筛选
 * - 标签合并、重命名、删除
 * - 批量操作
 * - 分页显示
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - Tailwind CSS
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// 导入子组件
import {
  StatisticsCards,
  SearchToolbar,
  BatchOperationBar,
  TagsTable,
  PaginationControls,
  MergeTagsDialog,
  RenameTagDialog,
  DeleteTagsDialog,
} from "./components";

// 导入Hook和类型
import { useTagManagement } from "./hooks/use-tag-management";

export default function AdminTagsPage() {
  const {
    // 状态
    filters,
    dialogs,
    selection,
    error,
    
    // 数据
    tagsData,
    statsData,
    isPending,
    
    // 操作函数
    setFilters,
    setDialogs,
    setSelection,
    actions,
    
    // Mutations
    mutations,
  } = useTagManagement();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">标签管理</h1>
          <p className="text-gray-600 mt-1">管理系统中的所有标签</p>
        </div>
        <Button
          variant="outline"
          onClick={actions.handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <StatisticsCards
        statsData={statsData}
        isPending={isPending}
      />

      {/* 搜索工具栏 */}
      <SearchToolbar
        searchQuery={filters.searchQuery}
        onSearchQueryChange={setFilters.setSearchQuery}
        statusFilter={filters.statusFilter}
        onStatusFilterChange={setFilters.setStatusFilter}
        sortBy={filters.sortBy}
        onSortByChange={setFilters.setSortBy}
        sortOrder={filters.sortOrder}
        onSortOrderChange={setFilters.setSortOrder}
      />

      {/* 批量操作栏 */}
      <BatchOperationBar
        selectedTags={selection.selectedTags}
        statusFilter={filters.statusFilter}
        onMergeTags={actions.handleMergeTags}
        onDeleteTags={actions.handleDeleteTags}
        onBatchRestore={actions.handleBatchRestore}
        onClearSelection={() => setSelection.setSelectedTags([])}
      />

      {/* 标签表格 */}
      <TagsTable
        tags={tagsData?.tags || []}
        selectedTags={selection.selectedTags}
        isPending={isPending}
        onSelectAll={actions.handleSelectAll}
        onSelectTag={actions.handleSelectTag}
        onRenameTag={actions.handleRenameTag}
        onMergeTags={actions.handleMergeTags}
        onDeleteTags={actions.handleDeleteTags}
        onRestoreTag={actions.handleRestoreTag}
        statusFilter={filters.statusFilter}
      />

      {/* 分页控制 */}
      <PaginationControls
        pagination={tagsData?.pagination}
        currentPage={filters.currentPage}
        onPageChange={setFilters.setCurrentPage}
      />

      {/* 合并标签对话框 */}
      <MergeTagsDialog
        open={dialogs.mergeDialogOpen}
        onOpenChange={setDialogs.setMergeDialogOpen}
        selectedTags={selection.selectedTags}
        targetTagName={dialogs.targetTagName}
        onTargetTagNameChange={setDialogs.setTargetTagName}
        operationReason={dialogs.operationReason}
        onOperationReasonChange={setDialogs.setOperationReason}
        onConfirm={actions.confirmMerge}
        isPending={mutations.mergeTagsMutation.isPending}
      />

      {/* 重命名标签对话框 */}
      <RenameTagDialog
        open={dialogs.renameDialogOpen}
        onOpenChange={setDialogs.setRenameDialogOpen}
        selectedTagForRename={dialogs.selectedTagForRename}
        newTagName={dialogs.newTagName}
        onNewTagNameChange={setDialogs.setNewTagName}
        operationReason={dialogs.operationReason}
        onOperationReasonChange={setDialogs.setOperationReason}
        onConfirm={actions.confirmRename}
        isPending={mutations.renameTagMutation.isPending}
      />

      {/* 删除标签对话框 */}
      <DeleteTagsDialog
        open={dialogs.deleteDialogOpen}
        onOpenChange={setDialogs.setDeleteDialogOpen}
        selectedTags={selection.selectedTags}
        softDelete={dialogs.softDelete}
        onSoftDeleteChange={setDialogs.setSoftDelete}
        operationReason={dialogs.operationReason}
        onOperationReasonChange={setDialogs.setOperationReason}
        onConfirm={actions.confirmDelete}
        isPending={mutations.deleteTagsMutation.isPending}
      />
    </div>
  );
}

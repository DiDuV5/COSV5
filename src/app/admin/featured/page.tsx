/**
 * @fileoverview 管理后台精选内容管理页面
 * @description 管理员可以添加、编辑、删除精选推荐内容
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 重构为模块化组件
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.45.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-22: 重构为模块化组件，拆分大文件
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";

// 导入子组件
import { FeaturedStatsCards } from "./components/FeaturedStatsCards";
import { FeaturedContentList } from "./components/FeaturedContentList";
import { AddFeaturedForm } from "./components/AddFeaturedForm";

// 导入Hook
import { useFeaturedManagement } from "./hooks/use-featured-management";

export default function FeaturedManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    featuredContents,
    availablePosts,
    filteredContents,
    isPending,
    searchQuery,
    setSearchQuery,
    handleDelete,
    handleToggleActive,
    refetch,
  } = useFeaturedManagement();

  if (isPending) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">精选内容管理</h1>
          <p className="text-muted-foreground mt-2">
            管理首页精选推荐内容，控制展示顺序和时间
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="搜索精选内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加精选内容
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>添加精选内容</DialogTitle>
                <DialogDescription>
                  选择要精选的内容并设置相关信息
                </DialogDescription>
              </DialogHeader>
              <AddFeaturedForm
                availablePosts={availablePosts}
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <FeaturedStatsCards featuredContents={featuredContents} />

      {/* 精选内容列表 */}
      <FeaturedContentList
        filteredContents={filteredContents as any}
        availablePosts={availablePosts}
        searchQuery={searchQuery}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        onRefetch={refetch}
      />
    </div>
  );
}



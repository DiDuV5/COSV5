/**
 * @fileoverview 精选内容列表组件
 * @description 显示精选内容列表和操作按钮
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { AddFeaturedForm } from "./AddFeaturedForm";
import { EditFeaturedForm } from "./EditFeaturedForm";
import { StatusBadge, ContentTypeBadge } from "./FeaturedBadges";
import { formatDate } from "../utils/featured-utils";

interface Post {
  id: string;
  title: string;
  author: {
    displayName: string | null;
    username: string;
  };
}

interface FeaturedItem {
  id: string;
  contentId: string | null;
  contentType: string;
  title: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  viewCount: number;
  clickCount: number;
  content?: {
    title: string;
  } | null;
}

interface FeaturedContentListProps {
  filteredContents: FeaturedItem[];
  availablePosts: Post[] | undefined;
  searchQuery: string;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onRefetch: () => void;
}

export function FeaturedContentList({
  filteredContents,
  availablePosts,
  searchQuery,
  onToggleActive,
  onDelete,
  onRefetch
}: FeaturedContentListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (filteredContents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>精选内容列表</CardTitle>
          <CardDescription>
            按位置排序显示，数字越小越靠前
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchQuery ? "没有找到匹配的精选内容" : "暂无精选内容"}
            </div>
            {!searchQuery && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    添加第一个精选内容
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
                      onRefetch();
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>精选内容列表</CardTitle>
        <CardDescription>
          按位置排序显示，数字越小越靠前
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredContents.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    #{item.position}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.title || '无标题'}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                    {item.content && (
                      <div className="text-xs text-muted-foreground mt-1">
                        关联内容: {item.content.title}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <ContentTypeBadge type={item.contentType} />
                    <StatusBadge item={item} />
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                  <span>开始: {formatDate(item.startDate)}</span>
                  <span>结束: {formatDate(item.endDate)}</span>
                  <span>浏览/点击: {item.viewCount}/{item.clickCount}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {/* 切换激活状态 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleActive(item.id, item.isActive)}
                  title={item.isActive ? "禁用" : "启用"}
                >
                  {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {/* 编辑 */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>编辑精选内容</DialogTitle>
                      <DialogDescription>
                        修改精选内容的信息和设置
                      </DialogDescription>
                    </DialogHeader>
                    <EditFeaturedForm
                      item={{
                        ...item,
                        coverImage: null,
                        reason: null
                      } as any}
                      availablePosts={availablePosts}
                      onSuccess={onRefetch}
                    />
                  </DialogContent>
                </Dialog>
                {/* 删除 */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除精选内容 &ldquo;{item.title || '无标题'}&rdquo; 吗？此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

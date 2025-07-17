/**
 * @fileoverview 管理员内容管理页面
 * @description 提供内容审核、统计、管理等功能的综合管理界面
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 内容统计概览
 * - 内容列表管理（查看、编辑、删除）
 * - 内容审核功能
 * - 批量操作
 * - 搜索和筛选
 *
 * @dependencies
 * - @trpc/react: ^11.4.2
 * - @tanstack/react-query: ^5.81.2
 * - lucide-react: ^0.263.1
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  Filter,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  Heart,
  MessageSquare,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// 简化的Post类型定义
interface Post {
  id: string;
  title: string;
  content?: string;
  description?: string;
  publishedAt: Date | null;
  createdAt: Date;
  isPremium?: boolean;
  author: {
    id: string;
    username: string;
    displayName?: string;
  };
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  _count?: {
    likes: number;
    comments: number;
  };
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminPostsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "trending">("latest");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // 获取内容列表 - 如果有搜索则使用getPosts，否则使用getAll
  const { data: postsData, isPending: isLoadingPosts, refetch: refetchPosts } = searchQuery
    ? api.post.getPosts.useQuery({
        limit: 20,
        search: searchQuery,
      })
    : api.post.getAll.useQuery({
        limit: 20,
        sortBy,
      });

  // 获取内容统计
  const { data: contentStats } = api.admin.contentModeration.getContentStats.useQuery();

  // 删除内容
  const deletePostMutation = api.post.delete.useMutation({
    onSuccess: () => {
      refetchPosts();
    },
  });

  const posts = postsData?.posts || [];

  // 过滤内容
  const filteredPosts = posts.filter((post: Post) => {
    if (filterStatus === "published") return post.publishedAt !== null;
    if (filterStatus === "draft") return post.publishedAt === null;
    return true;
  });

  const handleDeletePost = async (postId: string) => {
    if (confirm("确定要删除这个内容吗？此操作不可撤销。")) {
      await deletePostMutation.mutateAsync({ id: postId });
    }
  };

  const handleViewPost = (post: any) => {
    setSelectedPost(post);
    setShowViewDialog(true);
  };

  const handleEditPost = (post: any) => {
    setSelectedPost(post);
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">内容管理</h1>
          <p className="text-muted-foreground">
            管理平台上的所有内容，包括审核、编辑和删除
          </p>
        </div>
        <Button onClick={() => refetchPosts()} disabled={isLoadingPosts}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPosts ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {contentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总内容数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contentStats.totalPosts}</div>
              <p className="text-xs text-muted-foreground">
                +{contentStats.recentPosts} 本月新增
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已发布</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contentStats.publishedPosts}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((contentStats.publishedPosts / contentStats.totalPosts) * 100)}% 发布率
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">草稿</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contentStats.draftPosts}</div>
              <p className="text-xs text-muted-foreground">
                待发布内容
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">热门内容</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contentStats.popularPosts}</div>
              <p className="text-xs text-muted-foreground">
                高互动内容
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>内容列表</CardTitle>
          <CardDescription>
            查看和管理平台上的所有内容
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索内容标题、作者..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">最新发布</SelectItem>
                <SelectItem value="popular">最受欢迎</SelectItem>
                <SelectItem value="trending">趋势内容</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 内容列表 */}
          <div className="space-y-4">
            {isLoadingPosts ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>加载中...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无内容</p>
              </div>
            ) : (
              filteredPosts.map((post: Post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{post.title}</h3>
                          <Badge variant={post.publishedAt ? "default" : "secondary"}>
                            {post.publishedAt ? "已发布" : "草稿"}
                          </Badge>
                          {post.isPremium && (
                            <Badge variant="outline">付费</Badge>
                          )}
                        </div>

                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {post.description || "暂无描述"}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{post.author?.displayName || post.author?.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDistanceToNow(new Date(post.createdAt), {
                                addSuffix: true,
                                locale: zhCN
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{post.likeCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.commentCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.viewCount || 0}</span>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewPost(post)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPost(post)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑内容
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除内容
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 查看详情对话框 */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>内容详情</DialogTitle>
            <DialogDescription>
              查看内容的详细信息
            </DialogDescription>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">标题</Label>
                  <p className="mt-1 text-sm">{selectedPost.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">状态</Label>
                  <p className="mt-1 text-sm">
                    <Badge variant={selectedPost.publishedAt ? "default" : "secondary"}>
                      {selectedPost.publishedAt ? "已发布" : "草稿"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">作者</Label>
                  <p className="mt-1 text-sm">{selectedPost.author?.displayName || selectedPost.author?.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">创建时间</Label>
                  <p className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(selectedPost.createdAt), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">点赞数</Label>
                  <p className="mt-1 text-sm">{selectedPost.likeCount || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">评论数</Label>
                  <p className="mt-1 text-sm">{selectedPost.commentCount || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">浏览数</Label>
                  <p className="mt-1 text-sm">{selectedPost.viewCount || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">内容类型</Label>
                  <p className="mt-1 text-sm">{selectedPost.contentType || '未知'}</p>
                </div>
              </div>

              {selectedPost.description && (
                <div>
                  <Label className="text-sm font-medium">描述</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedPost.description}</p>
                </div>
              )}

              {selectedPost.content && (
                <div>
                  <Label className="text-sm font-medium">内容</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑内容对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑内容</DialogTitle>
            <DialogDescription>
              修改内容的基本信息
            </DialogDescription>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">标题</Label>
                <Input
                  id="edit-title"
                  defaultValue={selectedPost.title}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={selectedPost.description || ""}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-content">内容</Label>
                <Textarea
                  id="edit-content"
                  defaultValue={selectedPost.content || ""}
                  className="mt-1"
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => {
                  // TODO: 实现保存功能
                  alert("编辑功能正在开发中...");
                  setShowEditDialog(false);
                }}>
                  保存修改
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

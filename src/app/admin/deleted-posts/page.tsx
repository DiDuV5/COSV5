/**
 * @fileoverview 管理员已删除内容管理页面
 * @description 提供已删除内容的查看、恢复、永久删除等功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

"use client";

import React, { useState } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Search, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  FileText,
  MessageSquare,
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { RestorePostDialog } from '@/components/admin/RestorePostDialog';
import { PermanentDeleteDialog } from '@/components/admin/PermanentDeleteDialog';
import { useToast } from '@/hooks/use-toast';

export default function DeletedPostsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);

  // 获取已删除内容列表
  const { 
    data: deletedPostsData, 
    isLoading: isLoadingPosts, 
    refetch: refetchPosts 
  } = api.post.getDeletedPosts.useQuery({
    limit: 20,
    search: searchQuery || undefined,
  });

  // 获取删除统计
  const { data: deletedStats } = api.post.getDeletedStats.useQuery();

  const posts = deletedPostsData?.posts || [];

  const handleRestore = (post: any) => {
    setSelectedPost(post);
    setShowRestoreDialog(true);
  };

  const handlePermanentDelete = (post: any) => {
    setSelectedPost(post);
    setShowPermanentDeleteDialog(true);
  };

  const handleRestoreSuccess = () => {
    toast({
      title: '恢复成功',
      description: '内容已成功恢复',
    });
    refetchPosts();
  };

  const handlePermanentDeleteSuccess = () => {
    toast({
      title: '永久删除成功',
      description: '内容已永久删除',
    });
    refetchPosts();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">已删除内容管理</h1>
          <p className="text-muted-foreground">
            管理已软删除的内容，可以恢复或永久删除
          </p>
        </div>
        <Button onClick={() => refetchPosts()} disabled={isLoadingPosts}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPosts ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {deletedStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总删除数</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deletedStats.totalDeleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日删除</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deletedStats.deletedToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本周删除</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deletedStats.deletedThisWeek}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月删除</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deletedStats.deletedThisMonth}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索和筛选</CardTitle>
          <CardDescription>
            搜索已删除的内容
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索标题或内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 已删除内容列表 */}
      <Card>
        <CardHeader>
          <CardTitle>已删除内容列表</CardTitle>
          <CardDescription>
            共 {posts.length} 条已删除内容
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无已删除的内容</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{post.title}</h3>
                        <Badge variant={post.contentType === 'MOMENT' ? 'secondary' : 'default'}>
                          {post.contentType === 'MOMENT' ? '动态' : '作品'}
                        </Badge>
                        {post.publishedAt ? (
                          <Badge variant="outline">已发布</Badge>
                        ) : (
                          <Badge variant="secondary">草稿</Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            作者: {post.author.displayName || post.author.username}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            删除时间: {post.deletedAt ? formatDistanceToNow(new Date(post.deletedAt), { 
                              addSuffix: true, 
                              locale: zhCN 
                            }) : '未知'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {post.likeCount} 点赞
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {post.commentCount} 评论
                          </span>
                          {post.media && post.media.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {post.media.length} 媒体文件
                            </span>
                          )}
                        </div>

                        {post.deletionReason && (
                          <div className="flex items-start gap-1 mt-2 p-2 bg-yellow-50 rounded">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-yellow-800">
                              删除原因: {post.deletionReason}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(post)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        恢复
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePermanentDelete(post)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        永久删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 恢复确认对话框 */}
      <RestorePostDialog
        post={selectedPost}
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onSuccess={handleRestoreSuccess}
      />

      {/* 永久删除确认对话框 */}
      <PermanentDeleteDialog
        post={selectedPost}
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
        onSuccess={handlePermanentDeleteSuccess}
      />
    </div>
  );
}

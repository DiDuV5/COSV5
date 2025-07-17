/**
 * @component UserContentTabs
 * @description 用户内容标签页组件，展示用户的作品、点赞等内容
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - userId: string - 用户ID
 * - username: string - 用户名
 * - isOwnProfile: boolean - 是否为用户自己的主页
 *
 * @example
 * <UserContentTabs
 *   userId="user123"
 *   username="testuser"
 *   isOwnProfile={false}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Grid3X3,
  Heart,
  Bookmark,
  Image as ImageIcon,
  Video,
  FileText,
  Filter,
  Calendar,
  TrendingUp,
  Hash
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/trpc/react";
import { PostCard } from "@/components/post/post-card";

interface UserContentTabsProps {
  userId: string;
  username: string;
  isOwnProfile: boolean;
}

type ContentFilter = "all" | "images" | "videos" | "text";
type SortOrder = "latest" | "popular" | "oldest";

export function UserContentTabs({ userId, username, isOwnProfile }: UserContentTabsProps) {
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  // 获取用户发布的动态
  const {
    data: momentsData,
    isPending: momentsLoading,
    fetchNextPage: fetchNextMoments,
    hasNextPage: hasNextMoments,
    isFetchingNextPage: isFetchingNextMoments,
  } = api.post.getUserPosts.useInfiniteQuery(
    {
      userId,
      contentType: "MOMENT",
      filter: contentFilter,
      sort: sortOrder,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 获取用户发布的作品
  const {
    data: postsData,
    isPending: postsLoading,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetchingNextPage: isFetchingNextPosts,
  } = api.post.getUserPosts.useInfiniteQuery(
    {
      userId,
      contentType: "POST",
      filter: contentFilter,
      sort: sortOrder,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 获取用户发布的媒体内容
  const {
    data: mediaData,
    isPending: mediaLoading,
    fetchNextPage: fetchNextMedia,
    hasNextPage: hasNextMedia,
    isFetchingNextPage: isFetchingNextMedia,
  } = api.post.getUserPosts.useInfiniteQuery(
    {
      userId,
      contentType: "all",
      filter: contentFilter === "all" ? "images" : contentFilter, // 默认显示图片
      sort: sortOrder,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 获取用户点赞的内容（仅本人可见）
  const {
    data: likedPostsData,
    isPending: likedPostsLoading,
    fetchNextPage: fetchNextLikedPosts,
    hasNextPage: hasNextLikedPosts,
    isFetchingNextPage: isFetchingNextLikedPosts,
  } = api.post.getUserLikedPosts.useInfiniteQuery(
    {
      userId,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: isOwnProfile, // 只有本人可以查看点赞的内容
    }
  );

  const moments = momentsData?.pages.flatMap((page) => page.posts) ?? [];
  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const mediaItems = mediaData?.pages.flatMap((page) => page.posts) ?? [];
  const likedPosts = likedPostsData?.pages.flatMap((page) => page.posts) ?? [];

  const getFilterIcon = (filter: ContentFilter) => {
    switch (filter) {
      case "images":
        return <ImageIcon className="h-4 w-4" />;
      case "videos":
        return <Video className="h-4 w-4" />;
      case "text":
        return <FileText className="h-4 w-4" />;
      default:
        return <Grid3X3 className="h-4 w-4" />;
    }
  };

  const getSortIcon = (sort: SortOrder) => {
    switch (sort) {
      case "popular":
        return <TrendingUp className="h-4 w-4" />;
      case "oldest":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const renderPostGrid = (postList: any[], loading: boolean, onLoadMore?: () => void, hasMore?: boolean, isLoadingMore?: boolean) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (postList.length === 0) {
      return (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">暂无内容</p>
          {isOwnProfile && (
            <Link href="/create">
              <Button className="mt-4">
                发布第一个作品
              </Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {postList.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "加载中..." : "加载更多"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            用户内容
          </CardTitle>

          {/* 筛选和排序控件 */}
          <div className="flex items-center gap-2">
            <Select value={contentFilter} onValueChange={(value) => setContentFilter(value as ContentFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    全部
                  </div>
                </SelectItem>
                <SelectItem value="images">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    图片
                  </div>
                </SelectItem>
                <SelectItem value="videos">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    视频
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    文字
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    最新
                  </div>
                </SelectItem>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    最热
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    最早
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 内容统计 */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Grid3X3 className="h-4 w-4" />
            <span>{posts.length} 个作品</span>
          </div>
          {contentFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {getFilterIcon(contentFilter)}
              {contentFilter === "images" && "图片"}
              {contentFilter === "videos" && "视频"}
              {contentFilter === "text" && "文字"}
            </Badge>
          )}
          {sortOrder !== "latest" && (
            <Badge variant="outline" className="flex items-center gap-1">
              {getSortIcon(sortOrder)}
              {sortOrder === "popular" && "按热度"}
              {sortOrder === "oldest" && "按时间"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="moments" className="w-full">
          <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="moments" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              动态
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              作品
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              媒体
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="liked" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                点赞
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="moments" className="mt-6">
            {renderPostGrid(
              moments,
              momentsLoading,
              fetchNextMoments,
              hasNextMoments,
              isFetchingNextMoments
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            {renderPostGrid(
              posts,
              postsLoading,
              fetchNextPosts,
              hasNextPosts,
              isFetchingNextPosts
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            {renderPostGrid(
              mediaItems,
              mediaLoading,
              fetchNextMedia,
              hasNextMedia,
              isFetchingNextMedia
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="liked" className="mt-6">
              {renderPostGrid(
                likedPosts,
                likedPostsLoading,
                fetchNextLikedPosts,
                hasNextLikedPosts,
                isFetchingNextLikedPosts
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * @fileoverview 近期发布组件
 * @description 支持无限滚动的近期发布内容展示，PC端4列，手机端2列
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: v2.0.0 - 添加无限滚动支持，移除8格限制
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, Heart, MessageCircle, User, Calendar, Loader2, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { useBestMediaUrl, useVideoThumbnailUrl } from "@/lib/media/cdn-url-fixer";

interface RecentPostsSectionProps {
  className?: string;
}

// 媒体封面组件，使用URL转换hook
function PostCoverMedia({ media, title }: {
  media: {
    url: string;
    cdnUrl?: string | null;
    thumbnailUrl?: string | null;
    mediaType: string;
  };
  title: string;
}) {
  // 获取最佳媒体URL - 视频使用缩略图用于预览
  const videoThumbnailUrl = useVideoThumbnailUrl({...media, mediaType: media.mediaType});
  const bestMediaUrl = useBestMediaUrl({...media, mediaType: media.mediaType});
  const displayUrl = media.mediaType === 'VIDEO' ? videoThumbnailUrl : bestMediaUrl;

  if (media.mediaType === 'VIDEO') {
    // 视频：使用缩略图URL
    return displayUrl ? (
      <Image
        src={displayUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Play className="h-8 w-8 mx-auto mb-2" />
          <span className="text-xs">视频内容</span>
        </div>
      </div>
    );
  } else {
    // 图片：使用转换后的URL
    return (
      <Image
        src={displayUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    );
  }
}

export function RecentPostsSection({ className }: RecentPostsSectionProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 使用无限查询获取近期发布的内容
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
  } = api.recommendation.getRecent.useInfiniteQuery(
    {
      limit: 12, // 每页12个内容，PC端3行4列，手机端6行2列
      contentType: "POST", // 只获取作品，不包括动态
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 合并所有页面的数据
  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  // 无限滚动逻辑
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 监听滚动到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore]);

  // 渲染标题组件
  const renderTitle = () => {
    // 计算今天发布的内容数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPosts = allPosts.filter(post => {
      const postDate = new Date(post.createdAt);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === today.getTime();
    });
    const todayCount = todayPosts.length;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">近期发布</h2>
          <Badge variant="secondary" className="text-xs">
            {todayCount > 0 ? `今日 ${todayCount}` : "最新"}
          </Badge>
        </div>

        <Link
          href="/explore"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          查看更多 →
        </Link>
      </div>
    );
  };

  if (isPending) {
    return (
      <div id="recent-posts-section" className={cn("space-y-4", className)}>
        {renderTitle()}

        {/* PC端：4列，手机端：2列 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-square bg-muted"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="flex space-x-2">
                    <div className="h-5 bg-muted rounded w-12"></div>
                    <div className="h-5 bg-muted rounded w-12"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data || allPosts.length === 0) {
    return (
      <div id="recent-posts-section" className={cn("space-y-4", className)}>
        {renderTitle()}

        <Card className="h-64">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {isError ? "加载失败" : "暂无近期内容"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isError ? "请稍后再试" : "还没有用户发布内容，快来成为第一个吧！"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="recent-posts-section" className={cn("space-y-4", className)}>
      {renderTitle()}

      {/* 无限滚动网格：PC端4列，手机端2列 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {allPosts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer h-full">
              <CardContent className="p-0">
                {/* 封面图片 */}
                <div className="relative aspect-square overflow-hidden">
                  {post.media && post.media.length > 0 ? (
                    <PostCoverMedia media={post.media[0]} title={post.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <User className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-xs">暂无图片</span>
                      </div>
                    </div>
                  )}

                  {/* 内容类型标签 */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 backdrop-blur-sm text-xs"
                    >
                      作品
                    </Badge>
                  </div>

                  {/* 多图标识 */}
                  {post.media && post.media.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-sm text-white text-xs"
                      >
                        +{post.media.length - 1}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 内容信息 */}
                <div className="p-3 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  {/* 作者信息 */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-16">
                        {post.author.displayName || post.author.username}
                      </span>
                    </div>
                    {post.author.isVerified && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{post._count.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post._count.comments}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 无限滚动加载更多 */}
      <div ref={loadMoreRef} className="flex justify-center py-8">
        {isFetchingNextPage ? (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">加载更多内容...</span>
          </div>
        ) : hasNextPage ? (
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="text-sm"
          >
            点击加载更多
          </Button>
        ) : allPosts.length > 0 ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              已显示全部 {allPosts.length} 个近期内容
            </p>
            <Link href="/explore">
              <Button variant="outline" className="text-sm">
                浏览更多内容
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

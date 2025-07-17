/**
 * @fileoverview 标签页面
 * @description 展示特定标签下的所有内容
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - tRPC
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ArrowLeft,
  Filter,
  Grid,
  List,
  TrendingUp,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedTagList } from '@/components/ui/enhanced-tag-list';
import { api } from '@/trpc/react';

// 类型定义
interface PageData {
  posts: any[];
  nextCursor?: string;
}

interface Tag {
  name: string;
  count?: number;
}

interface Post {
  id: string;
  title: string;
  tags: string;
  media?: any[];
  [key: string]: any;
}

export default function TagPage() {
  const params = useParams();
  const router = useRouter();
  const tagName = decodeURIComponent(params?.tag as string);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');

  // 获取标签下的帖子
  const {
    data: postsData,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.post.getByTag.useInfiniteQuery(
    {
      tag: tagName,
      limit: 12,
      sortBy,
    },
    {
      getNextPageParam: (lastPage: PageData) => lastPage.nextCursor,
      enabled: !!tagName,
    }
  );

  // 获取相关标签
  const {
    data: relatedTags,
    isPending: relatedTagsLoading,
    error: relatedTagsError
  } = api.tag.getRelated.useQuery(
    { tag: tagName, limit: 20 },
    {
      enabled: !!tagName,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      gcTime: 10 * 60 * 1000, // 10分钟缓存
    }
  );

  // 获取标签统计
  const { data: tagStats } = api.tag.getStats.useQuery(
    { tag: tagName },
    { enabled: !!tagName }
  );

  const posts = postsData?.pages.flatMap((page: PageData) => page.posts) ?? [];

  // 格式化时间
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // 解析标签
  const parseTags = (tagsJson: string | null) => {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson) as string[];
    } catch {
      return [];
    }
  };

  if (isPending) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <div className="aspect-[4/3] bg-gray-200 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {/* 标签信息 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Hash className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              #{tagName}
            </h1>
            {tagStats && (
              <p className="text-gray-600 mt-1">
                {(tagStats as any).postCount || tagStats.count || 0} 个作品 • {(tagStats as any).totalViews || tagStats.views || 0} 次浏览
              </p>
            )}
          </div>
        </div>

        {/* 标签描述 */}
        {(tagStats as any)?.description && (
          <p className="text-gray-700 mb-4">
            {(tagStats as any).description}
          </p>
        )}

        {/* 相关标签 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">相关标签</h3>
          {relatedTagsLoading ? (
            <div className="flex gap-2">
              {/* 加载状态骨架屏 */}
              <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-18 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ) : relatedTagsError ? (
            <div className="text-sm text-red-500">
              加载相关标签失败，请稍后重试
            </div>
          ) : relatedTags && relatedTags.length > 0 ? (
            <EnhancedTagList
              tags={relatedTags.map((tag: Tag) => ({ name: tag.name }))}
              maxTags={10}
              size="sm"
              showCount={true}
              className="gap-2"
            />
          ) : (
            <div className="text-sm text-gray-500">
              暂无相关标签
            </div>
          )}
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            共 {posts.length} 个作品
          </span>
          {tagStats && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>热度: {(tagStats as any).heatScore || 0}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* 排序选择 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            aria-label="排序方式"
            title="选择排序方式"
          >
            <option value="latest">最新发布</option>
            <option value="popular">最受欢迎</option>
            <option value="trending">热门趋势</option>
          </select>
        </div>
      </div>

      {/* 内容列表 */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Hash className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              暂无相关内容
            </h3>
            <p className="text-gray-600 mb-4">
              还没有使用 #{tagName} 标签的内容
            </p>
            <Link href="/create">
              <Button>发布内容</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={`grid gap-6 ${
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}>
            {posts.map((post: Post) => {
              const tags = parseTags(post.tags);
              const firstMedia = post.media?.[0];

              return (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* 媒体预览 */}
                  {firstMedia && (
                    <div className="aspect-[4/3] relative bg-gray-100">
                      {firstMedia.mediaType === 'VIDEO' ? (
                        <video
                          src={firstMedia.url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={firstMedia.thumbnailUrl || firstMedia.url}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      )}

                      {/* 媒体数量标识 */}
                      {post.media && post.media.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          +{post.media.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  <CardContent className="p-4">
                    {/* 标题和描述 */}
                    <div className="mb-3">
                      <Link href={`/posts/${post.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                      </Link>
                      {post.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {post.description}
                        </p>
                      )}
                    </div>

                    {/* 标签 */}
                    {tags.length > 0 && (
                      <div className="mb-3">
                        <EnhancedTagList
                          tags={tags.slice(0, 4).map(tag => ({ name: tag }))}
                          maxTags={4}
                          size="sm"
                          showCount={true}
                          className="gap-1"
                        />
                      </div>
                    )}

                    {/* 作者信息 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-500">
                          {post.author.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {post.author.displayName || post.author.username}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                    </div>

                    {/* 互动统计 */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.viewCount || 0}</span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 加载更多 */}
          {hasNextPage && (
            <div className="text-center mt-8">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

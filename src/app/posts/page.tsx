/**
 * @fileoverview 内容浏览页面（重构版）
 * @description 采用模块化架构的帖子浏览页面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/trpc/react';

// 导入重构后的模块
import {
  PostsDataService,
  PostCard,
  PostCardSkeleton,
  PostsFilter,
  PostsStats,
  type Post,
  type LikeState,
  type SortOption,
  type ViewMode,
} from './index';

/**
 * 内容浏览页面（重构版）
 */
export default function PostsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [likeStates, setLikeStates] = useState<Record<string, LikeState>>({});

  // API查询
  const {
    data: postsData,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.post.getInfinite.useInfiniteQuery(
    {
      limit: 12,
      sortBy,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 获取点赞状态
  const allPosts = useMemo(() => {
    if (!postsData) return [];
    return postsData.pages.flatMap(page => page.posts);
  }, [postsData]);

  const postIds = useMemo(() => allPosts.map(post => post.id), [allPosts]);

  const { data: likeStatusData } = api.post.getLikeStatus.useQuery(
    { postIds },
    { 
      enabled: postIds.length > 0 && !!session,
      refetchOnWindowFocus: false,
    }
  );

  // API工具
  const utils = api.useUtils();

  // 点赞mutation
  const likeMutation = api.post.like.useMutation({
    onMutate: async ({ postId }) => {
      await utils.post.getInfinite.cancel();
      
      const currentPost = allPosts.find(p => p.id === postId);
      const currentDisplayCount = likeStates[postId]?.count ?? currentPost?._count?.likes ?? 0;
      
      setLikeStates(prev => PostsDataService.updateLikeState(prev, postId, true, currentDisplayCount));
      
      return { previousState: likeStates[postId], currentDisplayCount };
    },
    onSuccess: (data, { postId }) => {
      toast({
        title: data.message || '点赞成功',
        duration: 2000,
      });
      utils.post.getInfinite.invalidate();
      utils.post.getLikeStatus.invalidate({ postIds: [postId] });
    },
    onError: (error, { postId }, context) => {
      if (context?.previousState) {
        setLikeStates(prev => ({ ...prev, [postId]: context.previousState }));
      }
      toast({
        title: '点赞失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 取消点赞mutation
  const unlikeMutation = api.post.unlike.useMutation({
    onMutate: async ({ postId }) => {
      await utils.post.getInfinite.cancel();
      
      const currentPost = allPosts.find(p => p.id === postId);
      const currentDisplayCount = likeStates[postId]?.count ?? currentPost?._count?.likes ?? 0;
      
      setLikeStates(prev => PostsDataService.updateLikeState(prev, postId, false, currentDisplayCount));
      
      return { previousState: likeStates[postId], currentDisplayCount };
    },
    onSuccess: (data, { postId }) => {
      toast({
        title: data.message || '取消点赞',
        duration: 2000,
      });
      utils.post.getInfinite.invalidate();
      utils.post.getLikeStatus.invalidate({ postIds: [postId] });
    },
    onError: (error, { postId }, context) => {
      if (context?.previousState) {
        setLikeStates(prev => ({ ...prev, [postId]: context.previousState }));
      }
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 初始化点赞状态
  useEffect(() => {
    if (likeStatusData && Array.isArray(likeStatusData)) {
      const newLikeStates: Record<string, LikeState> = {};
      likeStatusData.forEach((status: any) => {
        const post = allPosts.find(p => p.id === status.postId);
        if (post) {
          newLikeStates[status.postId] = {
            isLiked: status.isLiked,
            count: post._count?.likes ?? 0,
          };
        }
      });
      setLikeStates(newLikeStates);
    }
  }, [likeStatusData, allPosts]);

  // 处理数据
  const formattedPosts = useMemo(() => {
    return allPosts.map(post => PostsDataService.formatPost(post));
  }, [allPosts]);

  const filteredAndSortedPosts = useMemo(() => {
    const filtered = PostsDataService.filterPosts(formattedPosts, {
      searchQuery,
      selectedTags,
    });
    return PostsDataService.sortPosts(filtered, sortBy);
  }, [formattedPosts, searchQuery, selectedTags, sortBy]);

  const postsWithLikeStates = useMemo(() => {
    return PostsDataService.mergeLikeStates(filteredAndSortedPosts, likeStates);
  }, [filteredAndSortedPosts, likeStates]);

  const stats = useMemo(() => {
    return PostsDataService.getPostStats(formattedPosts);
  }, [formattedPosts]);

  /**
   * 处理点赞
   */
  const handleLike = (postId: string, isLiked: boolean) => {
    if (!session) {
      toast({
        title: '请先登录',
        description: '登录后即可点赞内容',
        variant: 'destructive',
      });
      router.push('/auth/signin');
      return;
    }

    const post = formattedPosts.find(p => p.id === postId);
    if (!post) return;

    const canLike = PostsDataService.canLikePost(post, session.user.id);
    if (!canLike.canLike) {
      toast({
        title: '无法点赞',
        description: canLike.reason,
        variant: 'destructive',
      });
      return;
    }

    if (isLiked) {
      likeMutation.mutate({ postId });
    } else {
      unlikeMutation.mutate({ postId });
    }
  };

  /**
   * 处理分享
   */
  const handleShare = (post: Post) => {
    const url = `${window.location.origin}${PostsDataService.generatePostUrl(post.id)}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt || post.title,
        url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: '链接已复制',
          description: '分享链接已复制到剪贴板',
        });
      }).catch(() => {
        toast({
          title: '复制失败',
          description: '请手动复制链接',
          variant: 'destructive',
        });
      });
    }
  };

  /**
   * 处理作者点击
   */
  const handleAuthorClick = (authorId: string) => {
    router.push(PostsDataService.generateAuthorUrl(authorId));
  };

  /**
   * 清除过滤器
   */
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  // 加载状态
  if (isPending) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        
        <div className="mb-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <PostCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-red-500 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              加载失败
            </h3>
            <p className="text-gray-600 mb-4">
              {error.message || '无法加载内容，请稍后重试'}
            </p>
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">浏览内容</h1>
            <p className="text-gray-600 mt-2">
              发现精彩的 cosplay 作品和创作分享
            </p>
          </div>
          
          <Link href="/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              发布内容
            </Button>
          </Link>
        </div>

        {/* 统计信息 */}
        <PostsStats {...stats} className="mb-4" />
      </div>

      {/* 过滤器 */}
      <PostsFilter
        sortBy={sortBy}
        viewMode={viewMode}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        totalCount={formattedPosts.length}
        filteredCount={postsWithLikeStates.length}
        onSortChange={setSortBy}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onTagsChange={setSelectedTags}
        onClearFilters={handleClearFilters}
        className="mb-6"
      />

      {/* 内容列表 */}
      {postsWithLikeStates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {formattedPosts.length === 0 ? '暂无内容' : '没有找到匹配的内容'}
            </h3>
            <p className="text-gray-600 mb-4">
              {formattedPosts.length === 0 
                ? '还没有发布的内容，成为第一个分享者吧！'
                : '尝试调整搜索条件或清除过滤器'
              }
            </p>
            {formattedPosts.length === 0 ? (
              <Link href="/create">
                <Button>发布内容</Button>
              </Link>
            ) : (
              <Button onClick={handleClearFilters}>
                清除过滤器
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {postsWithLikeStates.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                likeState={likeStates[post.id]}
                viewMode={viewMode}
                onLike={handleLike}
                onShare={handleShare}
                onAuthorClick={handleAuthorClick}
              />
            ))}
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

/**
 * 导出类型
 */
export type {
  Post,
  LikeState,
  SortOption,
  ViewMode,
} from './index';

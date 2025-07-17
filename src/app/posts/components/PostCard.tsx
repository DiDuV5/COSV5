/**
 * @fileoverview 帖子卡片组件
 * @description 专门处理单个帖子的显示和交互
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Eye, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EnhancedTagList } from '@/components/ui/enhanced-tag-list';
import { TagDisplayUtils, toEnhancedTagListFormat } from '@/lib/utils/tag-utils';
import { PostsDataService, type Post, type LikeState } from '../services/posts-data-service';

/**
 * 帖子卡片属性接口
 */
export interface PostCardProps {
  post: Post;
  likeState?: LikeState;
  viewMode?: 'grid' | 'list';
  showAuthor?: boolean;
  showStats?: boolean;
  showTags?: boolean;
  className?: string;
  onLike?: (postId: string, isLiked: boolean) => void;
  onShare?: (post: Post) => void;
  onAuthorClick?: (authorId: string) => void;
}

/**
 * 帖子卡片组件
 */
export function PostCard({
  post,
  likeState,
  viewMode = 'grid',
  showAuthor = true,
  showStats = true,
  showTags = true,
  className,
  onLike,
  onShare,
  onAuthorClick,
}: PostCardProps) {
  const isLiked = likeState?.isLiked ?? false;
  const likeCount = likeState?.count ?? post._count.likes;

  /**
   * 处理点赞
   */
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(post.id, !isLiked);
  };

  /**
   * 处理分享
   */
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(post);
  };

  /**
   * 处理作者点击
   */
  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAuthorClick?.(post.author.id);
  };

  /**
   * 渲染网格视图
   */
  const renderGridView = () => (
    <Card className={cn('group hover:shadow-lg transition-all duration-200', className)}>
      <Link href={PostsDataService.generatePostUrl(post.id)}>
        {/* 封面图片 */}
        {post.coverImage && (
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}

        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-lg group-hover:text-blue-600 transition-colors">
            {post.title}
          </CardTitle>
          {post.excerpt && (
            <CardDescription className="line-clamp-3 text-sm">
              {post.excerpt}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 作者信息 */}
          {showAuthor && (
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6 cursor-pointer" onClick={handleAuthorClick}>
                <AvatarImage src={post.author.avatar} alt={post.author.username} />
                <AvatarFallback className="text-xs">
                  {post.author.displayName?.slice(0, 2) || post.author.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span
                className="text-sm text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                onClick={handleAuthorClick}
              >
                {post.author.displayName || post.author.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {PostsDataService.formatTimeAgo(post.createdAt)}
              </span>
            </div>
          )}

          {/* 标签 */}
          {showTags && TagDisplayUtils.hasMoreTags(post.tags, 0) && (
            <div className="flex flex-wrap gap-1">
              <EnhancedTagList
                tags={toEnhancedTagListFormat(TagDisplayUtils.getDisplayTags(post.tags, 3))}
                size="sm"
                variant="secondary"
              />
              {TagDisplayUtils.hasMoreTags(post.tags, 3) && (
                <Badge variant="outline" className="text-xs">
                  +{TagDisplayUtils.getRemainingCount(post.tags, 3)}
                </Badge>
              )}
            </div>
          )}

          {/* 统计和操作 */}
          {showStats && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{post._count.views}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{post._count.comments}</span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2',
                    isLiked && 'text-red-500 hover:text-red-600'
                  )}
                  onClick={handleLike}
                >
                  <Heart className={cn('h-4 w-4 mr-1', isLiked && 'fill-current')} />
                  <span className="text-xs">{likeCount}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );

  /**
   * 渲染列表视图
   */
  const renderListView = () => (
    <Card className={cn('group hover:shadow-md transition-all duration-200', className)}>
      <Link href={PostsDataService.generatePostUrl(post.id)}>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            {/* 封面图片 */}
            {post.coverImage && (
              <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {PostsDataService.formatTimeAgo(post.createdAt)}
                </span>
              </div>

              {post.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.excerpt}
                </p>
              )}

              {/* 作者和标签 */}
              <div className="flex items-center justify-between">
                {showAuthor && (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-5 w-5 cursor-pointer" onClick={handleAuthorClick}>
                      <AvatarImage src={post.author.avatar} alt={post.author.username} />
                      <AvatarFallback className="text-xs">
                        {post.author.displayName?.slice(0, 2) || post.author.username.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="text-xs text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                      onClick={handleAuthorClick}
                    >
                      {post.author.displayName || post.author.username}
                    </span>
                  </div>
                )}

                {showTags && TagDisplayUtils.hasMoreTags(post.tags, 0) && (
                  <div className="flex flex-wrap gap-1">
                    <EnhancedTagList
                      tags={toEnhancedTagListFormat(TagDisplayUtils.getDisplayTags(post.tags, 2))}
                      size="sm"
                      variant="outline"
                    />
                  </div>
                )}
              </div>

              {/* 统计和操作 */}
              {showStats && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{post._count.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{post._count.comments}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 px-2',
                        isLiked && 'text-red-500 hover:text-red-600'
                      )}
                      onClick={handleLike}
                    >
                      <Heart className={cn('h-3 w-3 mr-1', isLiked && 'fill-current')} />
                      <span className="text-xs">{likeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  return viewMode === 'grid' ? renderGridView() : renderListView();
}

/**
 * 帖子卡片骨架组件
 */
export function PostCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <Card className="animate-pulse">
        <div className="aspect-video bg-gray-200 rounded-t-lg" />
        <CardHeader className="pb-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
          <div className="flex space-x-1">
            <div className="h-5 bg-gray-200 rounded w-12" />
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
          <div className="flex justify-between">
            <div className="flex space-x-4">
              <div className="h-3 bg-gray-200 rounded w-8" />
              <div className="h-3 bg-gray-200 rounded w-8" />
            </div>
            <div className="flex space-x-1">
              <div className="h-8 bg-gray-200 rounded w-12" />
              <div className="h-8 bg-gray-200 rounded w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gray-200 rounded-full" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
              <div className="flex space-x-1">
                <div className="h-7 bg-gray-200 rounded w-10" />
                <div className="h-7 bg-gray-200 rounded w-7" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

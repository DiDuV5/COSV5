/**
 * @fileoverview 帖子详情页面 - 重构为模块化架构
 * @description 显示帖子的详细信息，支持作品和动态两种类型 - 模块化重构版本
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @example
 * // 访问帖子详情页面
 * /posts/[id]
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 优化ReactionStats组件，增强健壮性和错误处理
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { CommentSection } from '@/components/post/comment-section';
import { StableMediaLightbox } from '@/components/media/StableMediaLightbox';

// 导入模块化组件
import { usePostDetail } from './post-detail/hooks/use-post-detail';
import { useReactionStats } from './post-detail/hooks/use-reaction-stats';
import { useLightbox } from './post-detail/hooks/use-lightbox';
import { parseTags } from './post-detail/utils';
import { PostHeader } from './post-detail/components/PostHeader';
import { PostContent } from './post-detail/components/PostContent';
import { PostMedia } from './post-detail/components/PostMedia';
import { PostInteractions } from './post-detail/components/PostInteractions';
import { PostTags } from './post-detail/components/PostTags';
import { DownloadLinkDisplay } from '@/components/download/DownloadLinkDisplay';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { data: session } = useSession();

  // 使用自定义Hook管理数据
  const { post, isPending, error, likeStatusData } = usePostDetail({ postId });

  const {
    processedReactionStats,
    reactionStatsLoading,
    reactionStatsRefetching,
    reactionStatsError,
    handleReactionChange,
    refetchReactionStats,
  } = useReactionStats({ postId, post, session });

  const {
    lightboxOpen,
    currentMediaIndex,
    handleMediaClick,
    handlePermissionUpgrade,
    closeLightbox,
    setCurrentMediaIndex,
  } = useLightbox();

  // 返回按钮处理
  const handleBack = () => {
    router.back();
  };

  // 解析标签
  const tags = parseTags(post?.tags || null);

  if (isPending) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4" />
          <div className="aspect-video bg-gray-200 rounded-lg mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              内容不存在
            </h2>
            <p className="text-gray-600 mb-4">
              您访问的内容可能已被删除或不存在
            </p>
            <Button onClick={handleBack}>
              返回上一页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 主要内容 */}
      <div className="space-y-6">
        {/* 帖子头部 */}
        <PostHeader post={post} onBack={handleBack} />

        {/* 帖子内容 */}
        <PostContent post={post} />

        {/* 帖子媒体 */}
        {(() => {
          console.log('🎪 作品详情页面：准备渲染 PostMedia 组件', {
            postId: post.id,
            mediaExists: !!post.media,
            mediaLength: post.media?.length || 0,
            mediaData: post.media,
            userLevel: session?.user?.userLevel || 'GUEST'
          });
          return (
            <PostMedia
              post={post}
              userLevel={session?.user?.userLevel || 'GUEST'}
              onMediaClick={handleMediaClick}
              onPermissionUpgrade={handlePermissionUpgrade}
            />
          );
        })()}

        {/* 帖子互动 */}
        <PostInteractions
          post={post}
          postId={postId}
          session={session}
          likeStatusData={likeStatusData}
          processedReactionStats={processedReactionStats}
          reactionStatsLoading={reactionStatsLoading}
          reactionStatsRefetching={reactionStatsRefetching}
          reactionStatsError={reactionStatsError}
          onReactionChange={handleReactionChange}
          onRefetchReactionStats={refetchReactionStats}
        />

        {/* 帖子标签 */}
        <PostTags tags={tags} />

        {/* 资源下载区域 */}
        <DownloadLinkDisplay postId={postId} />

        {/* 评论区域 - 完整功能版本 */}
        <CommentSection
          postId={postId}
          commentCount={post.commentCount || 0}
        />
      </div>

      {/* 媒体灯箱 */}
      {post.media && post.media.length > 0 && (
        <StableMediaLightbox
          media={post.media as any[]}
          isOpen={lightboxOpen}
          currentIndex={currentMediaIndex}
          onClose={closeLightbox}
          onIndexChange={setCurrentMediaIndex}
          userLevel={session?.user?.userLevel || 'GUEST'}
        />
      )}

      {/* 滚动到顶部按钮 */}
      <ScrollToTop />
    </div>
  );
}

/**
 * @fileoverview 帖子互动组件
 * @description 显示帖子的互动区域，包括表情反应、评论、分享等
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Share2 } from 'lucide-react';
import { ReactionButton } from '@/components/ui/reaction-button';
import { ReactionStats } from '@/components/ui/reaction-stats';
import type { PostInteractionsProps } from '../types';

export function PostInteractions({
  post,
  postId,
  session,
  likeStatusData,
  processedReactionStats,
  reactionStatsLoading,
  reactionStatsRefetching,
  reactionStatsError,
  onReactionChange,
  onRefetchReactionStats,
}: PostInteractionsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* 多表情反应按钮 */}
            <ReactionButton
              targetId={post.id}
              targetType="post"
              currentReaction={likeStatusData?.[postId]?.reactionType}
              likeCount={post.likeCount || 0}
              userLevel={session?.user?.userLevel || 'GUEST'}
              size="md"
              showPicker={true}
              enableLongPress={true}
              showStats={false}
              onReactionChange={(reaction) => onReactionChange(reaction, 'ReactionButton')}
            />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <MessageCircle className="w-5 h-5" />
                <span className="ml-1">{post.commentCount || 0}</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500">
              <Eye className="w-4 h-4" />
              <span className="text-sm">{post.viewCount || 0} 次浏览</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>
          </div>
        </div>

        {/* 表情反应统计区域 */}
        <div className={`pt-4 border-t ${post.likeCount <= 0 ? 'hidden' : ''}`}>
          {/* 加载状态显示 */}
          {reactionStatsLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">加载表情统计中...</span>
            </div>
          )}

          {/* 重新获取状态显示 */}
          {reactionStatsRefetching && !reactionStatsLoading && (
            <div className="flex items-center gap-2 text-blue-500">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">更新中...</span>
            </div>
          )}

          {/* 错误状态显示和重试按钮 */}
          {reactionStatsError && !reactionStatsLoading && !processedReactionStats && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-sm">表情统计加载失败</span>
                {reactionStatsError.message && (
                  <span className="text-xs text-red-500">({reactionStatsError.message})</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRefetchReactionStats()}
                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
              >
                重试
              </button>
            </div>
          )}

          {/* 表情统计组件 */}
          {processedReactionStats && processedReactionStats.reactions && processedReactionStats.reactions.length > 0 && (
            <ReactionStats
              reactionStats={processedReactionStats.reactions as any}
              totalCount={processedReactionStats.totalCount}
              size="md"
              showUserList={true}
              maxDisplay={5}
              enableQuickReaction={true}
              targetId={postId}
              targetType="post"
              currentUserReaction={likeStatusData?.[postId]?.reactionType || null}
              userLevel={session?.user?.userLevel || 'GUEST'}
              onReactionChange={onReactionChange}
            />
          )}

          {/* 无表情反应时的优雅降级显示 */}
          {!reactionStatsLoading && !reactionStatsError && processedReactionStats &&
           (!processedReactionStats.reactions || processedReactionStats.reactions.length === 0) && (
            <div className="text-sm text-gray-500">
              暂无表情反应
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

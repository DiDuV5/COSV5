/**
 * @fileoverview 帖子头部组件
 * @description 显示帖子标题、作者信息和发布时间
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { AuthorInfo } from '@/components/ui/clickable-user-info';
import { ProtectedPostActions } from '@/components/post/PostActions';
import { formatDate } from '../utils';
import type { PostHeaderProps } from '../types';

export function PostHeader({ post, onBack }: PostHeaderProps) {
  return (
    <>
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {/* 标题和基本信息 */}
      <div>
        {/* 根据内容类型显示不同的标题样式 */}
        {post.contentType === 'MOMENT' ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                动态
              </Badge>
              <span className="text-sm text-gray-500">
                {formatDate(post.publishedAt || post.createdAt)}
              </span>
            </div>
            {/* 动态类型的作者信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AuthorInfo
                  user={{
                    id: post.author.id,
                    username: post.author.username,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl,
                    userLevel: post.author.userLevel,
                    isVerified: post.author.isVerified,
                  }}
                />
              </div>

              {/* 动态操作按钮 */}
              <ProtectedPostActions
                post={{
                  id: post.id,
                  title: post.title || '动态',
                  contentType: 'MOMENT',
                  authorId: post.authorId,
                  mediaCount: post.media?.length || 0,
                  commentCount: post.commentCount || 0,
                  likeCount: post.likeCount || 0,
                  publishedAt: post.publishedAt,
                }}
                variant="buttons"
                size="sm"
              />
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            {/* 作者和发布信息 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AuthorInfo
                  user={{
                    id: post.author.id,
                    username: post.author.username,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl,
                    userLevel: post.author.userLevel,
                    isVerified: post.author.isVerified,
                  }}
                />
                <div className="ml-2">
                  <p className="text-sm text-gray-500">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </p>
                </div>
              </div>

              {/* 作品操作按钮 */}
              <ProtectedPostActions
                post={{
                  id: post.id,
                  title: post.title,
                  contentType: post.contentType || 'POST',
                  authorId: post.authorId,
                  mediaCount: post.media?.length || 0,
                  commentCount: post.commentCount || 0,
                  likeCount: post.likeCount || 0,
                  publishedAt: post.publishedAt,
                }}
                variant="buttons"
                size="sm"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

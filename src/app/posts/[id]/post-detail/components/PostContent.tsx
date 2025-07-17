/**
 * @fileoverview 帖子内容组件
 * @description 显示帖子的文字内容
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MentionRenderer } from '@/components/ui/mention-renderer';
import type { PostContentProps } from '../types';

export function PostContent({ post }: PostContentProps) {
  // 如果没有内容，不渲染
  if (!post.description && !post.content) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* 动态类型：直接显示内容，不需要标题分离 */}
        {post.contentType === 'MOMENT' ? (
          <div className="text-gray-700 leading-relaxed">
            <MentionRenderer
              content={post.content || post.description || ''}
              mentions={post.mentions || []}
              enableUserCard={true}
              enableTagLinks={true}
              maxLength={2000}
              showReadMore={true}
            />
          </div>
        ) : (
          /* 作品类型：优化后的结构化显示 */
          <>
            {post.description && (
              <div className="mb-6">
                <div className="text-xl text-gray-800 leading-relaxed">
                  <MentionRenderer
                    content={post.description}
                    mentions={post.mentions || []}
                    enableUserCard={true}
                    enableTagLinks={true}
                  />
                </div>
              </div>
            )}

            {post.content && (
              <div>
                <div className="prose max-w-none">
                  <div className="text-base text-gray-700 leading-relaxed">
                    <MentionRenderer
                      content={post.content}
                      mentions={post.mentions || []}
                      enableUserCard={true}
                      enableTagLinks={true}
                      maxLength={1000}
                      showReadMore={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

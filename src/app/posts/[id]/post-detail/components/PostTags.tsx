/**
 * @fileoverview 帖子标签组件
 * @description 显示帖子的标签
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { EnhancedTagList } from '@/components/ui/enhanced-tag-list';
import type { PostTagsProps } from '../types';

export function PostTags({ tags }: PostTagsProps) {
  // 如果没有标签，不渲染
  if (tags.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Tag className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">相关标签</h3>
        </div>
        <EnhancedTagList
          tags={tags.map(tag => ({ name: tag }))}
          size="md"
          showCount={true}
          className="gap-2"
        />
      </CardContent>
    </Card>
  );
}

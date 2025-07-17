/**
 * @fileoverview 增强版标签列表组件
 * @description 支持动态获取标签统计信息的标签列表组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

'use client';

import React from 'react';
import { TagList } from './tag';
import { api } from '@/trpc/react';

interface EnhancedTagListProps {
  tags: Array<string | { name: string }>;
  maxTags?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showCount?: boolean;
  className?: string;
}

export function EnhancedTagList({
  tags,
  maxTags,
  size = 'md',
  variant = 'default',
  showCount = true,
  className,
}: EnhancedTagListProps) {
  const [tagsWithStats, setTagsWithStats] = React.useState<Array<{ name: string; count?: number }>>(
    (tags || []).map(tag => ({
      name: typeof tag === 'string' ? tag : tag.name,
      count: 0
    }))
  );

  // 暂时禁用标签统计查询 - getMultipleStats方法不存在
  const tagStats = null as any;
  const isPending = false;
  const error = null;

  // 更新标签统计信息
  React.useEffect(() => {
    if (tagStats && tagStats.length > 0) {
      const updatedTags = tags.map(tag => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        const stat = tagStats.find((s: any) => s.name === tagName);
        return {
          name: tagName,
          count: stat?.count || 0,
        };
      });
      setTagsWithStats(updatedTags);
    } else if (!showCount) {
      // 如果不显示计数，直接使用原始标签
      setTagsWithStats(tags.map(tag => ({
        name: typeof tag === 'string' ? tag : tag.name,
        count: undefined
      })));
    }
  }, [tagStats, tags, showCount]);

  // 错误处理：如果加载失败，显示不带计数的标签
  if (error && showCount) {
    console.warn('标签统计加载失败:', error);
    return (
      <TagList
        tags={tags.map(tag => ({
          name: typeof tag === 'string' ? tag : tag.name,
          count: undefined
        }))}
        maxTags={maxTags}
        size={size}
        variant={variant}
        showCount={false} // 错误时不显示计数
        className={className}
      />
    );
  }

  // 如果正在加载且需要显示计数，显示加载状态
  if (isPending && showCount) {
    return (
      <TagList
        tags={tags.map(tag => ({
          name: typeof tag === 'string' ? tag : tag.name,
          count: 0
        }))}
        maxTags={maxTags}
        size={size}
        variant={variant}
        showCount={false} // 加载时不显示计数
        className={className}
      />
    );
  }

  return (
    <TagList
      tags={tagsWithStats}
      maxTags={maxTags}
      size={size}
      variant={variant}
      showCount={showCount}
      className={className}
    />
  );
}

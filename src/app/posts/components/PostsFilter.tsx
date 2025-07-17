/**
 * @fileoverview 帖子过滤器组件
 * @description 专门处理帖子的过滤、排序和搜索功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { Search, Filter, Grid, List, TrendingUp, Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PostsDataService, type SortOption, type ViewMode, type FilterOptions } from '../services/posts-data-service';

/**
 * 帖子过滤器属性接口
 */
export interface PostsFilterProps {
  sortBy: SortOption;
  viewMode: ViewMode;
  searchQuery?: string;
  selectedTags?: string[];
  totalCount?: number;
  filteredCount?: number;
  className?: string;
  onSortChange: (sortBy: SortOption) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onSearchChange?: (query: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onClearFilters?: () => void;
}

/**
 * 排序选项配置
 */
const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    value: 'latest',
    label: '最新发布',
    icon: <Clock className="h-4 w-4" />,
    description: '按发布时间排序',
  },
  {
    value: 'popular',
    label: '最受欢迎',
    icon: <Heart className="h-4 w-4" />,
    description: '按点赞和评论数排序',
  },
  {
    value: 'trending',
    label: '热门趋势',
    icon: <TrendingUp className="h-4 w-4" />,
    description: '按热度趋势排序',
  },
];

/**
 * 帖子过滤器组件
 */
export function PostsFilter({
  sortBy,
  viewMode,
  searchQuery = '',
  selectedTags = [],
  totalCount = 0,
  filteredCount = 0,
  className,
  onSortChange,
  onViewModeChange,
  onSearchChange,
  onTagsChange,
  onClearFilters,
}: PostsFilterProps) {
  /**
   * 获取活跃过滤器数量
   */
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedTags.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const hasFilters = activeFiltersCount > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 搜索栏 */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索帖子、作者或标签..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* 过滤器控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 排序选择 */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 活跃过滤器指示 */}
          {hasFilters && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} 个过滤器
              </Badge>
              {onClearFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-xs h-6 px-2"
                >
                  清除
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 结果统计 */}
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {hasFilters ? (
                <>显示 {filteredCount} / {totalCount} 个帖子</>
              ) : (
                <>共 {totalCount} 个帖子</>
              )}
            </span>
          )}

          {/* 视图模式切换 */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 活跃过滤器标签 */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery.trim() && (
            <Badge variant="outline" className="text-xs">
              搜索: {`"${searchQuery}"`}
              {onSearchChange && (
                <button
                  onClick={() => onSearchChange('')}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </Badge>
          )}

          {selectedTags.length > 0 && (
            <Badge variant="outline" className="text-xs">
              标签: {selectedTags.length} 个
              {onTagsChange && (
                <button
                  onClick={() => onTagsChange([])}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </Badge>
          )}
        </div>
      )}

      {/* 排序说明 */}
      <div className="text-xs text-muted-foreground">
        {SORT_OPTIONS.find(option => option.value === sortBy)?.description}
      </div>
    </div>
  );
}

/**
 * 简化版帖子过滤器
 */
export function SimplePostsFilter({
  sortBy,
  viewMode,
  onSortChange,
  onViewModeChange,
  className,
}: Pick<PostsFilterProps, 'sortBy' | 'viewMode' | 'onSortChange' | 'onViewModeChange' | 'className'>) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center space-x-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center border rounded-md">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="rounded-r-none"
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * 帖子统计组件
 */
export function PostsStats({
  totalPosts,
  totalLikes,
  totalComments,
  totalViews,
  className,
}: {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 text-center', className)}>
      <div>
        <div className="text-2xl font-bold text-blue-600">{totalPosts}</div>
        <div className="text-xs text-muted-foreground">帖子总数</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-red-600">{totalLikes}</div>
        <div className="text-xs text-muted-foreground">总点赞数</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-green-600">{totalComments}</div>
        <div className="text-xs text-muted-foreground">总评论数</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-purple-600">{totalViews}</div>
        <div className="text-xs text-muted-foreground">总浏览数</div>
      </div>
    </div>
  );
}

/**
 * 帖子过滤器骨架组件
 */
export function PostsFilterSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="flex justify-between">
        <div className="flex space-x-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
        <div className="flex space-x-2">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

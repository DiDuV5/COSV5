/**
 * @fileoverview 任务过滤器组件
 * @description 专门处理任务过滤、排序和搜索功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Filter, Search, SortAsc, SortDesc, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskIconService } from '../services/task-icon-service';
import type { TaskFilterOptions, CategoryStats } from '../services/task-data-service';

/**
 * 任务过滤器属性接口
 */
export interface TaskFilterProps {
  filters: TaskFilterOptions;
  categoryStats?: Record<string, CategoryStats>;
  searchQuery?: string;
  showOnlyAvailable?: boolean;
  className?: string;
  onFiltersChange: (filters: TaskFilterOptions) => void;
  onSearchChange?: (query: string) => void;
  onToggleAvailableOnly?: (show: boolean) => void;
}

/**
 * 分类选项
 */
const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类', icon: '📋' },
  { value: 'interaction', label: '互动任务', icon: '🤝' },
  { value: 'creation', label: '创作任务', icon: '🎨' },
  { value: 'daily', label: '每日任务', icon: '📅' },
  { value: 'weekly', label: '每周任务', icon: '📊' },
  { value: 'achievement', label: '成就任务', icon: '🏆' },
];

/**
 * 难度选项
 */
const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'expert', label: '专家' },
];

/**
 * 状态选项
 */
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'available', label: '可完成' },
  { value: 'completed', label: '已完成' },
  { value: 'locked', label: '已锁定' },
  { value: 'expired', label: '已过期' },
];

/**
 * 排序选项
 */
const SORT_OPTIONS = [
  { value: 'name', label: '按名称' },
  { value: 'difficulty', label: '按难度' },
  { value: 'reward', label: '按奖励' },
  { value: 'progress', label: '按进度' },
];

/**
 * 任务过滤器组件
 */
export function TaskFilter({
  filters,
  categoryStats = {},
  searchQuery = '',
  showOnlyAvailable = false,
  className,
  onFiltersChange,
  onSearchChange,
  onToggleAvailableOnly,
}: TaskFilterProps) {
  /**
   * 处理过滤器变更
   */
  const handleFilterChange = (key: keyof TaskFilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  /**
   * 处理排序变更
   */
  const handleSortChange = (sortBy: string) => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as TaskFilterOptions['sortBy'],
    });
  };

  /**
   * 切换排序顺序
   */
  const toggleSortOrder = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  };

  /**
   * 重置过滤器
   */
  const resetFilters = () => {
    onFiltersChange({
      category: 'all',
      difficulty: undefined,
      status: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    onSearchChange?.('');
    onToggleAvailableOnly?.(false);
  };

  /**
   * 获取活跃过滤器数量
   */
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.difficulty) count++;
    if (filters.status) count++;
    if (searchQuery) count++;
    if (showOnlyAvailable) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn('space-y-4', className)}>
      {/* 搜索栏 */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* 过滤器控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">过滤器</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 只显示可用任务切换 */}
          {onToggleAvailableOnly && (
            <Button
              variant={showOnlyAvailable ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggleAvailableOnly(!showOnlyAvailable)}
              className="text-xs"
            >
              {showOnlyAvailable ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
              {showOnlyAvailable ? '显示全部' : '仅可用'}
            </Button>
          )}

          {/* 重置按钮 */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs"
            >
              重置
            </Button>
          )}
        </div>
      </div>

      {/* 过滤器选项 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 分类过滤 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">分类</label>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  <div className="flex items-center space-x-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    {categoryStats[option.value] && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {categoryStats[option.value].available}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 难度过滤 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">难度</label>
          <Select
            value={filters.difficulty || 'all'}
            onValueChange={(value) => handleFilterChange('difficulty', value)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态过滤 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">状态</label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 排序选项 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">排序</label>
          <div className="flex space-x-1">
            <Select
              value={filters.sortBy || 'name'}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="px-2"
            >
              {filters.sortOrder === 'desc' ? (
                <SortDesc className="h-3 w-3" />
              ) : (
                <SortAsc className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 活跃过滤器标签 */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category && filters.category !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              分类: {CATEGORY_OPTIONS.find(opt => opt.value === filters.category)?.label}
            </Badge>
          )}
          {filters.difficulty && (
            <Badge variant="secondary" className="text-xs">
              难度: {TaskIconService.getDifficultyText(filters.difficulty)}
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="text-xs">
              状态: {STATUS_OPTIONS.find(opt => opt.value === filters.status)?.label}
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              搜索: {`"${searchQuery}"`}
            </Badge>
          )}
          {showOnlyAvailable && (
            <Badge variant="secondary" className="text-xs">
              仅显示可用
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 简化版任务过滤器
 */
export function SimpleTaskFilter({
  filters,
  onFiltersChange,
  className,
}: Pick<TaskFilterProps, 'filters' | 'onFiltersChange' | 'className'>) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Select
        value={filters.category || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, category: value === 'all' ? undefined : value })}
      >
        <SelectTrigger className="w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.slice(0, 4).map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.icon} {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.difficulty || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, difficulty: value === 'all' ? undefined : value })}
      >
        <SelectTrigger className="w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIFFICULTY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

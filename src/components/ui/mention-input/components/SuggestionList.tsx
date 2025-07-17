/**
 * @fileoverview 建议列表组件
 * @description 专门处理用户建议列表的显示、选择和交互
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React, { forwardRef } from 'react';
import { AtSign, Loader2, Crown, Star, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserSuggestion } from '../hooks/use-user-search';

/**
 * 建议列表属性接口
 */
export interface SuggestionListProps {
  suggestions: UserSuggestion[];
  selectedIndex: number;
  query: string;
  isPending: boolean;
  isVisible: boolean;
  className?: string;
  onSelect: (user: UserSuggestion) => void;
  onMouseEnter?: (index: number) => void;
}

/**
 * 建议列表组件
 */
export const SuggestionList = forwardRef<HTMLDivElement, SuggestionListProps>(
  ({
    suggestions,
    selectedIndex,
    query,
    isPending,
    isVisible,
    className,
    onSelect,
    onMouseEnter,
  }, ref) => {
    if (!isVisible) return null;

    /**
     * 获取用户等级图标
     */
    const getUserLevelIcon = (userLevel: string) => {
      switch (userLevel) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
          return <Crown className="h-3 w-3 text-yellow-500" />;
        case 'CREATOR':
          return <Star className="h-3 w-3 text-blue-500" />;
        case 'VIP':
          return <Circle className="h-3 w-3 text-purple-500 fill-current" />;
        default:
          return null;
      }
    };

    /**
     * 获取用户等级标签
     */
    const getUserLevelBadge = (userLevel: string) => {
      const levelMap: Record<string, { label: string; variant: any }> = {
        SUPER_ADMIN: { label: '超管', variant: 'destructive' },
        ADMIN: { label: '管理', variant: 'destructive' },
        CREATOR: { label: '创作者', variant: 'default' },
        VIP: { label: 'VIP', variant: 'secondary' },
        USER: { label: '用户', variant: 'outline' },
        GUEST: { label: '游客', variant: 'outline' },
      };

      const config = levelMap[userLevel] || levelMap.USER;
      return (
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
      );
    };

    /**
     * 格式化粉丝数
     */
    const formatFollowerCount = (count: number) => {
      if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      }
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    };

    /**
     * 高亮匹配文本
     */
    const highlightMatch = (text: string, query: string) => {
      if (!query) return text;

      const regex = new RegExp(`(${query})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-medium">
            {part}
          </span>
        ) : part
      );
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "absolute z-50 mt-1 w-full max-w-md shadow-lg border",
          "animate-in fade-in-0 slide-in-from-top-2 duration-200",
          className
        )}
      >
        <CardContent className="p-2">
          {/* 搜索状态提示 */}
          {query.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground border-b mb-2">
              <AtSign className="h-3 w-3" />
              <span>搜索用户: {`"${query}"`}</span>
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
          )}

          {/* 建议列表 */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    index === selectedIndex
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => onSelect(user)}
                  onMouseEnter={() => onMouseEnter?.(index)}
                >
                  {/* 用户头像 */}
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback className="text-xs">
                        {(user.displayName || user.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* 在线状态指示器 */}
                    {user.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {highlightMatch(user.displayName || user.username, query)}
                      </span>
                      {getUserLevelIcon(user.userLevel)}
                      {user.isFollowing && (
                        <Badge variant="outline" className="text-xs">
                          已关注
                        </Badge>
                      )}
                    </div>

                    {user.displayName && user.displayName !== user.username && (
                      <div className="text-xs text-muted-foreground truncate">
                        @{highlightMatch(user.username, query)}
                      </div>
                    )}

                    {user.followerCount !== undefined && user.followerCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {formatFollowerCount(user.followerCount)} 粉丝
                      </div>
                    )}
                  </div>

                  {/* 用户等级标签 */}
                  <div className="flex-shrink-0">
                    {getUserLevelBadge(user.userLevel)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                {isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>搜索中...</span>
                  </div>
                ) : query.length > 0 ? (
                  <div>
                    <AtSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>未找到匹配的用户</p>
                    <p className="text-xs mt-1">尝试输入完整的用户名</p>
                  </div>
                ) : (
                  <div>
                    <AtSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>输入用户名搜索</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作提示 */}
          {suggestions.length > 0 && (
            <div className="border-t mt-2 pt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>↑↓ 选择</span>
                <span>Enter 确认</span>
                <span>Esc 取消</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

SuggestionList.displayName = 'SuggestionList';

/**
 * 建议项组件
 */
export interface SuggestionItemProps {
  user: UserSuggestion;
  isSelected: boolean;
  query: string;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function SuggestionItem({
  user,
  isSelected,
  query,
  onClick,
  onMouseEnter,
}: SuggestionItemProps) {
  const getUserLevelIcon = (userLevel: string) => {
    switch (userLevel) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'CREATOR':
        return <Star className="h-3 w-3 text-blue-500" />;
      case 'VIP':
        return <Circle className="h-3 w-3 text-purple-500 fill-current" />;
      default:
        return null;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-medium">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          : "hover:bg-gray-50 dark:hover:bg-gray-800"
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback className="text-xs">
            {(user.displayName || user.username).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {user.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {highlightMatch(user.displayName || user.username, query)}
          </span>
          {getUserLevelIcon(user.userLevel)}
        </div>

        {user.displayName && user.displayName !== user.username && (
          <div className="text-xs text-muted-foreground truncate">
            @{highlightMatch(user.username, query)}
          </div>
        )}
      </div>
    </div>
  );
}

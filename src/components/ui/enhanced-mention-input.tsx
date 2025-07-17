/**
 * @component EnhancedMentionInput
 * @description 增强版@用户提及输入组件，支持displayName显示和username存储
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - value: string - 当前文本内容（存储格式，使用username）
 * - onChange: (value: string) => void - 文本变化回调（存储格式）
 * - displayValue?: string - 显示文本内容（显示格式，使用displayName）
 * - onDisplayChange?: (value: string) => void - 显示文本变化回调
 * - placeholder?: string - 占位符文本
 * - maxLength?: number - 最大字符数
 * - rows?: number - 文本框行数
 * - disabled?: boolean - 是否禁用
 * - className?: string - 自定义样式类名
 * - currentUserId?: string - 当前用户ID
 * - showStats?: boolean - 是否显示统计信息
 *
 * @example
 * <EnhancedMentionInput
 *   value={storageContent}
 *   onChange={setStorageContent}
 *   displayValue={displayContent}
 *   onDisplayChange={setDisplayContent}
 *   placeholder="输入内容，支持@用户提及..."
 *   currentUserId={session?.user?.id}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - @trpc/react-query
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { UserCard } from '@/components/ui/user-card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Hash, AtSign } from 'lucide-react';
import {
  extractMentionsFromText,
  extractHashtagsFromText,
  convertDisplayNamesToUsernames,
  convertUsernamesToDisplayNames,
  resolveMentionsWithUserMap
} from '@/lib/mention-utils';
import { extractHashtags } from '@/lib/tag-utils';

interface EnhancedMentionInputProps {
  value: string; // 存储值（使用username）
  onChange: (value: string) => void;
  displayValue?: string; // 显示值（使用displayName）
  onDisplayChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  className?: string;
  currentUserId?: string;
  showStats?: boolean;
}

interface UserSuggestion {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  userLevel: string;
  isVerified: boolean;
  followersCount: number;
  isFollowing?: boolean;
}

interface UserSuggestionsResponse {
  users: UserSuggestion[];
}

interface ActiveUsersResponse {
  users: UserSuggestion[];
}

export function EnhancedMentionInput({
  value,
  onChange,
  displayValue,
  onDisplayChange,
  placeholder = "输入内容，支持@用户提及和#标签...",
  maxLength = 2000,
  rows = 4,
  disabled = false,
  className,
  currentUserId,
  showStats = true,
}: EnhancedMentionInputProps) {
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userMap, setUserMap] = useState<Record<string, UserSuggestion>>({});

  // 使用displayValue或从value转换得到的显示文本
  const actualDisplayValue = displayValue || value;

  // 获取用户推荐 - 暂时禁用API调用，使用空数据
  const userSuggestions = null as UserSuggestionsResponse | null;
  const isLoadingUsers = false;

  // 获取活跃用户推荐 - 暂时禁用API调用，使用空数据
  const activeUsers = null as ActiveUsersResponse | null;

  // 更新用户映射表
  useEffect(() => {
    const suggestions: UserSuggestion[] = userSuggestions?.users || activeUsers?.users || [];
    const newUserMap: Record<string, UserSuggestion> = {};

    suggestions.forEach((user: UserSuggestion) => {
      newUserMap[user.username] = user;
      if (user.displayName) {
        newUserMap[user.displayName] = user;
      }
    });

    setUserMap(prev => ({ ...prev, ...newUserMap }));
  }, [userSuggestions, activeUsers]);

  // 处理文本变化
  const handleTextChange = useCallback((newDisplayValue: string) => {
    // 更新显示值
    if (onDisplayChange) {
      onDisplayChange(newDisplayValue);
    }

    // 转换为存储值并更新
    const storageValue = convertDisplayNamesToUsernames(newDisplayValue, userMap);
    onChange(storageValue);
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    // 检查是否在输入@提及
    const textBeforeCursor = newDisplayValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]*)$/);

    if (mentionMatch) {
      setCurrentQuery(mentionMatch[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setCurrentQuery('');
    }
  }, [onChange, onDisplayChange, userMap]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    const suggestions: UserSuggestion[] = userSuggestions?.users || activeUsers?.users || [];
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, userSuggestions, activeUsers, selectedIndex]);

  // 插入@提及
  const insertMention = useCallback((user: UserSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const textBeforeCursor = actualDisplayValue.slice(0, cursorPosition);
    const textAfterCursor = actualDisplayValue.slice(cursorPosition);
    
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]*)$/);
    if (!mentionMatch) return;

    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const displayText = user.displayName || user.username;
    
    const newDisplayValue = 
      actualDisplayValue.slice(0, mentionStart) + 
      `@${displayText} ` + 
      textAfterCursor;

    // 更新用户映射
    setUserMap(prev => ({
      ...prev,
      [user.username]: user,
      ...(user.displayName ? { [user.displayName]: user } : {})
    }));

    handleTextChange(newDisplayValue);
    setShowSuggestions(false);

    // 设置光标位置
    setTimeout(() => {
      const newCursorPos = mentionStart + displayText.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [actualDisplayValue, cursorPosition, handleTextChange]);

  // 点击建议项
  const handleSuggestionClick = useCallback((user: UserSuggestion) => {
    insertMention(user);
  }, [insertMention]);

  // 计算统计信息
  const mentions = extractMentionsFromText(actualDisplayValue);
  const hashtags = extractHashtagsFromText(actualDisplayValue);
  const suggestions: UserSuggestion[] = userSuggestions?.users || activeUsers?.users || [];

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={actualDisplayValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        className="resize-none"
      />

      {/* 建议列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 mt-1 w-full max-w-md shadow-lg border">
          <CardContent className="p-2">
            <div className="space-y-1">
              {suggestions.map((user: UserSuggestion, index: number) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    index === selectedIndex 
                      ? "bg-blue-50 dark:bg-blue-900/20" 
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => handleSuggestionClick(user)}
                >
                  <UserCard
                    user={{
                      id: user.id,
                      username: user.username,
                      displayName: user.displayName,
                      avatarUrl: user.avatarUrl,
                      userLevel: user.userLevel,
                      isVerified: user.isVerified,
                      followersCount: user.followersCount,
                    }}
                    size="sm"
                    variant="compact"
                    clickable={false}
                    className="border-0 shadow-none p-0 bg-transparent"
                  />
                  {user.isFollowing && (
                    <Badge variant="secondary" className="text-xs">
                      关注中
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            
            {isLoadingUsers && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">搜索中...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 统计信息 */}
      {showStats && (
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {mentions.length > 0 && (
              <div className="flex items-center gap-1">
                <AtSign className="h-3 w-3" />
                <span>{mentions.length} 个提及</span>
              </div>
            )}
            {hashtags.length > 0 && (
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{hashtags.length} 个标签</span>
              </div>
            )}
          </div>
          <div className={cn(
            actualDisplayValue.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'
          )}>
            {actualDisplayValue.length}/{maxLength}
          </div>
        </div>
      )}
    </div>
  );
}

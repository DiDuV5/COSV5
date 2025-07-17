/**
 * @fileoverview 提及输入组件（重构版）
 * @description 支持@用户提及的智能输入框，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

// 导入重构后的模块
import {
  useUserSearch,
  useMentionParser,
  SuggestionList,
  type UserSuggestion,
  type SearchConfig,
} from './mention-input/index';

/**
 * 组件引用接口
 */
export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
  getSelection: () => { start: number; end: number };
  setSelection: (start: number, end: number) => void;
}

/**
 * 提及输入组件属性接口
 */
export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  className?: string;
  searchConfig?: Partial<SearchConfig>;
  onMentionSelect?: (user: UserSuggestion) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * 建议状态接口
 */
interface SuggestionState {
  show: boolean;
  selectedIndex: number;
  position: { start: number; end: number };
}

/**
 * 提及输入组件（重构版）
 */
export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
  value,
  onChange,
  placeholder = "输入内容，使用 @ 提及用户...",
  maxLength = 2000,
  rows = 4,
  disabled = false,
  className,
  searchConfig = {},
  onMentionSelect,
  onFocus,
  onBlur,
}, ref) => {
  const { data: session } = useSession();
  
  // 状态管理
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({
    show: false,
    selectedIndex: 0,
    position: { start: 0, end: 0 },
  });

  // 引用
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);

  // 使用重构后的Hook
  const mentionParser = useMentionParser();
  const userSearch = useUserSearch({
    currentUserId: session?.user?.id,
    ...searchConfig,
  });

  // 暴露组件方法
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    insertText: (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);

      // 设置光标位置
      setTimeout(() => {
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    getSelection: () => {
      const textarea = textareaRef.current;
      if (!textarea) return { start: 0, end: 0 };
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    },
    setSelection: (start: number, end: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.setSelectionRange(start, end);
    },
  }), [value, onChange]);

  /**
   * 处理文本变化
   */
  const handleTextChange = useCallback((newValue: string) => {
    onChange(newValue);

    // 获取光标位置
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    
    // 解析文本并检测活跃的@提及
    const parseResult = mentionParser.parseText(newValue, cursorPosition);
    
    if (parseResult.hasActiveMention) {
      // 显示建议列表
      setSuggestionState({
        show: true,
        selectedIndex: 0,
        position: parseResult.activeMentionPosition,
      });
      
      // 搜索用户
      userSearch.setQuery(parseResult.activeMentionQuery);
    } else {
      // 隐藏建议列表
      setSuggestionState(prev => ({ ...prev, show: false }));
      userSearch.setQuery('');
    }
  }, [onChange, mentionParser, userSearch]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!suggestionState.show || userSearch.result.users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % userSearch.result.users.length,
        }));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + userSearch.result.users.length) % userSearch.result.users.length,
        }));
        break;
      
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedUser = userSearch.result.users[suggestionState.selectedIndex];
        if (selectedUser) {
          insertMention(selectedUser);
        }
        break;
      
      case 'Escape':
        setSuggestionState(prev => ({ ...prev, show: false }));
        userSearch.setQuery('');
        break;
    }
  }, [suggestionState, userSearch.result.users]);

  /**
   * 插入@提及
   */
  const insertMention = useCallback((user: UserSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 使用解析器插入提及
    const { newText, newCursorPosition } = mentionParser.insertMention(
      value,
      user.username,
      user.displayName || user.username,
      suggestionState.position
    );

    onChange(newText);
    setSuggestionState(prev => ({ ...prev, show: false }));
    userSearch.setQuery('');
    onMentionSelect?.(user);

    // 设置光标位置
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
  }, [value, suggestionState.position, mentionParser, onChange, onMentionSelect, userSearch]);

  /**
   * 处理建议项点击
   */
  const handleSuggestionSelect = useCallback((user: UserSuggestion) => {
    insertMention(user);
  }, [insertMention]);

  /**
   * 处理建议项鼠标悬停
   */
  const handleSuggestionMouseEnter = useCallback((index: number) => {
    setSuggestionState(prev => ({ ...prev, selectedIndex: index }));
  }, []);

  /**
   * 处理焦点事件
   */
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    // 延迟隐藏建议列表，以便处理点击事件
    setTimeout(() => {
      setSuggestionState(prev => ({ ...prev, show: false }));
      userSearch.setQuery('');
    }, 200);
    onBlur?.();
  }, [onBlur, userSearch]);

  /**
   * 处理光标位置变化
   */
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    mentionParser.updateCursorPosition({
      start: cursorPosition,
      end: textarea.selectionEnd,
    });

    // 重新检测活跃的@提及
    const parseResult = mentionParser.parseText(value, cursorPosition);
    
    if (parseResult.hasActiveMention) {
      setSuggestionState(prev => ({
        ...prev,
        show: true,
        position: parseResult.activeMentionPosition,
      }));
      userSearch.setQuery(parseResult.activeMentionQuery);
    } else if (suggestionState.show) {
      setSuggestionState(prev => ({ ...prev, show: false }));
      userSearch.setQuery('');
    }
  }, [value, mentionParser, userSearch, suggestionState.show]);

  // 监听选择变化
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      textarea.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // 解析当前文本
  const parseResult = mentionParser.parseText(value);

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        className="resize-none"
      />

      {/* 建议列表 */}
      <SuggestionList
        ref={suggestionListRef}
        suggestions={userSearch.result.users}
        selectedIndex={suggestionState.selectedIndex}
        query={userSearch.query}
        isPending={userSearch.result.isPending}
        isVisible={suggestionState.show}
        onSelect={handleSuggestionSelect}
        onMouseEnter={handleSuggestionMouseEnter}
      />

      {/* 统计信息 */}
      {(parseResult.mentions.length > 0 || parseResult.hashtags.length > 0) && (
        <div className="mt-2 text-xs text-muted-foreground">
          {parseResult.mentions.length > 0 && (
            <span className="mr-4">
              @提及: {parseResult.mentions.length}
            </span>
          )}
          {parseResult.hashtags.length > 0 && (
            <span>
              #标签: {parseResult.hashtags.length}
            </span>
          )}
        </div>
      )}

      {/* 字符计数 */}
      {maxLength && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
});

MentionInput.displayName = 'MentionInput';

/**
 * 导出类型
 */
export type {
  UserSuggestion,
  SearchConfig,
  MentionInfo,
  ParseResult,
} from './mention-input/index';

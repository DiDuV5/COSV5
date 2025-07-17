/**
 * @component MentionRenderer
 * @description 渲染包含@用户提及和#标签的文本内容
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - content: string - 要渲染的文本内容
 * - mentions?: MentionData[] - 已解析的提及数据
 * - className?: string - 自定义样式类名
 * - enableUserCard?: boolean - 是否启用用户名片弹窗
 * - enableTagLinks?: boolean - 是否启用标签链接
 * - maxLength?: number - 内容截断长度
 * - showReadMore?: boolean - 是否显示"阅读更多"按钮
 *
 * @example
 * <MentionRenderer
 *   content="Hello @douyu, check out this #cosplay!"
 *   mentions={mentionData}
 *   enableUserCard={true}
 *   enableTagLinks={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/ui/user-card';
import { UserSelectorDialog } from '@/components/ui/user-selector-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MentionData, parseMentionsFromStorage } from '@/lib/mention-utils';
import { api } from '@/trpc/react';

interface MentionRendererProps {
  content: string;
  mentions?: MentionData[] | string; // 支持数组或JSON字符串
  className?: string;
  enableUserCard?: boolean;
  enableTagLinks?: boolean;
  maxLength?: number;
  showReadMore?: boolean;
}

interface ParsedSegment {
  type: 'text' | 'mention' | 'hashtag';
  content: string;
  data?: MentionData;
}

export function MentionRenderer({
  content,
  mentions,
  className,
  enableUserCard = true,
  enableTagLinks = true,
  maxLength,
  showReadMore = false,
}: MentionRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState<any[]>([]);

  // 使用新的智能解析API
  const { data: resolvedUserData, isPending: isLoadingUser } = api.mention.resolveUsername.useQuery(
    { username: selectedUsername! },
    {
      enabled: !!selectedUsername && dialogOpen,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
    }
  );

  // 提取用户数据
  const selectedUserData = resolvedUserData?.exactMatch;

  // 调试状态变化
  React.useEffect(() => {
    console.log('🔍 MentionRenderer: State changed', {
      selectedUsername,
      dialogOpen,
      isLoadingUser,
      hasUserData: !!selectedUserData,
    });
  }, [selectedUsername, dialogOpen, isLoadingUser, selectedUserData]);

  // 解析提及数据
  const mentionData = React.useMemo(() => {
    if (!mentions) return [];
    if (typeof mentions === 'string') {
      return parseMentionsFromStorage(mentions);
    }
    return mentions;
  }, [mentions]);

  // 解析文本内容
  const parseContent = useCallback((text: string): ParsedSegment[] => {
    const segments: ParsedSegment[] = [];
    let lastIndex = 0;

    // 匹配@提及和#标签
    const regex = /(@[a-zA-Z0-9_\u4e00-\u9fa5]+)|(#[^\s#@]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 添加前面的普通文本
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      if (match[1]) {
        // @提及
        const username = match[1].slice(1); // 移除@符号
        const mentionInfo = mentionData.find(m => m.username === username);
        
        segments.push({
          type: 'mention',
          content: match[1],
          data: mentionInfo || {
            id: '',
            username,
            position: match.index,
            length: match[1].length,
          },
        });
      } else if (match[2]) {
        // #标签
        segments.push({
          type: 'hashtag',
          content: match[2],
        });
      }

      lastIndex = regex.lastIndex;
    }

    // 添加剩余的文本
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return segments;
  }, [mentionData]);

  // 处理内容截断
  const shouldTruncate = maxLength && content.length > maxLength && showReadMore;
  const displayContent = shouldTruncate && !isExpanded 
    ? content.slice(0, maxLength) + "..."
    : content;

  const segments = parseContent(displayContent);

  // 处理@提及点击
  const handleMentionClick = useCallback((username: string) => {
    console.log('🔍 MentionRenderer: handleMentionClick called with username:', username);
    setSelectedUsername(username);
    setDialogOpen(true);
    console.log('🔍 MentionRenderer: Dialog state set to open');
  }, []);

  // 处理用户选择（当有多个候选用户时）
  const handleUserSelect = useCallback((user: any) => {
    console.log('🔍 MentionRenderer: User selected:', user);
    setSelectedUsername(user.username);
    setSelectorOpen(false);
    setDialogOpen(true);
  }, []);

  // 监听解析结果，处理多个匹配的情况
  React.useEffect(() => {
    if (resolvedUserData && resolvedUserData.hasConflict && resolvedUserData.suggestions.length > 0) {
      console.log('🔍 MentionRenderer: Multiple users found, showing selector');
      setCandidateUsers(resolvedUserData.suggestions);
      setDialogOpen(false);
      setSelectorOpen(true);
    }
  }, [resolvedUserData]);

  // 渲染单个片段
  const renderSegment = (segment: ParsedSegment, index: number) => {
    switch (segment.type) {
      case 'mention':
        if (enableUserCard) {
          const username = segment.data?.username || segment.content.slice(1);
          // 开发环境调试日志
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 MentionRenderer: Rendering mention button for username:', username, 'segment:', segment);
      }
          return (
            <button
              key={index}
              type="button"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors"
              onClick={(e) => {
                console.log('🔍 MentionRenderer: Button clicked!', { username, event: e });
                e.preventDefault();
                e.stopPropagation();
                handleMentionClick(username);
              }}
            >
              @{segment.data?.displayName || username}
            </button>
          );
        } else {
          // 简单链接形式
          const username = segment.content.slice(1); // 移除@符号
          return (
            <Link
              key={index}
              href={`/users/${username}`}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors"
            >
              {segment.content}
            </Link>
          );
        }

      case 'hashtag':
        if (enableTagLinks) {
          const tag = segment.content.slice(1); // 移除#符号
          return (
            <Link
              key={index}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium hover:underline transition-colors"
            >
              {segment.content}
            </Link>
          );
        } else {
          return (
            <span
              key={index}
              className="text-purple-600 dark:text-purple-400 font-medium"
            >
              {segment.content}
            </span>
          );
        }

      case 'text':
      default:
        return (
          <span key={index} className="whitespace-pre-wrap">
            {segment.content}
          </span>
        );
    }
  };

  return (
    <>
      <div className={cn("w-full", className)}>
        <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
          {segments.map(renderSegment)}
        </div>

        {/* 展开/收起按钮 */}
        {shouldTruncate && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-0 h-auto font-normal"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  展开阅读
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 用户名片弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        console.log('🔍 MentionRenderer: Dialog onOpenChange called with:', open);
        setDialogOpen(open);
        if (!open) {
          setSelectedUsername(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">用户信息</DialogTitle>
          </DialogHeader>
          {(() => {
            console.log('🔍 MentionRenderer: Dialog content rendering', {
              isLoadingUser,
              hasUserData: !!selectedUserData,
              selectedUsername,
              dialogOpen,
            });
            return null;
          })()}
          {isLoadingUser ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-700">加载用户信息...</span>
            </div>
          ) : selectedUserData ? (
            <UserCard
              user={{
                id: selectedUserData.id,
                username: selectedUserData.username,
                displayName: selectedUserData.displayName,
                avatarUrl: selectedUserData.avatarUrl,
                userLevel: selectedUserData.userLevel,
                isVerified: selectedUserData.isVerified,
                followersCount: selectedUserData.followerCount,
              }}
              size="lg"
              variant="detailed"
              showSocialLinks={true}
              showStats={true}
              clickable={false}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <span className="text-gray-500">用户信息加载失败</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 用户选择器弹窗 */}
      <UserSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        users={candidateUsers}
        onSelect={handleUserSelect}
        title="选择要查看的用户"
        description="找到多个匹配的用户，请选择您要查看的用户："
      />
    </>
  );
}

/**
 * 简化版提及渲染器，仅渲染链接
 */
export function SimpleMentionRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const renderContent = useCallback(() => {
    // 简单的正则替换，适用于不需要复杂交互的场景
    return content
      .replace(
        /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
        '<a href="/users/$1" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">@$1</a>'
      )
      .replace(
        /#([^\s#@]+)/g,
        '<a href="/tags/$1" class="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium hover:underline">#$1</a>'
      );
  }, [content]);

  return (
    <div
      className={cn("w-full text-gray-900 dark:text-gray-100 leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
    />
  );
}

/**
 * 纯文本提及渲染器，用于预览或搜索结果
 */
export function PlainMentionRenderer({
  content,
  className,
  highlightMentions = true,
  highlightTags = true,
}: {
  content: string;
  className?: string;
  highlightMentions?: boolean;
  highlightTags?: boolean;
}) {
  const renderContent = useCallback(() => {
    let result = content;

    if (highlightMentions) {
      result = result.replace(
        /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
        '<span class="text-blue-600 dark:text-blue-400 font-medium">@$1</span>'
      );
    }

    if (highlightTags) {
      result = result.replace(
        /#([^\s#@]+)/g,
        '<span class="text-purple-600 dark:text-purple-400 font-medium">#$1</span>'
      );
    }

    return result;
  }, [content, highlightMentions, highlightTags]);

  return (
    <div
      className={cn("w-full text-gray-900 dark:text-gray-100 leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
    />
  );
}

/**
 * @fileoverview 用户列表对话框组件
 * @description 显示特定表情反应的用户列表
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Users, X } from 'lucide-react';
import { REACTION_CONFIGS, type ReactionType } from '@/lib/reaction-types';

import type { UserListDialogProps } from '../types';
import { 
  CSS_CLASSES, 
  ARIA_LABELS, 
  TEST_IDS, 
  PERFORMANCE_CONFIG 
} from '../constants';
import { createTestId } from '../utils';

/**
 * @component UserListDialog
 * @description 用户列表对话框组件
 */
export function UserListDialog({
  open,
  onOpenChange,
  selectedReaction,
  reactionStats,
}: UserListDialogProps) {
  // 获取选中反应的统计数据
  const selectedStat = useMemo(() => {
    if (!selectedReaction) return null;
    return reactionStats.find(stat => stat.type === selectedReaction);
  }, [selectedReaction, reactionStats]);

  // 获取表情配置
  const reactionConfig = useMemo(() => {
    if (!selectedReaction) return null;
    return REACTION_CONFIGS[selectedReaction];
  }, [selectedReaction]);

  // 获取用户列表
  const users = useMemo(() => {
    if (!selectedStat?.users) return [];
    
    // 限制显示数量以提高性能
    const limitedUsers = selectedStat.users.slice(0, PERFORMANCE_CONFIG.maxDisplayUsers);
    
    // 按时间排序（最新的在前）
    return limitedUsers.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [selectedStat?.users]);

  // 如果没有选中的反应或配置，不渲染
  if (!selectedReaction || !reactionConfig || !selectedStat) {
    return null;
  }

  /**
   * 格式化用户名显示
   */
  const formatUsername = (username: string) => {
    return username.length > 20 ? `${username.slice(0, 20)}...` : username;
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (date?: Date | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * 获取用户头像后备文字
   */
  const getAvatarFallback = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(CSS_CLASSES.dialogContent, 'max-h-[80vh]')}
        data-testid={TEST_IDS.userListDialog}
        aria-label={ARIA_LABELS.userListDialog(reactionConfig.label, selectedStat.count)}
      >
        <DialogHeader className={CSS_CLASSES.dialogHeader}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                {reactionConfig.emoji}
              </span>
              <DialogTitle className="text-lg font-semibold">
                {reactionConfig.label}
              </DialogTitle>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {selectedStat.count} 人
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        <div className={CSS_CLASSES.dialogBody}>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm">
                暂无用户使用此表情反应
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                <AnimatePresence>
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={CSS_CLASSES.userItem}
                      data-testid={createTestId(TEST_IDS.userItem, user.id)}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage
                          src={(user as any).avatar || user.avatarUrl || undefined}
                          alt={`${user.username}的头像`}
                        />
                        <AvatarFallback className="text-xs">
                          {getAvatarFallback(user.username)}
                        </AvatarFallback>
                      </Avatar>

                      <div className={CSS_CLASSES.userInfo}>
                        <div className={CSS_CLASSES.userName}>
                          {formatUsername(user.username)}
                        </div>
                        {user.displayName && user.displayName !== user.username && (
                          <div className={CSS_CLASSES.userHandle}>
                            {formatUsername(user.displayName)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end text-xs text-gray-500">
                        {(user as any).createdAt && (
                          <span>{formatTime((user as any).createdAt)}</span>
                        )}
                        {(user as any).userLevel && (user as any).userLevel !== 'USER' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {(user as any).userLevel}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* 如果用户数量超过显示限制，显示提示 */}
              {selectedStat.count > PERFORMANCE_CONFIG.maxDisplayUsers && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    显示前 {PERFORMANCE_CONFIG.maxDisplayUsers} 位用户，
                    共有 {selectedStat.count} 人使用了此表情反应
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * @component UserListSkeleton
 * @description 用户列表骨架屏组件
 */
export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
          </div>
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * @component EmptyUserList
 * @description 空用户列表组件
 */
export function EmptyUserList({ 
  reactionType, 
  message 
}: { 
  reactionType?: string; 
  message?: string; 
}) {
  const config = reactionType ? REACTION_CONFIGS[reactionType as ReactionType] : null;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {config ? (
          <span className="text-2xl" aria-hidden="true">
            {config.emoji}
          </span>
        ) : (
          <Users className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {message || '暂无用户'}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        {config 
          ? `还没有用户使用${config.label}表情反应，成为第一个吧！`
          : '暂时没有用户数据'
        }
      </p>
    </div>
  );
}

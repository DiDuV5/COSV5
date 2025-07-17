/**
 * @component UserSelectorDialog
 * @description 用户选择对话框，用于处理@提及时的用户名冲突
 * @author Augment AI
 * @date 2024-06-08
 * @version 1.0.0
 *
 * @props
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - users: User[] - 候选用户列表
 * - onSelect: (user: User) => void - 用户选择回调
 * - title: string - 对话框标题
 *
 * @example
 * <UserSelectorDialog
 *   open={showSelector}
 *   onOpenChange={setShowSelector}
 *   users={candidateUsers}
 *   onSelect={handleUserSelect}
 *   title="选择要提及的用户"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-06-08: 初始版本创建
 */

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Calendar, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  userLevel: string;
  isVerified: boolean;
  followersCount: number;
  postsCount: number;
  bio: string | null;
  location: string | null;
  website: string | null;
  createdAt: Date;
}

interface UserSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onSelect: (user: User) => void;
  title?: string;
  description?: string;
}

const getUserLevelColor = (userLevel: string) => {
  switch (userLevel) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'CREATOR':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'VIP':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'USER':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getUserLevelLabel = (userLevel: string) => {
  switch (userLevel) {
    case 'ADMIN':
      return '守馆';
    case 'CREATOR':
      return '荣誉';
    case 'VIP':
      return '赞助';
    case 'USER':
      return '入馆';
    case 'GUEST':
      return '访客';
    default:
      return userLevel;
  }
};

export function UserSelectorDialog({
  open,
  onOpenChange,
  users,
  onSelect,
  title = "选择要提及的用户",
  description = "找到多个匹配的用户，请选择您要提及的用户：",
}: UserSelectorDialogProps) {
  const handleUserSelect = (user: User) => {
    onSelect(user);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => handleUserSelect(user)}
            >
              <div className="flex items-start space-x-3">
                {/* 用户头像 */}
                <UnifiedAvatar
                  user={user}
                  size="md"
                  showVerifiedBadge={true}
                />

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.displayName || user.username}
                    </h3>
                    {user.isVerified && (
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getUserLevelColor(user.userLevel))}
                    >
                      {getUserLevelLabel(user.userLevel)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    @{user.username}
                  </p>

                  {user.bio && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {/* 用户统计 */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{user.followersCount} 关注者</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>{user.postsCount} 作品</span>
                    </div>
                    {user.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.website && (
                      <div className="flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>网站</span>
                      </div>
                    )}
                  </div>

                  {/* 注册时间 */}
                  <div className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(user.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })} 加入
                    </span>
                  </div>
                </div>

                {/* 选择按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserSelect(user);
                  }}
                >
                  选择
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 简化版用户选择器，仅显示基本信息
 */
export function SimpleUserSelectorDialog({
  open,
  onOpenChange,
  users,
  onSelect,
  title = "选择用户",
}: UserSelectorDialogProps) {
  const handleUserSelect = (user: User) => {
    onSelect(user);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {users.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
              onClick={() => handleUserSelect(user)}
            >
              <div className="flex items-center space-x-3">
                <UnifiedAvatar
                  user={user}
                  size="sm"
                  showVerifiedBadge={true}
                />
                <div className="text-left">
                  <div className="font-medium">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    @{user.username}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

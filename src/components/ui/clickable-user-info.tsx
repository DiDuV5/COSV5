/**
 * @component ClickableUserInfo
 * @description 可点击的用户信息组件，点击时显示用户名片弹窗
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: UserInfo - 用户基本信息
 * - size?: 'sm' | 'md' | 'lg' - 组件尺寸
 * - showDisplayName?: boolean - 是否显示显示名称
 * - showUsername?: boolean - 是否显示用户名
 * - showAvatar?: boolean - 是否显示头像
 * - layout?: 'horizontal' | 'vertical' - 布局方向
 * - className?: string - 自定义样式类名
 * - onUserClick?: (username: string) => void - 用户点击回调
 *
 * @example
 * <ClickableUserInfo
 *   user={userInfo}
 *   size="md"
 *   showDisplayName={true}
 *   showUsername={true}
 *   showAvatar={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - UserCardDialog component
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React from "react";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { Badge } from "@/components/ui/badge";
import { UserCardDialog, useUserCardDialog } from "@/components/ui/user-card-dialog";
import { cn } from "@/lib/utils";
import { Shield, Crown, Star, Zap } from "lucide-react";
import { USER_LEVELS, getUserLevelIcon } from "@/lib/constants/user-levels";

// 用户基本信息类型
export interface UserInfo {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  userLevel: string;
  isVerified: boolean;
}

// 组件属性类型
export interface ClickableUserInfoProps {
  user: UserInfo;
  size?: 'sm' | 'md' | 'lg';
  showDisplayName?: boolean;
  showUsername?: boolean;
  showAvatar?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  onUserClick?: (username: string) => void;
}

// 用户等级图标映射已移至 @/lib/constants/user-levels

export function ClickableUserInfo({
  user,
  size = 'md',
  showDisplayName = true,
  showUsername = true,
  showAvatar = true,
  layout = 'horizontal',
  className,
  onUserClick,
}: ClickableUserInfoProps) {
  const { isOpen, selectedUsername, openDialog, closeDialog } = useUserCardDialog();
  const userLevel = USER_LEVELS[user.userLevel as keyof typeof USER_LEVELS] || USER_LEVELS.USER;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      avatar: "h-8 w-8",
      text: {
        name: "text-sm font-medium",
        username: "text-xs text-muted-foreground",
      },
      gap: "gap-2",
      badge: "text-xs px-1 py-0",
    },
    md: {
      avatar: "h-10 w-10",
      text: {
        name: "text-base font-semibold",
        username: "text-sm text-muted-foreground",
      },
      gap: "gap-3",
      badge: "text-xs px-2 py-1",
    },
    lg: {
      avatar: "h-12 w-12",
      text: {
        name: "text-lg font-bold",
        username: "text-base text-muted-foreground",
      },
      gap: "gap-4",
      badge: "text-sm px-2 py-1",
    },
  };

  const config = sizeConfig[size];

  // 处理点击事件
  const handleClick = () => {
    if (onUserClick) {
      onUserClick(user.username);
    } else {
      openDialog(user.username);
    }
  };

  // 头像组件
  const avatarElement = showAvatar && (
    <UnifiedAvatar
      user={{
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        userLevel: user.userLevel,
      }}
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm'}
      showVerifiedBadge={true}
      fallbackType="gradient"
      onClick={handleClick}
      className={cn(config.avatar, "cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all")}
    />
  );

  // 文本信息组件
  const textElement = (showDisplayName || showUsername) && (
    <div className={cn(
      "flex-1 min-w-0",
      layout === 'vertical' && "text-center"
    )}>
      {showDisplayName && (
        <div className="flex items-center gap-2 mb-1">
          <h3 
            className={cn(
              config.text.name, 
              "truncate cursor-pointer hover:text-blue-600 transition-colors"
            )}
            onClick={handleClick}
          >
            {user.displayName || user.username}
          </h3>
          
          {/* 用户等级徽章 */}
          <Badge 
            variant="secondary"
            className={config.badge}
            style={{ backgroundColor: userLevel.color + '20', color: userLevel.color }}
          >
            {getUserLevelIcon(user.userLevel)}
            <span className="ml-1">{userLevel.name}</span>
          </Badge>
        </div>
      )}
      
      {showUsername && (
        <p 
          className={cn(
            config.text.username, 
            "truncate cursor-pointer hover:text-blue-600 transition-colors"
          )}
          onClick={handleClick}
        >
          @{user.username}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className={cn(
        "flex items-center",
        layout === 'horizontal' ? config.gap : "flex-col gap-2",
        className
      )}>
        {avatarElement}
        {textElement}
      </div>

      {/* 用户名片弹窗 */}
      <UserCardDialog
        username={selectedUsername}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      />
    </>
  );
}

// 便捷的预设组件

// 作者信息组件（用于帖子详情页）
export function AuthorInfo({ user, className }: { user: UserInfo; className?: string }) {
  return (
    <ClickableUserInfo
      user={user}
      size="md"
      showDisplayName={true}
      showUsername={false}
      showAvatar={true}
      layout="horizontal"
      className={className}
    />
  );
}

// 评论者信息组件（用于评论区）
export function CommenterInfo({ user, className }: { user: UserInfo; className?: string }) {
  return (
    <ClickableUserInfo
      user={user}
      size="sm"
      showDisplayName={true}
      showUsername={true}
      showAvatar={true}
      layout="horizontal"
      className={className}
    />
  );
}

// 紧凑用户信息组件（用于列表）
export function CompactUserInfo({ user, className }: { user: UserInfo; className?: string }) {
  return (
    <ClickableUserInfo
      user={user}
      size="sm"
      showDisplayName={true}
      showUsername={false}
      showAvatar={true}
      layout="horizontal"
      className={className}
    />
  );
}

// 垂直用户信息组件（用于卡片）
export function VerticalUserInfo({ user, className }: { user: UserInfo; className?: string }) {
  return (
    <ClickableUserInfo
      user={user}
      size="lg"
      showDisplayName={true}
      showUsername={true}
      showAvatar={true}
      layout="vertical"
      className={className}
    />
  );
}

/**
 * @component UnifiedAvatar
 * @description 统一的用户头像组件，解决头像显示不一致问题
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @props
 * - user: UserAvatarData - 用户头像数据
 * - size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' - 头像尺寸
 * - className?: string - 自定义样式类名
 * - showVerifiedBadge?: boolean - 是否显示验证徽章
 * - fallbackType?: 'initials' | 'icon' | 'gradient' - fallback类型
 * - onClick?: () => void - 点击事件
 * - loading?: boolean - 是否显示加载状态
 *
 * @example
 * <UnifiedAvatar
 *   user={userData}
 *   size="md"
 *   showVerifiedBadge={true}
 *   fallbackType="gradient"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - @radix-ui/react-avatar
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，统一头像显示逻辑
 */

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Shield, User, Loader2 } from "lucide-react";

// 用户头像数据类型
export interface UserAvatarData {
  id?: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  userLevel?: string;
}

// 头像尺寸配置
const AVATAR_SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8", 
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
} as const;

// 验证徽章尺寸配置
const BADGE_SIZES = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4", 
  xl: "h-5 w-5",
} as const;

// 组件属性类型
export interface UnifiedAvatarProps {
  user: UserAvatarData;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
  showVerifiedBadge?: boolean;
  fallbackType?: 'initials' | 'icon' | 'gradient';
  onClick?: () => void;
  loading?: boolean;
}

/**
 * 统一头像组件 - 解决头像显示不一致问题
 */
export function UnifiedAvatar({
  user,
  size = 'md',
  className,
  showVerifiedBadge = true,
  fallbackType = 'gradient',
  onClick,
  loading = false,
}: UnifiedAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 处理图片加载错误
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // 处理图片加载成功
  const handleImageLoad = useCallback(() => {
    setImageError(false);
    setImageLoading(false);
  }, []);

  // 获取显示名称
  const getDisplayName = useCallback(() => {
    return user.displayName || user.username || "用户";
  }, [user.displayName, user.username]);

  // 获取头像URL（统一处理逻辑）
  const getAvatarUrl = useCallback(() => {
    if (!user.avatarUrl || imageError) return null;
    
    // 处理相对路径
    if (user.avatarUrl.startsWith('/')) {
      return user.avatarUrl;
    }
    
    // 处理外部URL
    if (user.avatarUrl.startsWith('http')) {
      return user.avatarUrl;
    }
    
    // 处理其他情况，使用R2存储URL
    const baseUrl = process.env.COSEREEDEN_NEXT_PUBLIC_R2_PUBLIC_URL || 'https://cc.tutu365.cc';
    return `${baseUrl}/avatars/${user.avatarUrl}`;
  }, [user.avatarUrl, imageError]);

  // 获取fallback内容
  const getFallbackContent = useCallback(() => {
    const displayName = getDisplayName();
    
    switch (fallbackType) {
      case 'icon':
        return <User className={cn("text-muted-foreground", size === 'xs' ? "h-3 w-3" : size === 'sm' ? "h-4 w-4" : "h-5 w-5")} />;
      
      case 'initials':
        return (
          <span className={cn(
            "font-semibold text-white",
            size === 'xs' ? "text-xs" : size === 'sm' ? "text-xs" : size === 'md' ? "text-sm" : "text-lg"
          )}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        );
      
      case 'gradient':
      default:
        return (
          <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className={cn(
              "font-semibold text-white",
              size === 'xs' ? "text-xs" : size === 'sm' ? "text-xs" : size === 'md' ? "text-sm" : "text-lg"
            )}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        );
    }
  }, [fallbackType, getDisplayName, size]);

  const avatarUrl = getAvatarUrl();

  return (
    <div className="relative flex-shrink-0">
      <Avatar
        className={cn(
          AVATAR_SIZES[size],
          onClick && "cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all",
          className
        )}
        onClick={onClick}
      >
        {/* 加载状态 */}
        {(loading || imageLoading) && avatarUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* 头像图片 */}
        {avatarUrl && !imageError && (
          <Image
            src={avatarUrl}
            alt={`${getDisplayName()}的头像`}
            fill
            className="object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized={avatarUrl.includes('dicebear.com')} // SVG头像不需要优化
          />
        )}
        
        {/* Fallback */}
        <AvatarFallback className={cn(
          fallbackType === 'gradient' ? "bg-transparent p-0" : "bg-muted"
        )}>
          {getFallbackContent()}
        </AvatarFallback>
      </Avatar>

      {/* 验证徽章 */}
      {showVerifiedBadge && user.isVerified && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 ring-2 ring-white dark:ring-gray-900",
          size === 'xs' && "-bottom-0 -right-0 p-0.5",
          size === 'xl' && "-bottom-1 -right-1 p-1"
        )}>
          <Shield className={cn("text-white", BADGE_SIZES[size])} />
        </div>
      )}
    </div>
  );
}

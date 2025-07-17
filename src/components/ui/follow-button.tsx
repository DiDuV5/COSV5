/**
 * @component FollowButton
 * @description 独立的关注按钮组件，可在多个场景中复用
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - userId: string - 目标用户ID
 * - initialFollowState?: boolean - 初始关注状态
 * - size?: 'sm' | 'md' | 'lg' - 按钮尺寸
 * - variant?: 'default' | 'outline' | 'ghost' - 按钮变体
 * - className?: string - 自定义样式类名
 * - onFollowChange?: (isFollowing: boolean) => void - 关注状态变化回调
 *
 * @example
 * <FollowButton
 *   userId="user123"
 *   size="md"
 *   onFollowChange={(isFollowing) => console.log('关注状态:', isFollowing)}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - NextAuth.js
 * - tRPC API
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

// 组件属性类型
export interface FollowButtonProps {
  userId: string;
  initialFollowState?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

// 尺寸配置
const sizeConfig = {
  sm: {
    button: "h-8 px-3 text-xs",
    icon: "h-3 w-3",
  },
  md: {
    button: "h-10 px-4 text-sm",
    icon: "h-4 w-4",
  },
  lg: {
    button: "h-11 px-6 text-base",
    icon: "h-5 w-5",
  },
};

export function FollowButton({
  userId,
  initialFollowState = false,
  size = 'md',
  variant = 'default',
  className,
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [isPending, setIsLoading] = useState(false);
  const utils = api.useUtils();

  const config = sizeConfig[size];

  // 检查关注状态
  const { data: followingStatus } = api.user.isFollowing.useQuery(
    { userId },
    {
      enabled: !!session?.user && !!userId && userId !== session.user.id,
    }
  );

  // 同步关注状态
  useEffect(() => {
    if (followingStatus !== undefined) {
      setIsFollowing(followingStatus);
    }
  }, [followingStatus]);

  // 关注/取消关注
  const followMutation = api.user.follow.follow.useMutation({
    onSuccess: () => {
      setIsFollowing(true);
      setIsLoading(false);
      onFollowChange?.(true);
      // 重新获取关注状态
      utils.user.isFollowing.invalidate({ userId });
    },
    onError: (error: any) => {
      console.error('关注失败:', error);
      setIsLoading(false);
    },
  });

  const unfollowMutation = api.user.follow.unfollow.useMutation({
    onSuccess: () => {
      setIsFollowing(false);
      setIsLoading(false);
      onFollowChange?.(false);
      // 重新获取关注状态
      utils.user.isFollowing.invalidate({ userId });
    },
    onError: (error: any) => {
      console.error('取消关注失败:', error);
      setIsLoading(false);
    },
  });

  // 处理关注/取消关注
  const handleFollowToggle = () => {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    // 防止重复点击
    if (isPending || followMutation.isPending || unfollowMutation.isPending) {
      return;
    }

    setIsLoading(true);
    
    if (isFollowing) {
      unfollowMutation.mutate({ userId });
    } else {
      followMutation.mutate({ userId });
    }
  };

  // 如果是自己，不显示关注按钮
  if (session?.user?.id === userId) {
    return null;
  }

  // 如果未登录，显示登录提示按钮
  if (!session?.user) {
    return (
      <Button
        onClick={() => router.push("/auth/signin")}
        variant={variant}
        className={cn(
          config.button,
          "font-medium transition-all duration-200 hover:scale-[1.02]",
          "bg-blue-600 hover:bg-blue-700 text-white",
          className
        )}
      >
        <UserPlus className={cn(config.icon, "mr-2")} />
        登录后关注
      </Button>
    );
  }

  const isOperationLoading = isPending || followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      onClick={handleFollowToggle}
      disabled={isOperationLoading}
      variant={isFollowing ? "outline" : variant}
      className={cn(
        config.button,
        "font-medium transition-all duration-200 hover:scale-[1.02]",
        isFollowing 
          ? "border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400" 
          : "bg-green-600 hover:bg-green-700 text-white",
        className
      )}
    >
      {isOperationLoading ? (
        <div className="flex items-center gap-2">
          <div className={cn(
            config.icon,
            "border-2 border-current border-t-transparent rounded-full animate-spin"
          )} />
          {isFollowing ? "取消中..." : "关注中..."}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isFollowing ? (
            <>
              <UserMinus className={config.icon} />
              取消关注
            </>
          ) : (
            <>
              <UserPlus className={config.icon} />
              关注
            </>
          )}
        </div>
      )}
    </Button>
  );
}

// 便捷的关注按钮变体
export function SmallFollowButton(props: Omit<FollowButtonProps, 'size'>) {
  return <FollowButton {...props} size="sm" />;
}

export function LargeFollowButton(props: Omit<FollowButtonProps, 'size'>) {
  return <FollowButton {...props} size="lg" />;
}

export function OutlineFollowButton(props: Omit<FollowButtonProps, 'variant'>) {
  return <FollowButton {...props} variant="outline" />;
}

export function GhostFollowButton(props: Omit<FollowButtonProps, 'variant'>) {
  return <FollowButton {...props} variant="ghost" />;
}

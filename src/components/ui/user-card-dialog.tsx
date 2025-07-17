/**
 * @component UserCardDialog
 * @description 用户名片弹窗组件，用于显示用户详细信息
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - username: string - 用户名（用于获取用户信息）
 * - open: boolean - 弹窗是否打开
 * - onOpenChange: (open: boolean) => void - 弹窗状态变化回调
 * - trigger?: React.ReactNode - 触发弹窗的元素
 *
 * @example
 * <UserCardDialog
 *   username="sakura_cosplay"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - tRPC API
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { UserCard, type UserCardData } from '@/components/ui/user-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, AlertCircle, UserPlus, UserMinus } from 'lucide-react';
import { api } from '@/trpc/react';

// 组件属性类型
export interface UserCardDialogProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

// 加载状态组件
const UserCardSkeleton = () => (
  <div className='space-y-4'>
    <div className='flex items-start gap-4'>
      <Skeleton className='h-16 w-16 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-4 w-48' />
      </div>
    </div>
    <div className='flex gap-4'>
      <Skeleton className='h-4 w-16' />
      <Skeleton className='h-4 w-16' />
      <Skeleton className='h-4 w-16' />
    </div>
    <div className='flex gap-2'>
      <Skeleton className='h-6 w-6 rounded-full' />
      <Skeleton className='h-6 w-6 rounded-full' />
      <Skeleton className='h-6 w-6 rounded-full' />
    </div>
  </div>
);

// 错误状态组件
const UserCardError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className='space-y-4'>
    <Alert variant='destructive'>
      <AlertCircle className='h-4 w-4' />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
    <div className='flex justify-center'>
      <Button variant='outline' onClick={onRetry}>
        重试
      </Button>
    </div>
  </div>
);

export function UserCardDialog({ username, open, onOpenChange, trigger }: UserCardDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 获取用户信息
  const {
    data: user,
    isPending,
    error,
    refetch,
  } = api.user.getByUsername.useQuery(
    { username },
    {
      enabled: open && !!username,
      retry: 1,
    }
  );

  // 检查关注状态
  const { data: followingStatus } = (api.user as any).isFollowing?.useQuery(
    { userId: user?.id || '' },
    {
      enabled: !!session?.user && !!user?.id && user.id !== session.user.id,
    }
  ) || { data: false };

  // 同步关注状态
  useEffect(() => {
    if (followingStatus !== undefined) {
      setIsFollowing(followingStatus);
    }
  }, [followingStatus]);

  // 关注/取消关注
  const followMutation = (api.user as any).follow?.useMutation({
    onSuccess: () => {
      setIsFollowing(true);
      setIsFollowLoading(false);
      // 重新获取关注状态
      (api.user as any).isFollowing?.invalidate({ userId: user?.id || '' });
    },
    onError: (error: any) => {
      console.error('关注失败:', error);
      setIsFollowLoading(false);
    },
  }) || { mutate: () => {}, isPending: false };

  const unfollowMutation = (api.user as any).unfollow?.useMutation({
    onSuccess: () => {
      setIsFollowing(false);
      setIsFollowLoading(false);
      // 重新获取关注状态
      (api.user as any).isFollowing?.invalidate({ userId: user?.id || '' });
    },
    onError: (error: any) => {
      console.error('取消关注失败:', error);
      setIsFollowLoading(false);
    },
  }) || { mutate: () => {}, isPending: false };

  // 处理跳转到用户主页
  const handleNavigateToProfile = () => {
    setIsNavigating(true);
    onOpenChange(false);
    router.push(`/users/${username}`);
    // 重置导航状态
    setTimeout(() => setIsNavigating(false), 1000);
  };

  // 处理关注/取消关注
  const handleFollowToggle = () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!user?.id) return;

    // 防止重复点击
    if (isFollowLoading || followMutation.isPending || unfollowMutation.isPending) {
      return;
    }

    setIsFollowLoading(true);

    if (isFollowing) {
      unfollowMutation.mutate({ userId: user.id });
    } else {
      followMutation.mutate({ userId: user.id });
    }
  };

  // 转换用户数据格式
  const userCardData: UserCardData | null = user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        userLevel: user.userLevel,
        isVerified: user.isVerified,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        likeCount: user.likeCount,
        postsCount: user.postsCount,
        socialLinks:
          user.socialLinks?.map(link => ({
            platform: link.platform,
            username: link.username,
            url: link.url,
            isPublic: true,
          })) || [],
      }
    : null;

  const dialogContent = (
    <DialogContent className='max-w-lg border-0 shadow-xl p-0'>
      {/* 完全移除标题区域，创建更简洁的布局，右上角保留默认关闭按钮 */}
      <div className='p-6 pt-12'>
        {isPending && <UserCardSkeleton />}

        {error && (
          <UserCardError message={error.message || '获取用户信息失败'} onRetry={() => refetch()} />
        )}

        {userCardData && !isPending && !error && (
          <div className='space-y-6'>
            {/* 用户名片组件 - 优化视觉效果 */}
            <UserCard
              user={userCardData}
              size='md'
              variant='default'
              showSocialLinks={true}
              showStats={true}
              clickable={false}
              className='border-0 shadow-none bg-transparent p-0'
            />

            {/* 操作按钮区域 - 查看主页和关注按钮 */}
            <div className='flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800'>
              {/* 关注按钮 - 仅在登录且不是自己时显示 */}
              {session?.user && user?.id !== session.user.id && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={
                    isFollowLoading || followMutation.isPending || unfollowMutation.isPending
                  }
                  variant={isFollowing ? 'outline' : 'default'}
                  className={`flex-1 h-11 font-medium transition-all duration-200 hover:scale-[1.02] ${
                    isFollowing
                      ? 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isFollowLoading || followMutation.isPending || unfollowMutation.isPending ? (
                    <div className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                      {isFollowing ? '取消中...' : '关注中...'}
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      {isFollowing ? (
                        <>
                          <UserMinus className='h-4 w-4' />
                          取消关注
                        </>
                      ) : (
                        <>
                          <UserPlus className='h-4 w-4' />
                          关注
                        </>
                      )}
                    </div>
                  )}
                </Button>
              )}

              {/* 查看主页按钮 */}
              <Button
                onClick={handleNavigateToProfile}
                disabled={isNavigating}
                variant='outline'
                className={`${
                  session?.user && user?.id !== session.user.id ? 'flex-1' : 'w-full'
                } h-11 font-medium transition-all duration-200 hover:scale-[1.02] border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400`}
              >
                {isNavigating ? (
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                    跳转中...
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <ExternalLink className='h-4 w-4' />
                    查看主页
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );

  // 如果有触发器，使用 DialogTrigger
  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // 否则只返回受控的 Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  );
}

// 便捷的 Hook 用于管理弹窗状态
export function useUserCardDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string>('');

  const openDialog = (username: string) => {
    setSelectedUsername(username);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    // 延迟清除用户名，避免在关闭动画期间清除数据
    setTimeout(() => setSelectedUsername(''), 300);
  };

  return {
    isOpen,
    selectedUsername,
    openDialog,
    closeDialog,
    setIsOpen,
  };
}

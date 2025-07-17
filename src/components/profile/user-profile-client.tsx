/**
 * @component UserProfileClient
 * @description 用户个人主页客户端组件，处理交互功能和访客记录
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: UserProfile - 用户信息
 * - isOwnProfile: boolean - 是否为用户自己的主页
 * - currentUserId?: string - 当前登录用户ID
 *
 * @example
 * <UserProfileClient
 *   user={userProfile}
 *   isOwnProfile={false}
 *   currentUserId="user123"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC client
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UserProfileCard } from '@/components/profile/user-profile-card';
import { SocialLinks } from '@/components/profile/social-links';
import { VisitorHistory } from '@/components/profile/visitor-history';
import { UserContentTabs } from '@/components/profile/user-content-tabs';
import { api } from '@/trpc/react';
import { type UserProfile } from '@/types/profile';

interface UserProfileClientProps {
  user: UserProfile;
  isOwnProfile: boolean;
  currentUserId?: string;
}

export function UserProfileClient({ user, isOwnProfile, currentUserId }: UserProfileClientProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsLoading] = useState(false);
  const utils = api.useUtils();

  // 记录访客访问
  const recordVisitMutation = api.profile.recordVisit.useMutation();

  // 检查关注状态
  const { data: followingStatus } = api.user.follow.isFollowing.useQuery(
    { userId: user.id },
    {
      enabled: !!currentUserId && !isOwnProfile,
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
      // 重新获取关注状态
      utils.user.follow.isFollowing.invalidate({ userId: user.id });
      router.refresh(); // 刷新页面数据
    },
    onError: (error: any) => {
      console.error('关注失败:', error);
      setIsLoading(false);
    },
  });

  // 暂时禁用unfollow功能，使用空的mutation对象
  const unfollowMutation = {
    mutate: (input: { userId: string }) => {
      console.log('取消关注功能暂时禁用:', input);
      setIsLoading(false);
    },
    isPending: false,
  };

  // 记录访问 - 暂时禁用以避免无限循环
  useEffect(() => {
    if (!isOwnProfile) {
      // TODO: 修复访客记录无限循环问题后重新启用
      console.log('访客记录功能暂时禁用');
      // const userAgent = navigator.userAgent;
      // recordVisitMutation.mutate({
      //   profileId: user.id,
      //   userAgent,
      //   // visitorIp 应该从服务端获取，这里暂时不传
      // });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isOwnProfile]);

  const handleFollow = () => {
    if (!currentUserId) {
      router.push('/auth/signin');
      return;
    }

    // 防止重复点击
    if (isPending || followMutation.isPending) {
      return;
    }

    setIsLoading(true);
    followMutation.mutate({ userId: user.id });
  };

  const handleUnfollow = () => {
    // 防止重复点击
    if (isPending || unfollowMutation.isPending) {
      return;
    }

    setIsLoading(true);
    unfollowMutation.mutate({ userId: user.id });
  };

  return (
    <div className='space-y-6'>
      {/* 用户信息卡片 */}
      <UserProfileCard
        user={user}
        isOwnProfile={isOwnProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        isFollowing={isFollowing}
        isPending={isPending}
      />

      {/* 主要内容区域 */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* 左侧主要内容 */}
        <div className='lg:col-span-2 space-y-6'>
          {/* 用户内容标签页 */}
          <UserContentTabs userId={user.id} username={user.username} isOwnProfile={isOwnProfile} />
        </div>

        {/* 右侧边栏 */}
        <div className='space-y-6'>
          {/* 社交链接 */}
          {(user.showSocialLinks || isOwnProfile) && (
            <SocialLinks userId={user.id} isOwnProfile={isOwnProfile} />
          )}

          {/* 访客记录 - 仅用户本人可见 */}
          {isOwnProfile && user.showVisitorHistory && (
            <VisitorHistory profileId={user.id} isOwnProfile={isOwnProfile} />
          )}

          {/* 用户统计信息卡片 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6'>
            <h3 className='font-semibold text-lg mb-4'>统计信息</h3>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>作品数量</span>
                <span className='font-medium'>{user.postsCount}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>获赞总数</span>
                <span className='font-medium'>{user.likeCount}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>关注数量</span>
                <span className='font-medium'>{user.followingCount}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>粉丝数量</span>
                <span className='font-medium'>{user.followersCount}</span>
              </div>
              {user.points > 0 && (
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>积分</span>
                  <span className='font-medium text-yellow-600'>{user.points}</span>
                </div>
              )}
            </div>
          </div>

          {/* 加入时间 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6'>
            <h3 className='font-semibold text-lg mb-4'>用户信息</h3>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>加入时间</span>
                <span className='font-medium'>
                  {new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(user.createdAt))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>用户等级</span>
                <span className='font-medium'>{user.userLevel}</span>
              </div>
              {user.isVerified && (
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>认证状态</span>
                  <span className='font-medium text-blue-600'>已认证</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

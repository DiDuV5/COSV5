/**
 * @component UserProfileCard
 * @description 用户个人信息展示卡片组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: UserProfile - 用户信息
 * - isOwnProfile: boolean - 是否为用户自己的主页
 * - onFollow?: () => void - 关注按钮点击回调
 * - onUnfollow?: () => void - 取消关注按钮点击回调
 * - isFollowing?: boolean - 是否已关注
 * - isPending?: boolean - 加载状态
 *
 * @example
 * <UserProfileCard
 *   user={userProfile}
 *   isOwnProfile={false}
 *   onFollow={handleFollow}
 *   isFollowing={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  MapPin,
  Globe,
  Calendar,
  Settings,
  UserPlus,
  UserMinus,
  Shield,
  Crown,
  Star,
  Heart,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/types/profile';
import { USER_LEVELS } from '@/lib/constants/user-levels';
import { formatNumber } from '@/lib/utils';

interface UserProfileCardProps {
  user: UserProfile;
  isOwnProfile: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  isFollowing?: boolean;
  isPending?: boolean;
}

export function UserProfileCard({
  user,
  isOwnProfile,
  onFollow,
  onUnfollow,
  isFollowing = false,
  isPending = false,
}: UserProfileCardProps) {
  const [imageError, setImageError] = useState(false);

  const userLevel = USER_LEVELS[user.userLevel as keyof typeof USER_LEVELS] || USER_LEVELS.USER;

  const handleFollowClick = () => {
    if (isFollowing) {
      onUnfollow?.();
    } else {
      onFollow?.();
    }
  };

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
    }).format(new Date(date));
  };

  return (
    <Card className='w-full'>
      {/* 横幅图片 */}
      {user.bannerUrl && (
        <div className='relative h-32 md:h-48 overflow-hidden rounded-t-lg'>
          <Image
            src={user.bannerUrl}
            alt='用户横幅'
            fill
            className='object-cover'
            onError={() => setImageError(true)}
          />
        </div>
      )}

      <CardContent className='p-4 md:p-6'>
        {/* 移动端紧凑布局 */}
        <div className='block md:hidden'>
          <div className='flex items-start gap-3'>
            {/* 头像 */}
            <div className='flex-shrink-0'>
              <UnifiedAvatar
                user={{
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  isVerified: user.isVerified,
                  userLevel: user.userLevel,
                }}
                size='lg'
                showVerifiedBadge={true}
                fallbackType='gradient'
                className='border-4 border-background'
              />
            </div>

            {/* 用户信息 */}
            <div className='flex-1 min-w-0'>
              {/* 姓名和用户名 */}
              <div className='text-left'>
                <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100 truncate'>
                  {user.displayName || user.username}
                </h1>
                <p className='text-gray-500 dark:text-gray-400 text-sm'>@{user.username}</p>
              </div>

              {/* 用户等级徽章 */}
              <Badge
                variant='secondary'
                className='mt-1 text-xs'
                style={{ backgroundColor: userLevel.color + '20', color: userLevel.color }}
              >
                {(userLevel.name === '守馆' || userLevel.name === '超级管理员') && (
                  <Crown className='h-3 w-3 mr-1' />
                )}
                {userLevel.name === '荣誉' && <Star className='h-3 w-3 mr-1' />}
                {userLevel.name}
              </Badge>

              {/* 加入时间 */}
              <div className='flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400'>
                <Calendar className='h-3 w-3' />
                <span>{formatJoinDate(user.createdAt)} 加入</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className='flex-shrink-0'>
              {isOwnProfile ? (
                <Link href='/settings/profile'>
                  <Button variant='outline' size='sm'>
                    <Settings className='h-4 w-4' />
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={handleFollowClick}
                  disabled={isPending}
                  variant={isFollowing ? 'outline' : 'default'}
                  size='sm'
                >
                  {isPending ? (
                    '...'
                  ) : isFollowing ? (
                    <UserMinus className='h-4 w-4' />
                  ) : (
                    <UserPlus className='h-4 w-4' />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 个人简介 */}
          {user.bio && (
            <p className='text-gray-700 dark:text-gray-300 text-sm mt-3 text-left'>{user.bio}</p>
          )}

          {/* 位置和网站 */}
          <div className='flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400'>
            {user.location && (
              <div className='flex items-center gap-1'>
                <MapPin className='h-3 w-3' />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <div className='flex items-center gap-1'>
                <Globe className='h-3 w-3' />
                <Link
                  href={user.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-500 hover:text-blue-600 hover:underline'
                >
                  网站链接
                </Link>
              </div>
            )}
          </div>

          {/* 统计数据 */}
          <div className='flex gap-4 mt-3 text-left'>
            <Link
              href={`/users/${user.username}/posts`}
              className='hover:text-blue-500 transition-colors'
            >
              <div className='font-semibold text-sm'>{formatNumber(user.postsCount)}</div>
              <div className='text-xs text-gray-500'>作品</div>
            </Link>

            <Link
              href={`/users/${user.username}/following`}
              className='hover:text-blue-500 transition-colors'
            >
              <div className='font-semibold text-sm'>{formatNumber(user.followingCount)}</div>
              <div className='text-xs text-gray-500'>关注</div>
            </Link>

            <Link
              href={`/users/${user.username}/followers`}
              className='hover:text-blue-500 transition-colors'
            >
              <div className='font-semibold text-sm'>{formatNumber(user.followersCount)}</div>
              <div className='text-xs text-gray-500'>粉丝</div>
            </Link>

            <div>
              <div className='font-semibold text-sm flex items-center gap-1'>
                <Heart className='h-3 w-3 text-red-500' />
                {formatNumber(user.likeCount)}
              </div>
              <div className='text-xs text-gray-500'>获赞</div>
            </div>

            {/* 积分显示（为后续功能预留） */}
            {user.points > 0 && (
              <div>
                <div className='font-semibold text-sm text-yellow-500'>
                  {formatNumber(user.points)}
                </div>
                <div className='text-xs text-gray-500'>积分</div>
              </div>
            )}
          </div>
        </div>

        {/* 桌面端布局 */}
        <div className='hidden md:flex gap-4'>
          {/* 头像区域 */}
          <div className='flex flex-col items-start'>
            <UnifiedAvatar
              user={{
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                isVerified: user.isVerified,
                userLevel: user.userLevel,
              }}
              size='xl'
              showVerifiedBadge={true}
              fallbackType='gradient'
              className='border-4 border-background'
            />

            {/* 用户等级徽章 */}
            <Badge
              variant='secondary'
              className='mt-2'
              style={{ backgroundColor: userLevel.color + '20', color: userLevel.color }}
            >
              {(userLevel.name === '守馆' || userLevel.name === '超级管理员') && (
                <Crown className='h-3 w-3 mr-1' />
              )}
              {userLevel.name === '荣誉' && <Star className='h-3 w-3 mr-1' />}
              {userLevel.name}
            </Badge>
          </div>

          {/* 用户信息区域 */}
          <div className='flex-1 space-y-3'>
            {/* 姓名和用户名 */}
            <div className='text-left'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {user.displayName || user.username}
              </h1>
              <p className='text-gray-500 dark:text-gray-400'>@{user.username}</p>
            </div>

            {/* 个人简介 */}
            {user.bio && <p className='text-gray-700 dark:text-gray-300 text-left'>{user.bio}</p>}

            {/* 位置和网站 */}
            <div className='flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400'>
              {user.location && (
                <div className='flex items-center gap-1'>
                  <MapPin className='h-4 w-4' />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className='flex items-center gap-1'>
                  <Globe className='h-4 w-4' />
                  <Link
                    href={user.website}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-500 hover:text-blue-600 hover:underline'
                  >
                    网站链接
                  </Link>
                </div>
              )}
              <div className='flex items-center gap-1'>
                <Calendar className='h-4 w-4' />
                <span>{formatJoinDate(user.createdAt)} 加入</span>
              </div>
            </div>

            {/* 统计数据 */}
            <div className='flex flex-wrap gap-6'>
              <Link
                href={`/users/${user.username}/posts`}
                className='text-center hover:text-blue-500 transition-colors'
              >
                <div className='font-semibold text-lg'>{formatNumber(user.postsCount)}</div>
                <div className='text-sm text-gray-500'>作品</div>
              </Link>

              <Link
                href={`/users/${user.username}/following`}
                className='text-center hover:text-blue-500 transition-colors'
              >
                <div className='font-semibold text-lg'>{formatNumber(user.followingCount)}</div>
                <div className='text-sm text-gray-500'>关注</div>
              </Link>

              <Link
                href={`/users/${user.username}/followers`}
                className='text-center hover:text-blue-500 transition-colors'
              >
                <div className='font-semibold text-lg'>{formatNumber(user.followersCount)}</div>
                <div className='text-sm text-gray-500'>粉丝</div>
              </Link>

              <div className='text-center'>
                <div className='font-semibold text-lg flex items-center justify-center gap-1'>
                  <Heart className='h-4 w-4 text-red-500' />
                  {formatNumber(user.likeCount)}
                </div>
                <div className='text-sm text-gray-500'>获赞</div>
              </div>

              {/* 积分显示（为后续功能预留） */}
              {user.points > 0 && (
                <div className='text-center'>
                  <div className='font-semibold text-lg text-yellow-500'>
                    {formatNumber(user.points)}
                  </div>
                  <div className='text-sm text-gray-500'>积分</div>
                </div>
              )}
            </div>
          </div>

          {/* 桌面端操作按钮区域 */}
          <div className='flex flex-col gap-2 w-auto'>
            {isOwnProfile ? (
              <Link href='/settings/profile'>
                <Button variant='outline' className='w-auto'>
                  <Settings className='h-4 w-4 mr-2' />
                  编辑资料
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleFollowClick}
                disabled={isPending}
                variant={isFollowing ? 'outline' : 'default'}
                className='w-auto'
              >
                {isPending ? (
                  '处理中...'
                ) : isFollowing ? (
                  <>
                    <UserMinus className='h-4 w-4 mr-2' />
                    取消关注
                  </>
                ) : (
                  <>
                    <UserPlus className='h-4 w-4 mr-2' />
                    关注
                  </>
                )}
              </Button>
            )}

            {/* 消息按钮（为后续功能预留） */}
            {!isOwnProfile && user.allowDirectMessages !== 'NONE' && (
              <Button variant='outline' className='w-auto' disabled>
                <User className='h-4 w-4 mr-2' />
                发消息
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

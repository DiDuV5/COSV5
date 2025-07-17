/**
 * @component UserCard
 * @description 通用的用户名片组件，用于在多个场景下展示用户基本信息
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: UserCardData - 用户基本信息
 * - size?: 'sm' | 'md' | 'lg' - 卡片尺寸
 * - variant?: 'default' | 'compact' | 'detailed' - 显示变体
 * - showSocialLinks?: boolean - 是否显示社交链接
 * - showStats?: boolean - 是否显示统计数据
 * - clickable?: boolean - 是否可点击跳转
 * - className?: string - 自定义样式类名
 * - onClick?: () => void - 自定义点击事件
 *
 * @example
 * <UserCard
 *   user={userData}
 *   size="md"
 *   variant="default"
 *   showSocialLinks={true}
 *   showStats={true}
 *   clickable={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - lucide-react icons
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Users, Heart, ExternalLink, Star, Crown, Zap } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SOCIAL_PLATFORMS } from '@/types/profile';
import { USER_LEVELS, getUserLevelIcon } from '@/lib/constants/user-levels';

// 用户名片数据类型
export interface UserCardData {
  id: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  userLevel: string;
  isVerified: boolean;
  followersCount?: number;
  followingCount?: number;
  likeCount?: number;
  postsCount?: number;
  socialLinks?: Array<{
    platform: string;
    username: string;
    url: string;
    isPublic: boolean;
  }>;
}

// 组件属性类型
export interface UserCardProps {
  user: UserCardData;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  showSocialLinks?: boolean;
  showStats?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
}

// 用户等级图标映射已移至 @/lib/constants/user-levels

// 社交平台图标组件 - 优化视觉效果
const SocialIcon: React.FC<{ platform: string; url: string; username: string }> = ({
  platform,
  url,
  username,
}) => {
  const config = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
  if (!config) return null;

  return (
    <Link
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold hover:scale-110 hover:shadow-lg transition-all duration-200 ring-2 ring-white dark:ring-gray-900'
      style={{ backgroundColor: config.color }}
      title={`${config.name}: @${username}`}
    >
      {config.name.charAt(0)}
    </Link>
  );
};

export function UserCard({
  user,
  size = 'md',
  variant = 'default',
  showSocialLinks = true,
  showStats = true,
  clickable = true,
  className,
  onClick,
}: UserCardProps) {
  const userLevel = USER_LEVELS[user.userLevel as keyof typeof USER_LEVELS] || USER_LEVELS.USER;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      avatar: 'h-10 w-10',
      card: 'p-3',
      text: {
        name: 'text-sm font-medium',
        username: 'text-xs text-muted-foreground',
        bio: 'text-xs text-muted-foreground',
        stats: 'text-xs',
      },
    },
    md: {
      avatar: 'h-12 w-12',
      card: 'p-4',
      text: {
        name: 'text-base font-semibold',
        username: 'text-sm text-muted-foreground',
        bio: 'text-sm text-muted-foreground',
        stats: 'text-sm',
      },
    },
    lg: {
      avatar: 'h-16 w-16',
      card: 'p-6',
      text: {
        name: 'text-lg font-bold',
        username: 'text-base text-muted-foreground',
        bio: 'text-base text-muted-foreground',
        stats: 'text-base',
      },
    },
  };

  const config = sizeConfig[size];

  // 处理点击事件
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable) {
      window.location.href = `/users/${user.username}`;
    }
  };

  // 统计数据
  const stats = [
    { label: '关注', value: user.followingCount || 0 },
    { label: '粉丝', value: user.followersCount || 0 },
    { label: '获赞', value: user.likeCount || 0 },
  ];

  const cardContent = (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out',
        clickable && 'hover:shadow-lg hover:scale-[1.02] cursor-pointer',
        className
      )}
    >
      <CardContent className={cn(config.card, 'relative')}>
        {variant === 'compact' ? (
          // 紧凑布局 - 优化间距和对齐
          <div className='flex items-center gap-4'>
            <div onClick={clickable ? handleClick : undefined} className='cursor-pointer'>
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
                fallbackType='gradient'
                className={cn('ring-2 ring-gray-100 dark:ring-gray-800')}
              />
            </div>

            <div className='flex-1 min-w-0 space-y-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h3 className={cn(config.text.name, 'truncate text-gray-900 dark:text-gray-100')}>
                  {user.displayName || user.username}
                </h3>

                {/* 用户等级徽章 - 优化样式 */}
                <Badge
                  variant='secondary'
                  className='text-xs px-2 py-1 font-medium border-0'
                  style={{
                    backgroundColor: userLevel.color + '15',
                    color: userLevel.color,
                    boxShadow: `0 0 0 1px ${userLevel.color}20`,
                  }}
                >
                  {getUserLevelIcon(user.userLevel)}
                  <span className='ml-1'>{userLevel.name}</span>
                </Badge>
              </div>

              <p className={cn(config.text.username, 'truncate text-gray-600 dark:text-gray-400')}>
                @{user.username}
              </p>
            </div>

            {/* 社交链接 - 优化布局 */}
            {showSocialLinks && user.socialLinks && user.socialLinks.length > 0 && (
              <div className='flex gap-1.5 flex-shrink-0'>
                {user.socialLinks.slice(0, 3).map(link => (
                  <SocialIcon
                    key={link.platform}
                    platform={link.platform}
                    url={link.url}
                    username={link.username}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // 默认和详细布局 - 优化视觉效果和间距
          <div className='space-y-4'>
            {/* 头像和基本信息 - 优化布局 */}
            <div className='flex items-start gap-4'>
              <div onClick={clickable ? handleClick : undefined} className='cursor-pointer'>
                <UnifiedAvatar
                  user={{
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    isVerified: user.isVerified,
                    userLevel: user.userLevel,
                  }}
                  size={size === 'sm' ? 'md' : size === 'lg' ? 'lg' : 'md'}
                  showVerifiedBadge={true}
                  fallbackType='gradient'
                  className={cn('ring-2 ring-gray-100 dark:ring-gray-800')}
                />
              </div>

              <div className='flex-1 min-w-0 space-y-2'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <h3 className={cn(config.text.name, 'truncate text-gray-900 dark:text-gray-100')}>
                    {user.displayName || user.username}
                  </h3>

                  {/* 用户等级徽章 - 优化样式 */}
                  <Badge
                    variant='secondary'
                    className='font-medium border-0'
                    style={{
                      backgroundColor: userLevel.color + '15',
                      color: userLevel.color,
                      boxShadow: `0 0 0 1px ${userLevel.color}20`,
                    }}
                  >
                    {getUserLevelIcon(user.userLevel)}
                    <span className='ml-1'>{userLevel.name}</span>
                  </Badge>
                </div>

                <p className={cn(config.text.username, 'text-gray-600 dark:text-gray-400')}>
                  @{user.username}
                </p>

                {/* 个人简介 - 优化样式 */}
                {variant === 'detailed' && user.bio && (
                  <p
                    className={cn(
                      config.text.bio,
                      'line-clamp-2 text-gray-700 dark:text-gray-300 leading-relaxed'
                    )}
                  >
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            {/* 统计数据 - 优化视觉效果 */}
            {showStats && (
              <div className='flex items-center gap-6 py-2'>
                {stats.map(stat => (
                  <div key={stat.label} className='flex items-center gap-1.5'>
                    <span
                      className={cn(
                        config.text.stats,
                        'font-bold text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {formatNumber(stat.value)}
                    </span>
                    <span
                      className={cn(
                        config.text.stats,
                        'text-gray-600 dark:text-gray-400 font-medium'
                      )}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 社交链接 - 优化布局和样式 */}
            {showSocialLinks && user.socialLinks && user.socialLinks.length > 0 && (
              <div className='flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800'>
                <span
                  className={cn(
                    config.text.stats,
                    'text-gray-600 dark:text-gray-400 font-medium flex-shrink-0'
                  )}
                >
                  社交账号
                </span>
                <div className='flex gap-2 flex-wrap'>
                  {user.socialLinks.map(link => (
                    <SocialIcon
                      key={link.platform}
                      platform={link.platform}
                      url={link.url}
                      username={link.username}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 如果可点击且没有自定义点击事件，包装在Link中
  if (clickable && !onClick) {
    return (
      <Link href={`/users/${user.username}`} className='block'>
        {cardContent}
      </Link>
    );
  }

  // 如果有自定义点击事件，包装在可点击的div中
  if (onClick) {
    return <div onClick={handleClick}>{cardContent}</div>;
  }

  // 否则直接返回卡片内容
  return cardContent;
}

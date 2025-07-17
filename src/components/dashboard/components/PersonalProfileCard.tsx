/**
 * @component PersonalProfileCard
 * @description 个人资料卡片组件，支持移动端和桌面端响应式布局
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取个人资料卡片逻辑
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { SocialIcon } from '@/components/ui/social-icon';
import { SOCIAL_PLATFORMS } from '@/types/profile';
import {
  type PersonalProfileCardProps,
  USER_LEVEL_LABELS
} from '../types/dashboard-types';

export function PersonalProfileCard({ user, userStats, socialLinks }: PersonalProfileCardProps) {
  const router = useRouter();

  // 统计数据点击处理函数
  const handleStatClick = (type: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止卡片点击事件

    switch (type) {
      case 'followers':
        router.push(`/users/${user.username}/followers`);
        break;
      case 'following':
        router.push(`/users/${user.username}/following`);
        break;
      case 'likes':
        router.push(`/users/${user.username}/likes`);
        break;
      case 'visitors':
        // 访客统计暂时跳转到用户主页
        router.push(`/users/${user.username}`);
        break;
      case 'posts':
        router.push(`/users/${user.username}/posts`);
        break;
      case 'moments':
        router.push(`/users/${user.username}/moments`);
        break;
      default:
        break;
    }
  };

  return (
    <Card
      className='cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-md'
      onClick={() => router.push(`/users/${user.username}`)}
    >
      <CardContent className='p-6'>
        {/* 移动端布局 */}
        <div className='block md:hidden'>
          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0'>
              <UnifiedAvatar
                user={{
                  username: user.username || 'user',
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl || user.image,
                  isVerified: user.isVerified || false,
                  userLevel: user.userLevel || 'USER',
                }}
                size='lg'
                showVerifiedBadge={true}
                fallbackType='gradient'
                className='border-4 border-background'
              />
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='text-lg font-semibold truncate'>
                  {user.displayName || user.username}
                </h3>
                <span className='text-pink-500 text-sm'>♀</span>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>@{user.username}</p>
              <div className='flex flex-wrap gap-1 mb-3'>
                <Badge variant='secondary' className='text-xs'>
                  {USER_LEVEL_LABELS[user.userLevel as keyof typeof USER_LEVEL_LABELS] ||
                    '注册用户'}
                </Badge>
                {user.isVerified && (
                  <Badge variant='default' className='text-xs'>
                    已认证
                  </Badge>
                )}
              </div>

              {/* 移动端社交媒体链接 */}
              {socialLinks && socialLinks.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-2'>
                  {socialLinks.slice(0, 4).map(link => {
                    const platformConfig =
                      SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                        className='hover:scale-110 transition-transform'
                        title={`${platformConfig?.name || link.platform}: @${link.username}`}
                      >
                        <SocialIcon
                          platform={link.platform}
                          size='sm'
                          variant='filled'
                          customIcon={link.customIcon || undefined}
                        />
                      </a>
                    );
                  })}
                  {socialLinks.length > 4 && (
                    <div className='w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>
                        +{socialLinks.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href='/settings/profile' onClick={e => e.stopPropagation()}>
              <Button variant='outline' size='sm'>
                <Edit className='h-4 w-4' />
              </Button>
            </Link>
          </div>

          {/* 移动端统计数据 - 参考设计样式 */}
          <div className='grid grid-cols-3 gap-3 mt-4'>
            <div
              className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-0.5'
              onClick={e => handleStatClick('followers', e)}
              title='查看粉丝列表'
            >
              <div className='text-lg font-bold text-green-600 dark:text-green-400'>
                {userStats?.followersCount || 0}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>粉丝</div>
            </div>
            <div
              className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-0.5'
              onClick={e => handleStatClick('following', e)}
              title='查看关注列表'
            >
              <div className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                {userStats?.followingCount || 0}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>关注</div>
            </div>
            <div
              className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-0.5'
              onClick={e => handleStatClick('likes', e)}
              title='查看获赞统计'
            >
              <div className='text-lg font-bold text-red-600 dark:text-red-400'>
                {userStats?.likeCount || 0}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>获赞</div>
            </div>
          </div>

          {/* 访客统计单独显示 */}
          <div className='mt-3'>
            <div className='text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
              <div className='text-sm font-bold text-purple-600 dark:text-purple-400'>
                {userStats?.visitorsCount || 0} 位访客
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400'>最近30天</div>
            </div>
          </div>
        </div>

        {/* 桌面端布局 */}
        <div className='hidden md:block'>
          <div className='flex items-center gap-6'>
            <UnifiedAvatar
              user={{
                username: user.username || 'user',
                displayName: user.displayName,
                avatarUrl: user.avatarUrl || user.image,
                isVerified: user.isVerified || false,
                userLevel: user.userLevel || 'USER',
              }}
              size='xl'
              showVerifiedBadge={true}
              fallbackType='gradient'
              className='border-4 border-background'
            />

            <div className='flex-1'>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='text-xl font-semibold'>{user.displayName || user.username}</h3>
                <span className='text-pink-500'>♀</span>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>@{user.username}</p>
              <div className='flex items-center gap-2 mb-3'>
                <Badge variant='secondary'>
                  {USER_LEVEL_LABELS[user.userLevel as keyof typeof USER_LEVEL_LABELS] ||
                    '注册用户'}
                </Badge>
                {user.isVerified && (
                  <Badge variant='default'>
                    <CheckCircle className='h-3 w-3 mr-1' />
                    已认证
                  </Badge>
                )}
              </div>

              {/* 桌面端社交媒体链接 */}
              {socialLinks && socialLinks.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {socialLinks.slice(0, 6).map(link => {
                    const platformConfig =
                      SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                        className='hover:scale-110 transition-transform'
                        title={`${platformConfig?.name || link.platform}: @${link.username}`}
                      >
                        <SocialIcon
                          platform={link.platform}
                          size='md'
                          variant='filled'
                          customIcon={link.customIcon || undefined}
                        />
                      </a>
                    );
                  })}
                  {socialLinks.length > 6 && (
                    <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>
                        +{socialLinks.length - 6}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 桌面端统计数据 - 参考设计样式 */}
            <div className='grid grid-cols-4 gap-4'>
              <div
                className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-1'
                onClick={e => handleStatClick('followers', e)}
                title='查看粉丝列表'
              >
                <div className='text-xl font-bold text-green-600 dark:text-green-400'>
                  {userStats?.followersCount || 0}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>粉丝</div>
              </div>
              <div
                className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-1'
                onClick={e => handleStatClick('following', e)}
                title='查看关注列表'
              >
                <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                  {userStats?.followingCount || 0}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>关注</div>
              </div>
              <div
                className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-1'
                onClick={e => handleStatClick('likes', e)}
                title='查看获赞统计'
              >
                <div className='text-xl font-bold text-red-600 dark:text-red-400'>
                  {userStats?.likeCount || 0}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>获赞</div>
              </div>
              <div
                className='text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:-translate-y-1'
                onClick={e => handleStatClick('visitors', e)}
                title='查看访客记录'
              >
                <div className='text-xl font-bold text-purple-600 dark:text-purple-400'>
                  {userStats?.visitorsCount || 0}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>访客</div>
              </div>
            </div>

            <Link href='/settings/profile' onClick={e => e.stopPropagation()}>
              <Button variant='outline' size='sm'>
                <Edit className='h-4 w-4 mr-2' />
                编辑资料
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

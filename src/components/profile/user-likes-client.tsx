/**
 * @component UserLikesClient
 * @description 用户获赞统计客户端组件
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, TrendingUp, Calendar, Award, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/trpc/react';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface UserLikesClientProps {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    userLevel?: string;
  };
}

export function UserLikesClient({ user }: UserLikesClientProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('all');

  // 获取用户统计数据
  const { data: userStats, isPending: isStatsLoading } = api.user.getDetailedStats.useQuery({
    username: user.username,
  });

  // 获取用户最受欢迎的内容
  const { data: popularPosts, isPending: isPostsLoading } = api.post.getUserPosts.useQuery({
    userId: user.id,
    sort: 'popular',
    limit: 10,
  });

  if (isStatsLoading) {
    return (
      <div className='space-y-6'>
        {/* 统计卡片骨架 */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className='p-6'>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-4 w-20' />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 内容骨架 */}
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {[...Array(5)].map((_, i) => (
                <div key={i} className='flex gap-4'>
                  <Skeleton className='w-12 h-12 rounded-lg' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-4 w-1/2' />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLikes = userStats?.likeCount || 0;
  const postsCount = userStats?.postsCount || 0;
  const momentsCount = userStats?.momentsCount || 0;
  const avgLikesPerPost = postsCount > 0 ? Math.round(totalLikes / (postsCount + momentsCount)) : 0;

  return (
    <div className='space-y-6'>
      {/* 获赞统计概览 */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card>
          <CardContent className='p-6 text-center'>
            <div className='w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-3'>
              <Heart className='h-6 w-6 text-red-600 dark:text-red-400' />
            </div>
            <div className='text-2xl font-bold text-red-600 dark:text-red-400'>
              {totalLikes.toLocaleString()}
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>总获赞</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6 text-center'>
            <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3'>
              <TrendingUp className='h-6 w-6 text-blue-600 dark:text-blue-400' />
            </div>
            <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
              {avgLikesPerPost}
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>平均获赞</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6 text-center'>
            <div className='w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3'>
              <FileText className='h-6 w-6 text-green-600 dark:text-green-400' />
            </div>
            <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
              {postsCount}
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>作品数量</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6 text-center'>
            <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-3'>
              <MessageCircle className='h-6 w-6 text-purple-600 dark:text-purple-400' />
            </div>
            <div className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
              {momentsCount}
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>动态数量</div>
          </CardContent>
        </Card>
      </div>

      {/* 获赞趋势和最受欢迎内容 */}
      <Tabs defaultValue='popular' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='popular'>最受欢迎</TabsTrigger>
          <TabsTrigger value='recent'>最近获赞</TabsTrigger>
        </TabsList>

        <TabsContent value='popular' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Award className='h-5 w-5 text-yellow-600' />
                最受欢迎的内容
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPostsLoading ? (
                <div className='space-y-4'>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className='flex gap-4'>
                      <Skeleton className='w-16 h-16 rounded-lg' />
                      <div className='flex-1 space-y-2'>
                        <Skeleton className='h-4 w-3/4' />
                        <Skeleton className='h-4 w-1/2' />
                        <Skeleton className='h-4 w-1/4' />
                      </div>
                    </div>
                  ))}
                </div>
              ) : popularPosts?.posts && popularPosts.posts.length > 0 ? (
                <div className='space-y-4'>
                  {popularPosts.posts.slice(0, 10).map((post: any, index: number) => (
                    <div
                      key={post.id}
                      className='flex gap-4 p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                      onClick={() => router.push(`/posts/${post.id}`)}
                    >
                      <div className='flex-shrink-0'>
                        <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold'>
                          #{index + 1}
                        </div>
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h3 className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                            {post.title || '无标题'}
                          </h3>
                          <Badge variant={post.contentType === 'POST' ? 'default' : 'secondary'}>
                            {post.contentType === 'POST' ? '作品' : '动态'}
                          </Badge>
                        </div>

                        <p className='text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2'>
                          {post.content}
                        </p>

                        <div className='flex items-center gap-4 text-sm text-gray-500'>
                          <div className='flex items-center gap-1'>
                            <Heart className='h-4 w-4 text-red-500' />
                            <span className='font-medium'>{post.likeCount || 0}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <MessageCircle className='h-4 w-4' />
                            <span>{post.commentsCount || 0}</span>
                          </div>
                          <span className='text-xs'>
                            {formatDistanceToNow(new Date(post.publishedAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Heart className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                    暂无内容
                  </h3>
                  <p className='text-gray-600 dark:text-gray-400'>
                    {user.displayName || user.username} 还没有发布任何内容
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='recent' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5 text-blue-600' />
                最近获赞动态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-center py-8'>
                <Heart className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  功能开发中
                </h3>
                <p className='text-gray-600 dark:text-gray-400'>
                  最近获赞动态功能正在开发中，敬请期待
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 获赞成就 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Award className='h-5 w-5 text-yellow-600' />
            获赞成就
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* 获赞里程碑 */}
            {[
              { threshold: 100, title: '初露锋芒', description: '获得100个赞', icon: '🌟' },
              { threshold: 500, title: '小有名气', description: '获得500个赞', icon: '🎯' },
              { threshold: 1000, title: '人气之星', description: '获得1000个赞', icon: '⭐' },
              { threshold: 5000, title: '超级明星', description: '获得5000个赞', icon: '🏆' },
              { threshold: 10000, title: '传奇创作者', description: '获得10000个赞', icon: '👑' },
            ].map(achievement => (
              <div
                key={achievement.threshold}
                className={`p-4 rounded-lg border-2 transition-all ${
                  totalLikes >= achievement.threshold
                    ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className='text-center'>
                  <div className='text-2xl mb-2'>{achievement.icon}</div>
                  <h3
                    className={`font-medium mb-1 ${
                      totalLikes >= achievement.threshold
                        ? 'text-yellow-700 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {achievement.title}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                    {achievement.description}
                  </p>
                  {totalLikes >= achievement.threshold ? (
                    <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'>
                      已达成
                    </Badge>
                  ) : (
                    <div className='text-xs text-gray-500'>
                      还需 {achievement.threshold - totalLikes} 个赞
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * @component UserMomentsClient
 * @description 用户动态列表客户端组件
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
import { Search, Grid, List, MessageCircle, Heart, Share2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import { UnifiedAvatar } from '@/components/ui/unified-avatar';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface UserMomentsClientProps {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    userLevel?: string;
  };
}

export function UserMomentsClient({ user }: UserMomentsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // 获取用户动态列表
  const { data: moments, isPending } = api.post.getUserPosts.useQuery({
    userId: user.id,
    contentType: 'MOMENT',
    sort: sortBy as 'latest' | 'popular' | 'oldest',
  });

  // 过滤搜索结果
  const filteredMoments =
    moments?.posts?.filter(
      (moment: any) =>
        moment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        moment.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        moment.tags?.some((tag: any) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

  if (isPending) {
    return (
      <div className='space-y-6'>
        {/* 搜索和筛选骨架 */}
        <div className='flex flex-col md:flex-row gap-4'>
          <Skeleton className='h-10 flex-1' />
          <Skeleton className='h-10 w-32' />
          <Skeleton className='h-10 w-24' />
        </div>

        {/* 动态列表骨架 */}
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className='p-6'>
                <div className='flex gap-4'>
                  <Skeleton className='w-12 h-12 rounded-full' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-4 w-1/4' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 搜索和筛选 */}
      <div className='flex flex-col md:flex-row gap-4'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
          <Input
            placeholder='搜索动态内容...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          <option value='latest'>最新发布</option>
          <option value='popular'>最受欢迎</option>
          <option value='oldest'>最早发布</option>
        </select>

        <div className='flex gap-2'>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setViewMode('list')}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setViewMode('grid')}
          >
            <Grid className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>动态统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600'>{filteredMoments.length}</div>
              <div className='text-sm text-gray-600'>总动态</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {filteredMoments.reduce(
                  (sum: number, moment: any) => sum + (moment.likeCount || 0),
                  0
                )}
              </div>
              <div className='text-sm text-gray-600'>总获赞</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-600'>
                {filteredMoments.reduce(
                  (sum: number, moment: any) => sum + (moment.commentsCount || 0),
                  0
                )}
              </div>
              <div className='text-sm text-gray-600'>总评论</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-orange-600'>
                {filteredMoments.reduce(
                  (sum: number, moment: any) => sum + (moment.sharesCount || 0),
                  0
                )}
              </div>
              <div className='text-sm text-gray-600'>总分享</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 动态列表 */}
      {filteredMoments.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <MessageCircle className='mx-auto h-12 w-12 text-gray-400 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>暂无动态</h3>
            <p className='text-gray-600 dark:text-gray-400'>
              {searchQuery
                ? '没有找到匹配的动态'
                : `${user.displayName || user.username} 还没有发布任何动态`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}
        >
          {filteredMoments.map((moment: any) => (
            <Card
              key={moment.id}
              className='cursor-pointer hover:shadow-lg transition-all duration-200'
              onClick={() => router.push(`/posts/${moment.id}`)}
            >
              <CardContent className='p-6'>
                <div className='flex gap-4'>
                  <UnifiedAvatar
                    user={{
                      username: user.username,
                      displayName: user.displayName,
                      avatarUrl: user.avatarUrl,
                      isVerified: user.isVerified || false,
                      userLevel: user.userLevel || 'USER',
                    }}
                    size='md'
                    showVerifiedBadge={true}
                  />

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-2'>
                      <h3 className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                        {user.displayName || user.username}
                      </h3>
                      <span className='text-sm text-gray-500'>
                        {formatDistanceToNow(new Date(moment.publishedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>

                    {moment.title && (
                      <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                        {moment.title}
                      </h4>
                    )}

                    <p className='text-gray-700 dark:text-gray-300 mb-3 line-clamp-3'>
                      {moment.content}
                    </p>

                    {moment.tags && moment.tags.length > 0 && (
                      <div className='flex flex-wrap gap-1 mb-3'>
                        {moment.tags.slice(0, 3).map((tag: any) => (
                          <Badge key={tag.id} variant='secondary' className='text-xs'>
                            #{tag.name}
                          </Badge>
                        ))}
                        {moment.tags.length > 3 && (
                          <Badge variant='outline' className='text-xs'>
                            +{moment.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className='flex items-center gap-4 text-sm text-gray-500'>
                      <div className='flex items-center gap-1'>
                        <Heart className='h-4 w-4' />
                        <span>{moment.likeCount || 0}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <MessageCircle className='h-4 w-4' />
                        <span>{moment.commentsCount || 0}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Share2 className='h-4 w-4' />
                        <span>{moment.sharesCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

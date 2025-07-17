/**
 * @fileoverview 高级媒体画廊组件
 * @description 支持权限控制、瀑布流布局、lightbox查看的媒体展示系统
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 基于用户组的媒体内容百分比限制
 * - 瀑布流布局优化大量媒体展示
 * - 高级lightbox支持键盘导航和手势
 * - 视频H.264兼容性检测和转码
 * - 虚拟滚动性能优化
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - @tanstack/react-query
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Grid,
  List,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Play,
  Image as ImageIcon,
  AlertCircle,
  Settings
} from 'lucide-react';
import { MasonryMediaGrid } from './MasonryMediaGrid';
import { MediaLightbox } from './MediaLightbox';
import { api } from '@/trpc/react';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename?: string | null;
  originalName: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number | null;
}

interface AdvancedMediaGalleryProps {
  media: MediaItem[];
  userLevel: string;
  postId: string;
  className?: string;
}

// 用户组媒体访问权限配置 - CoserEden 6级权限体系
const MEDIA_ACCESS_LIMITS = {
  GUEST: { percentage: 20, label: '访客' },
  USER: { percentage: 60, label: '入馆' },
  VIP: { percentage: 100, label: '会员' },
  CREATOR: { percentage: 100, label: '荣誉' },
  ADMIN: { percentage: 100, label: '守馆' },
  SUPER_ADMIN: { percentage: 100, label: '超级管理员' }
} as const;

export function AdvancedMediaGallery({
  media,
  userLevel,
  postId,
  className = ''
}: AdvancedMediaGalleryProps) {
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>('masonry');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showRestrictedContent, setShowRestrictedContent] = useState(false);

  // 获取用户权限配置 - 添加缓存
  const { data: userPermissions } = api.permission.getConfigByLevel.useQuery(
    { userLevel },
    {
      enabled: !!userLevel,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      gcTime: 10 * 60 * 1000 // 10分钟缓存
    }
  );

  // 计算可访问的媒体数量 - 使用useMemo稳定化
  const accessLimit = useMemo(() => {
    return MEDIA_ACCESS_LIMITS[userLevel as keyof typeof MEDIA_ACCESS_LIMITS] || MEDIA_ACCESS_LIMITS.GUEST;
  }, [userLevel]);

  const maxAccessibleCount = useMemo(() => {
    return Math.ceil(media.length * (accessLimit.percentage / 100));
  }, [media.length, accessLimit.percentage]);

  // 分离可访问和受限制的媒体 - 优化依赖
  const { accessibleMedia, restrictedMedia } = useMemo(() => {
    const accessible = media.slice(0, maxAccessibleCount);
    const restricted = media.slice(maxAccessibleCount);
    return { accessibleMedia: accessible, restrictedMedia: restricted };
  }, [media, maxAccessibleCount]);

  // 当前显示的媒体列表 - 使用useMemo稳定化
  const displayMedia = useMemo(() => {
    return showRestrictedContent ? media : accessibleMedia;
  }, [showRestrictedContent, media, accessibleMedia]);

  // 统计信息
  const mediaStats = useMemo(() => {
    const images = media.filter(m => m.mediaType === 'IMAGE').length;
    const videos = media.filter(m => m.mediaType === 'VIDEO').length;
    return { images, videos, total: media.length };
  }, [media]);

  // 处理媒体点击 - 使用useCallback优化
  const handleMediaClick = useCallback((mediaItem: MediaItem, index: number) => {
    setCurrentMediaIndex(index);
    setLightboxOpen(true);
  }, []);

  // 检查是否有权限查看所有内容 - 使用useMemo稳定化
  const canViewAllContent = useMemo(() => {
    return accessLimit.percentage >= 100;
  }, [accessLimit.percentage]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 媒体统计和控制栏 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          {/* 媒体统计 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <ImageIcon className="w-4 h-4" />
              <span>{mediaStats.images} 图片</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Play className="w-4 h-4" />
              <span>{mediaStats.videos} 视频</span>
            </div>
            <Badge variant="outline" className="text-xs">
              总计 {mediaStats.total} 项
            </Badge>
          </div>

          {/* 权限状态 */}
          <div className="flex items-center gap-2">
            <Badge
              variant={canViewAllContent ? "default" : "secondary"}
              className="text-xs"
            >
              {accessLimit.label} ({accessLimit.percentage}%)
            </Badge>
            {!canViewAllContent && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Lock className="w-3 h-3" />
                <span>部分内容受限</span>
              </div>
            )}
          </div>
        </div>

        {/* 视图控制 */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'masonry' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('masonry')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 媒体展示区域 */}
      <div className="relative">
        <MasonryMediaGrid
          media={displayMedia}
          viewMode={viewMode}
          onMediaClick={handleMediaClick}
          userLevel={userLevel}
        />

        {/* 受限内容提示 */}
        {!canViewAllContent && restrictedMedia.length > 0 && (
          <Card className="mt-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">
                      还有 {restrictedMedia.length} 项内容需要更高权限
                    </p>
                    <p className="text-sm text-amber-600">
                      升级到赞助会员即可查看全部内容
                    </p>
                  </div>
                </div>

                {userLevel !== 'GUEST' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRestrictedContent(!showRestrictedContent)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {showRestrictedContent ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        隐藏受限内容
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        预览受限内容
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lightbox 媒体查看器 */}
      {lightboxOpen && (
        <MediaLightbox
          media={displayMedia}
          currentIndex={currentMediaIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setCurrentMediaIndex}
          userLevel={userLevel}
          postId={postId}
        />
      )}
    </div>
  );
}

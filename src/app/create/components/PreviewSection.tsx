/**
 * @fileoverview 实时预览标签页组件
 * @description 为创作者提供实时预览功能，查看作品发布后的效果
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  ImageIcon,
  Heart,
  MessageSquare,
  Share2,
  User,
  Calendar,
  Globe,
  Users,
  Lock,
  Zap
} from 'lucide-react';
import { MediaFile } from '@/components/upload/MediaPreview';
import { MediaProxy } from '@/components/media/MediaProxy';
import { useMediaProxy } from '@/hooks/use-media-proxy';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PreviewSectionProps {
  title: string;
  description?: string;
  content?: string;
  uploadedFiles: MediaFile[];
  extractedTags: string[];
  visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE' | 'PREMIUM_ONLY';
  currentUser?: {
    id: string;
    name?: string | null;
    avatar?: string | null;
  };
}

// 从URL中提取路径，用于MediaProxy组件
const getMediaPath = (url: string) => {
  if (!url) return '';

  // 检查是否为外部URL（如Unsplash、其他CDN等）
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 如果是外部域名（非本地或R2存储），直接返回完整URL
    const isExternalDomain = !hostname.includes('localhost') &&
                            !hostname.includes('127.0.0.1') &&
                            !hostname.includes('r2.dev') &&
                            !hostname.includes('cloudflarestorage.com') &&
                            !hostname.includes('cosv5.com') &&
                            !hostname.includes('tutu365.cc');

    if (isExternalDomain) {
      // 外部URL直接返回，不进行路径提取
      return url;
    }

    // 对于本地或R2存储URL，提取路径部分
    let pathname = urlObj.pathname;

    // 如果是R2存储URL，去掉bucket名称前缀
    if (pathname.startsWith('/didu/')) {
      pathname = pathname.substring(6); // 去掉 '/didu/'
    }

    return pathname;
  } catch {
    // 如果不是完整URL，假设它已经是路径
    return url.startsWith('/') ? url : `/${url}`;
  }
};

// 调试版本的 MediaProxy 组件
const MediaProxyWithDebug: React.FC<{
  path: string;
  alt: string;
  fill?: boolean;
  className?: string;
}> = ({ path, alt, fill, className }) => {
  const { mediaUrl, isLoading, error, mediaType } = useMediaProxy(path);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  console.log('🔍 MediaProxyWithDebug 状态:', {
    path,
    mediaUrl,
    isLoading,
    error,
    mediaType,
    imageError,
    imageLoaded
  });

  const handleImageLoad = () => {
    console.log('✅ 图片加载成功:', mediaUrl);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = (e: any) => {
    console.error('❌ 图片加载失败:', {
      mediaUrl,
      error: e,
      event: e.target
    });
    setImageError(true);
  };

  // 如果还在加载中
  if (isLoading) {
    console.log('⏳ MediaProxy 加载中...');
    return <div className="flex items-center justify-center bg-gray-100 text-gray-500">加载中...</div>;
  }

  // 如果有错误
  if (error) {
    console.log('❌ MediaProxy 错误:', error);
    return <div className="flex items-center justify-center bg-red-100 text-red-500">错误: {error}</div>;
  }

  // 如果没有 URL
  if (!mediaUrl) {
    console.log('❌ MediaProxy 没有 URL');
    return <div className="flex items-center justify-center bg-gray-100 text-gray-500">无法获取图片</div>;
  }

  // 如果图片加载失败
  if (imageError) {
    console.log('❌ 图片加载失败状态');
    return (
      <div className="flex flex-col items-center justify-center bg-red-100 text-red-500">
        <div>图片加载失败</div>
        <button
          onClick={() => {
            setImageError(false);
            setImageLoaded(false);
          }}
          className="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded"
        >
          重试
        </button>
      </div>
    );
  }

  console.log('🖼️ 渲染图片:', mediaUrl);

  return (
    <Image
      src={mediaUrl}
      alt={alt}
      fill={fill}
      className={className}
      onLoad={handleImageLoad}
      onError={handleImageError}
      unoptimized={true} // 禁用 Next.js 优化，避免可能的问题
    />
  );
};

export function PreviewSection({
  title,
  description,
  content,
  uploadedFiles,
  extractedTags,
  visibility,
  currentUser,
}: PreviewSectionProps) {
  // 添加调试信息
  console.log('🔍 PreviewSection 渲染:', {
    uploadedFilesLength: uploadedFiles.length,
    uploadedFiles: uploadedFiles,
    firstFile: uploadedFiles[0]
  });
  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4 text-green-600" />;
      case 'FOLLOWERS_ONLY':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'PRIVATE':
        return <Lock className="w-4 h-4 text-gray-600" />;
      case 'PREMIUM_ONLY':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      default:
        return <Globe className="w-4 h-4 text-green-600" />;
    }
  };

  const getVisibilityText = () => {
    switch (visibility) {
      case 'PUBLIC':
        return '公开';
      case 'FOLLOWERS_ONLY':
        return '仅关注者';
      case 'PRIVATE':
        return '私密';
      case 'PREMIUM_ONLY':
        return '仅会员';
      default:
        return '公开';
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">实时预览</CardTitle>
            <CardDescription className="text-sm">
              查看作品发布后的效果
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 预览提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-blue-700">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">实时预览</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            以下是您的作品在平台上的显示效果
          </p>
        </div>

        {/* 作品预览卡片 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* 用户信息头部 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {currentUser?.avatar ? (
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name || '用户头像'}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {currentUser?.name || '创作者'}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(), { addSuffix: true, locale: zhCN })}</span>
                    <span>•</span>
                    {getVisibilityIcon()}
                    <span>{getVisibilityText()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 作品内容 */}
          <div className="p-4 space-y-4">
            {/* 标题 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {title || '作品标题'}
              </h3>
            </div>

            {/* 描述 */}
            {description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {description}
              </p>
            )}

            {/* 详细内容预览 */}
            {content && (
              <div className="text-sm text-gray-700 line-clamp-4 bg-gray-50 rounded-lg p-3">
                {content}
              </div>
            )}

            {/* 媒体预览 */}
            {uploadedFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {uploadedFiles[0]?.mediaType === 'IMAGE' ? (
                    (() => {
                      const file = uploadedFiles[0];
                      // 优先使用medium尺寸的缩略图，然后是thumbnailUrl，最后是原图
                      const mediumThumbnail = file.thumbnails?.find(t => t.size === 'medium');
                      const imageUrl = mediumThumbnail?.url || file.thumbnailUrl || file.url;
                      const imagePath = getMediaPath(imageUrl);

                      console.log('🖼️ PreviewSection 图片路径:', {
                        thumbnailUrl: file.thumbnailUrl,
                        mediumThumbnail: mediumThumbnail?.url,
                        url: file.url,
                        finalPath: imagePath
                      });

                      return (
                        <MediaProxyWithDebug
                          path={imagePath}
                          alt="预览图片"
                          fill
                          className="object-cover"
                        />
                      );
                    })()
                  ) : uploadedFiles[0]?.mediaType === 'VIDEO' ? (
                    <div className="relative w-full h-full">
                      {/* 视频缩略图预览 */}
                      {uploadedFiles[0].thumbnailUrl ? (
                        (() => {
                          const videoPath = getMediaPath(uploadedFiles[0].thumbnailUrl);
                          console.log('🎬 PreviewSection 视频缩略图路径:', {
                            thumbnailUrl: uploadedFiles[0].thumbnailUrl,
                            finalPath: videoPath
                          });
                          return (
                            <MediaProxy
                              path={videoPath}
                              alt="视频缩略图"
                              fill
                              className="object-cover"
                            />
                          );
                        })()
                      ) : (
                        <video
                          src={uploadedFiles[0].url}
                          className="w-full h-full object-cover"
                          controls={false}
                          muted
                          preload="metadata"
                        />
                      )}
                      {/* 播放图标覆盖层 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">媒体文件</p>
                    </div>
                  )}
                </div>
                {uploadedFiles.length > 1 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{uploadedFiles.length - 1} 个文件
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">暂无媒体文件</p>
                </div>
              </div>
            )}

            {/* 标签预览 */}
            {extractedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {extractedTags.slice(0, 5).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {extractedTags.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{extractedTags.length - 5}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 互动区域 */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-500">
                  <Heart className="w-4 h-4 mr-1" />
                  <span className="text-xs">0</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  <span className="text-xs">0</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-green-500">
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="text-xs">0</span>
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-purple-500">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 预览说明 */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p>💡 这是您的作品在平台上的预览效果，实际显示可能会有细微差异。</p>
        </div>
      </CardContent>
    </Card>
  );
}

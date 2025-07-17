/**
 * @fileoverview 媒体代理组件
 * @description 使用tRPC媒体代理API的React组件
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useMediaProxy } from '@/hooks/use-media-proxy';
import { cn } from '@/lib/utils';

/**
 * 媒体代理组件属性
 */
export interface MediaProxyProps {
  /** 媒体文件路径 */
  path: string;
  /** 替代文本 */
  alt?: string;
  /** CSS类名 */
  className?: string;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 是否填充容器 */
  fill?: boolean;
  /** 缓存时间（秒） */
  maxAge?: number;
  /** 加载时的占位符 */
  placeholder?: React.ReactNode;
  /** 错误时的占位符 */
  errorPlaceholder?: React.ReactNode;
  /** 点击事件处理 */
  onClick?: () => void;
  /** 是否显示加载状态 */
  showLoadingState?: boolean;
  /** 是否显示错误状态 */
  showErrorState?: boolean;
}

/**
 * 默认加载占位符
 */
const DefaultLoadingPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    'flex items-center justify-center bg-gray-100 animate-pulse',
    className
  )}>
    <div className="text-gray-400 text-sm">加载中...</div>
  </div>
);

/**
 * 默认错误占位符
 */
const DefaultErrorPlaceholder: React.FC<{
  className?: string;
  error?: string;
  onRetry?: () => void;
}> = ({ className, error, onRetry }) => (
  <div className={cn(
    'flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300',
    className
  )}>
    <div className="text-gray-400 text-sm mb-2">
      {error || '加载失败'}
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-blue-500 text-xs hover:text-blue-600 underline"
      >
        重试
      </button>
    )}
  </div>
);

/**
 * 媒体代理组件
 *
 * @example
 * ```tsx
 * // 基本使用
 * <MediaProxy
 *   path="uploads/2025/07/image.jpg"
 *   alt="示例图片"
 *   width={400}
 *   height={300}
 * />
 *
 * // 自定义占位符
 * <MediaProxy
 *   path="uploads/2025/07/image.jpg"
 *   alt="示例图片"
 *   placeholder={<div>自定义加载中...</div>}
 *   errorPlaceholder={<div>自定义错误提示</div>}
 * />
 * ```
 */
export const MediaProxy: React.FC<MediaProxyProps> = ({
  path,
  alt = '媒体文件',
  className,
  width,
  height,
  fill = false,
  maxAge = 3600,
  placeholder,
  errorPlaceholder,
  onClick,
  showLoadingState = true,
  showErrorState = true,
}) => {
  const [imageError, setImageError] = useState(false);

  const {
    mediaUrl,
    isLoading,
    error,
    refetch,
    mediaType
  } = useMediaProxy(path, { maxAge });

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
  };

  // 处理重试
  const handleRetry = () => {
    setImageError(false);
    refetch();
  };

  // 加载状态
  if (isLoading && showLoadingState) {
    return placeholder || (
      <DefaultLoadingPlaceholder
        className={cn(
          fill ? 'absolute inset-0' : '',
          !fill && width && height ? `w-[${width}px] h-[${height}px]` : '',
          className
        )}
      />
    );
  }

  // 错误状态
  if ((error || imageError) && showErrorState) {
    return errorPlaceholder || (
      <DefaultErrorPlaceholder
        className={cn(
          fill ? 'absolute inset-0' : '',
          !fill && width && height ? `w-[${width}px] h-[${height}px]` : '',
          className
        )}
        error={error || '图片加载失败'}
        onRetry={handleRetry}
      />
    );
  }

  // 没有媒体URL
  if (!mediaUrl) {
    return showErrorState ? (
      <DefaultErrorPlaceholder
        className={cn(
          fill ? 'absolute inset-0' : '',
          !fill && width && height ? `w-[${width}px] h-[${height}px]` : '',
          className
        )}
        error="媒体文件不可用"
        onRetry={handleRetry}
      />
    ) : null;
  }

  // 检查是否为WebP格式
  const isWebP = mediaUrl.includes('.webp') || mediaUrl.includes('webp');

  // 渲染图片
  const imageProps = {
    src: mediaUrl,
    alt,
    className: cn(className, onClick && 'cursor-pointer'),
    onError: handleImageError,
    onClick,
    ...(fill ? { fill: true } : { width, height }),
  };

  return (
    <Image
      {...imageProps}
      // 对于动态URL、占位符和WebP格式，禁用Next.js优化
      unoptimized={
        mediaType === 'placeholder' ||
        mediaUrl.includes('cloudflarestorage.com') ||
        isWebP
      }
      // 添加加载优先级
      priority={false}
      // WebP格式使用更高质量
      quality={isWebP ? 90 : 85}
      // 添加跨域支持
      crossOrigin="anonymous"
      // 添加WebP格式支持的格式声明
      {...(isWebP && {
        'data-format': 'webp',
        'data-optimized': 'true'
      })}
    />
  );
};

/**
 * 媒体网格组件 - 批量显示媒体文件
 */
export interface MediaGridProps {
  /** 媒体文件路径数组 */
  paths: string[];
  /** 网格列数 */
  columns?: number;
  /** 单个媒体项的宽度 */
  itemWidth?: number;
  /** 单个媒体项的高度 */
  itemHeight?: number;
  /** 网格间距 */
  gap?: number;
  /** CSS类名 */
  className?: string;
  /** 点击事件处理 */
  onItemClick?: (path: string, index: number) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  paths,
  columns = 3,
  itemWidth = 200,
  itemHeight = 150,
  gap = 16,
  className,
  onItemClick,
}) => {
  return (
    <div
      className={cn(
        'grid',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {paths.map((path, index) => (
        <div
          key={`${path}-${index}`}
          className="relative overflow-hidden rounded-lg border border-gray-200"
          style={{ width: itemWidth, height: itemHeight }}
        >
          <MediaProxy
            path={path}
            alt={`媒体文件 ${index + 1}`}
            fill
            onClick={() => onItemClick?.(path, index)}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
};

/**
 * 媒体预览组件 - 带有详细信息的媒体显示
 */
export interface MediaPreviewProps extends MediaProxyProps {
  /** 是否显示文件信息 */
  showFileInfo?: boolean;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 自定义操作按钮 */
  actions?: React.ReactNode;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  path,
  showFileInfo = false,
  showActions = false,
  actions,
  ...mediaProps
}) => {
  const { data, error } = useMediaProxy(path);

  return (
    <div className="space-y-4">
      <MediaProxy path={path} {...mediaProps} />

      {showFileInfo && (
        <div className="text-sm text-gray-600 space-y-1">
          <div>路径: {path}</div>
          {data && (
            <>
              <div>类型: {data.type}</div>
              {data.contentType && <div>MIME类型: {data.contentType}</div>}
              {data.cacheControl && <div>缓存控制: {data.cacheControl}</div>}
            </>
          )}
          {error && <div className="text-red-500">错误: {error}</div>}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

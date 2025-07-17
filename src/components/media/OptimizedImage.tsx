/**
 * @fileoverview 优化的图片组件
 * @description 基于Next.js Image组件的优化图片显示，支持多尺寸自动选择和响应式加载
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * <OptimizedImage
 *   src="https://example.com/image.jpg"
 *   alt="描述"
 *   multiSizeUrls={{
 *     thumbnail: "https://example.com/thumb.jpg",
 *     small: "https://example.com/small.jpg",
 *     medium: "https://example.com/medium.jpg",
 *     large: "https://example.com/large.jpg"
 *   }}
 *   aspectRatio="16/9"
 * />
 *
 * @dependencies
 * - next/image: Next.js优化图片组件
 * - react: React hooks
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持多尺寸自动选择
 */

import React, { useState } from 'react';
import Image from 'next/image';

export interface MultiSizeUrls {
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  original?: string;
}

export interface OptimizedImageProps {
  /** 主要图片URL（原图或最大尺寸） */
  src: string;
  /** 图片描述 */
  alt: string;
  /** 多尺寸URL对象 */
  multiSizeUrls?: MultiSizeUrls;
  /** 宽高比 (如 "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** 自定义className */
  className?: string;
  /** 图片质量 (1-100) */
  quality?: number;
  /** 加载优先级 */
  priority?: boolean;
  /** 加载策略 */
  loading?: 'lazy' | 'eager';
  /** 点击事件 */
  onClick?: () => void;
  /** 是否显示加载状态 */
  showLoading?: boolean;
  /** 是否显示错误状态 */
  showError?: boolean;
  /** 自定义sizes属性 */
  sizes?: string;
  /** 是否填充容器 */
  fill?: boolean;
  /** 固定宽度 */
  width?: number;
  /** 固定高度 */
  height?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  multiSizeUrls,
  aspectRatio = '16/9',
  className = '',
  quality = 85,
  priority = false,
  loading = 'lazy',
  onClick,
  showLoading = true,
  showError = true,
  sizes,
  fill = false,
  width,
  height
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 根据容器大小智能选择图片尺寸
  const getOptimalImageSrc = (): string => {
    if (!multiSizeUrls) return src;

    // 如果有多尺寸URL，根据sizes属性智能选择
    // 这里可以根据实际需求扩展更复杂的选择逻辑
    if (multiSizeUrls.medium) return multiSizeUrls.medium;
    if (multiSizeUrls.small) return multiSizeUrls.small;
    if (multiSizeUrls.large) return multiSizeUrls.large;
    if (multiSizeUrls.original) return multiSizeUrls.original;
    
    return src;
  };

  // 生成srcSet用于响应式图片
  const generateSrcSet = (): string | undefined => {
    if (!multiSizeUrls) return undefined;

    const srcSetEntries: string[] = [];
    
    if (multiSizeUrls.thumbnail) {
      srcSetEntries.push(`${multiSizeUrls.thumbnail} 150w`);
    }
    if (multiSizeUrls.small) {
      srcSetEntries.push(`${multiSizeUrls.small} 400w`);
    }
    if (multiSizeUrls.medium) {
      srcSetEntries.push(`${multiSizeUrls.medium} 800w`);
    }
    if (multiSizeUrls.large) {
      srcSetEntries.push(`${multiSizeUrls.large} 1920w`);
    }
    if (multiSizeUrls.original) {
      srcSetEntries.push(`${multiSizeUrls.original} 2400w`);
    }

    return srcSetEntries.length > 0 ? srcSetEntries.join(', ') : undefined;
  };

  // 默认sizes属性
  const defaultSizes = sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  // 容器样式
  const containerClass = `
    relative overflow-hidden
    ${aspectRatio && !fill ? `aspect-[${aspectRatio.replace('/', '/')}]` : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  // 图片样式
  const imageClass = `
    transition-all duration-300
    ${imageLoading ? 'opacity-0' : 'opacity-100'}
    ${onClick ? 'hover:scale-105' : ''}
    ${fill ? 'object-cover' : 'w-full h-full object-cover'}
  `.trim();

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // 如果使用固定尺寸
  if (width && height && !fill) {
    return (
      <div className={containerClass} onClick={onClick}>
        {/* 加载状态 */}
        {imageLoading && showLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* 错误状态 */}
        {imageError && showError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded" />
              <p className="text-sm">图片加载失败</p>
            </div>
          </div>
        )}

        <Image
          src={getOptimalImageSrc()}
          alt={alt}
          width={width}
          height={height}
          className={imageClass}
          quality={quality}
          priority={priority}
          loading={loading}
          sizes={defaultSizes}
          onLoad={handleImageLoad}
          onError={handleImageError}
          // 如果有多尺寸，使用自定义的srcSet
          {...(generateSrcSet() && { 
            srcSet: generateSrcSet(),
            sizes: defaultSizes 
          })}
        />
      </div>
    );
  }

  // 使用fill模式或响应式容器
  return (
    <div className={containerClass} onClick={onClick}>
      {/* 加载状态 */}
      {imageLoading && showLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {imageError && showError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded" />
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}

      <Image
        src={getOptimalImageSrc()}
        alt={alt}
        fill={fill}
        className={imageClass}
        quality={quality}
        priority={priority}
        loading={loading}
        sizes={defaultSizes}
        onLoad={handleImageLoad}
        onError={handleImageError}
        // 如果有多尺寸，使用自定义的srcSet
        {...(generateSrcSet() && { 
          srcSet: generateSrcSet(),
          sizes: defaultSizes 
        })}
      />
    </div>
  );
};

export default OptimizedImage;

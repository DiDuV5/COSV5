/**
 * @fileoverview 优化的图片组件
 * @description 基于Next.js Image的高性能图片组件，支持懒加载、WebP转换、响应式等
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * <OptimizedImage
 *   src="/path/to/image.jpg"
 *   alt="描述"
 *   width={800}
 *   height={600}
 *   priority={false}
 * />
 *
 * @dependencies
 * - next/image: ^14.0.0
 * - React 18+
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持懒加载和WebP优化
 */

'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * 优化图片组件属性接口
 */
export interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** 图片源地址 */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 是否优先加载 */
  priority?: boolean;
  /** 图片质量 (1-100) */
  quality?: number;
  /** 响应式尺寸 */
  sizes?: string;
  /** 自定义类名 */
  className?: string;
  /** 占位符类型 */
  placeholder?: 'blur' | 'empty';
  /** 模糊占位符数据URL */
  blurDataURL?: string;
  /** 加载完成回调 */
  onLoadComplete?: () => void;
  /** 错误回调 */
  onError?: () => void;
  /** 是否显示加载状态 */
  showLoadingState?: boolean;
  /** 是否启用WebP优化 */
  enableWebP?: boolean;
  /** 是否启用懒加载 */
  enableLazyLoading?: boolean;
  /** 容器样式 */
  containerClassName?: string;
  /** 错误时的回退图片 */
  fallbackSrc?: string;
}

/**
 * 生成模糊占位符
 */
const generateBlurDataURL = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

/**
 * 检测WebP支持
 */
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const webP = document.createElement('img');
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * 优化的图片组件
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  placeholder = 'blur',
  blurDataURL,
  onLoadComplete,
  onError,
  showLoadingState = true,
  enableWebP = true,
  enableLazyLoading = true,
  containerClassName,
  fallbackSrc,
  ...props
}) => {
  const [isPending, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webPSupported, setWebPSupported] = useState<boolean | null>(null);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imageRef = useRef<HTMLImageElement>(null);

  // 检测WebP支持
  useEffect(() => {
    if (enableWebP && typeof window !== 'undefined') {
      checkWebPSupport().then(setWebPSupported);
    }
  }, [enableWebP]);

  // 生成优化的图片URL
  const getOptimizedSrc = useCallback((originalSrc: string): string => {
    // 如果是外部URL，直接返回
    if (originalSrc.startsWith('http') && !originalSrc.includes(window.location.hostname)) {
      return originalSrc;
    }

    // 如果支持WebP且启用了WebP优化
    if (webPSupported && enableWebP && !originalSrc.includes('.webp')) {
      // 这里可以添加WebP转换逻辑
      // 例如：通过查询参数或API端点进行格式转换
      const url = new URL(originalSrc, window.location.origin);
      url.searchParams.set('format', 'webp');
      return url.toString();
    }

    return originalSrc;
  }, [webPSupported, enableWebP]);

  // 处理图片加载完成
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // 处理图片加载错误
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    
    // 尝试使用回退图片
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    
    onError?.();
  }, [fallbackSrc, currentSrc, onError]);

  // 生成模糊占位符
  const getBlurDataURL = useCallback((): string => {
    if (blurDataURL) return blurDataURL;
    
    if (typeof window !== 'undefined' && width && height) {
      return generateBlurDataURL(width, height);
    }
    
    // 默认模糊占位符
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }, [blurDataURL, width, height]);

  // 优化的图片源
  const optimizedSrc = getOptimizedSrc(currentSrc);

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* 加载状态 */}
      {isPending && showLoadingState && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}

      {/* 实际图片 */}
      {!hasError && (
        <Image
          ref={imageRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          quality={quality}
          sizes={sizes}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
          loading={enableLazyLoading && !priority ? 'lazy' : 'eager'}
          className={cn(
            'transition-opacity duration-300',
            isPending ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
};

/**
 * 预设的响应式图片组件
 */
export const ResponsiveImage: React.FC<Omit<OptimizedImageProps, 'sizes'> & { 
  variant?: 'thumbnail' | 'card' | 'hero' | 'gallery' 
}> = ({ variant = 'card', ...props }) => {
  const sizesByVariant = {
    thumbnail: '(max-width: 768px) 150px, 200px',
    card: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    hero: '100vw',
    gallery: '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
  };

  return (
    <OptimizedImage
      sizes={sizesByVariant[variant]}
      {...props}
    />
  );
};

/**
 * 头像图片组件
 */
export const AvatarImage: React.FC<Omit<OptimizedImageProps, 'sizes' | 'width' | 'height'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ size = 'md', className, ...props }) => {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 }
  };

  const { width, height } = sizeMap[size];

  return (
    <OptimizedImage
      width={width}
      height={height}
      sizes={`${width}px`}
      className={cn('rounded-full', className)}
      {...props}
    />
  );
};

export default OptimizedImage;

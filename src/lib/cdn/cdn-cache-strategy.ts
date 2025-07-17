/**
 * @fileoverview CDN缓存策略配置
 * @description 优化图片和视频的CDN缓存，提升媒体文件加载速度
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

/**
 * CDN缓存配置
 */
export interface CDNCacheConfig {
  /** CDN域名 */
  domain: string;
  /** 默认缓存时间（秒） */
  defaultTTL: number;
  /** 图片缓存时间 */
  imageTTL: number;
  /** 视频缓存时间 */
  videoTTL: number;
  /** 缩略图缓存时间 */
  thumbnailTTL: number;
  /** 是否启用WebP转换 */
  enableWebP: boolean;
  /** 是否启用AVIF转换 */
  enableAVIF: boolean;
  /** 图片质量设置 */
  imageQuality: {
    thumbnail: number;
    small: number;
    medium: number;
    large: number;
  };
}

/**
 * 媒体文件类型
 */
export type MediaType = 'image' | 'video' | 'thumbnail' | 'avatar' | 'cover';

/**
 * 图片尺寸配置
 */
export interface ImageSizeConfig {
  width: number;
  height?: number;
  quality: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

/**
 * CDN缓存策略管理器
 */
export class CDNCacheStrategy {
  private config: CDNCacheConfig;

  constructor(config: Partial<CDNCacheConfig> = {}) {
    this.config = {
      domain: process.env.COSEREEDEN_CDN_DOMAIN || 'https://cdn.cosereeden.com',
      defaultTTL: 86400, // 24小时
      imageTTL: 604800, // 7天
      videoTTL: 2592000, // 30天
      thumbnailTTL: 86400, // 24小时
      enableWebP: true,
      enableAVIF: true,
      imageQuality: {
        thumbnail: 75,
        small: 80,
        medium: 85,
        large: 90,
      },
      ...config,
    };
  }

  /**
   * 生成优化的图片URL
   */
  generateImageURL(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
  ): string {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return originalUrl;
    }

    const {
      width,
      height,
      quality = 85,
      format = this.config.enableWebP ? 'webp' : 'jpeg',
      fit = 'cover',
    } = options;

    // 构建查询参数
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality !== 85) params.set('q', quality.toString());
    if (format !== 'jpeg') params.set('f', format);
    if (fit !== 'cover') params.set('fit', fit);

    // 添加缓存控制参数
    params.set('cache', this.config.imageTTL.toString());

    const queryString = params.toString();
    const separator = originalUrl.includes('?') ? '&' : '?';
    
    return queryString ? `${originalUrl}${separator}${queryString}` : originalUrl;
  }

  /**
   * 生成响应式图片URL集合
   */
  generateResponsiveImageURLs(
    originalUrl: string,
    sizes: Array<{ width: number; height?: number; quality?: number }>
  ): Array<{ url: string; width: number; height?: number }> {
    return sizes.map(size => ({
      url: this.generateImageURL(originalUrl, size),
      width: size.width,
      height: size.height,
    }));
  }

  /**
   * 生成缩略图URL
   */
  generateThumbnailURL(
    originalUrl: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    const sizeConfigs = {
      small: { width: 150, height: 150, quality: this.config.imageQuality.thumbnail },
      medium: { width: 300, height: 300, quality: this.config.imageQuality.small },
      large: { width: 600, height: 600, quality: this.config.imageQuality.medium },
    };

    return this.generateImageURL(originalUrl, sizeConfigs[size]);
  }

  /**
   * 生成头像URL
   */
  generateAvatarURL(
    originalUrl: string,
    size: number = 100
  ): string {
    return this.generateImageURL(originalUrl, {
      width: size,
      height: size,
      quality: this.config.imageQuality.thumbnail,
      fit: 'cover',
    });
  }

  /**
   * 生成封面图URL
   */
  generateCoverURL(
    originalUrl: string,
    width: number = 1200,
    height: number = 630
  ): string {
    return this.generateImageURL(originalUrl, {
      width,
      height,
      quality: this.config.imageQuality.large,
      fit: 'cover',
    });
  }

  /**
   * 生成视频缩略图URL
   */
  generateVideoThumbnailURL(
    videoUrl: string,
    time: number = 1, // 截取时间点（秒）
    options: {
      width?: number;
      height?: number;
      quality?: number;
    } = {}
  ): string {
    const {
      width = 640,
      height = 360,
      quality = this.config.imageQuality.medium,
    } = options;

    // 构建视频缩略图URL
    const params = new URLSearchParams({
      t: time.toString(),
      w: width.toString(),
      h: height.toString(),
      q: quality.toString(),
      f: 'jpeg',
      cache: this.config.thumbnailTTL.toString(),
    });

    return `${this.config.domain}/video-thumbnail?url=${encodeURIComponent(videoUrl)}&${params.toString()}`;
  }

  /**
   * 获取缓存控制头
   */
  getCacheHeaders(mediaType: MediaType): Record<string, string> {
    let maxAge: number;
    
    switch (mediaType) {
      case 'image':
        maxAge = this.config.imageTTL;
        break;
      case 'video':
        maxAge = this.config.videoTTL;
        break;
      case 'thumbnail':
      case 'avatar':
        maxAge = this.config.thumbnailTTL;
        break;
      default:
        maxAge = this.config.defaultTTL;
    }

    return {
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, immutable`,
      'Expires': new Date(Date.now() + maxAge * 1000).toUTCString(),
      'ETag': `"${Date.now()}"`,
      'Vary': 'Accept, Accept-Encoding',
    };
  }

  /**
   * 检查浏览器支持的图片格式
   */
  getSupportedFormat(acceptHeader: string = ''): 'avif' | 'webp' | 'jpeg' {
    if (this.config.enableAVIF && acceptHeader.includes('image/avif')) {
      return 'avif';
    }
    if (this.config.enableWebP && acceptHeader.includes('image/webp')) {
      return 'webp';
    }
    return 'jpeg';
  }

  /**
   * 生成预加载链接
   */
  generatePreloadLinks(
    images: Array<{ url: string; priority: 'high' | 'low' }>
  ): string[] {
    return images.map(({ url, priority }) => 
      `<${url}>; rel=preload; as=image; priority=${priority}`
    );
  }

  /**
   * 生成图片srcset属性
   */
  generateSrcSet(
    originalUrl: string,
    sizes: number[] = [320, 640, 1024, 1280, 1920]
  ): string {
    return sizes
      .map(width => {
        const url = this.generateImageURL(originalUrl, { width });
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * 生成图片sizes属性
   */
  generateSizes(breakpoints: Array<{ condition: string; size: string }>): string {
    return breakpoints
      .map(({ condition, size }) => `${condition} ${size}`)
      .join(', ');
  }

  /**
   * 预热缓存
   */
  async warmupCache(urls: string[]): Promise<void> {
    const warmupPromises = urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ 缓存预热成功: ${url}`);
        } else {
          console.warn(`⚠️ 缓存预热失败: ${url} (${response.status})`);
        }
      } catch (error) {
        console.error(`❌ 缓存预热错误: ${url}`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  /**
   * 清理CDN缓存
   */
  async purgeCache(urls: string[]): Promise<void> {
    // 这里应该调用CDN提供商的API来清理缓存
    // 例如Cloudflare、AWS CloudFront等
    console.log('🧹 清理CDN缓存:', urls);
    
    // 示例：Cloudflare API调用
    if (process.env.COSEREEDEN_CLOUDFLARE_API_TOKEN && process.env.COSEREEDEN_CLOUDFLARE_ZONE_ID) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${process.env.COSEREEDEN_CLOUDFLARE_ZONE_ID}/purge_cache`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.COSEREEDEN_CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: urls }),
          }
        );

        if (response.ok) {
          console.log('✅ CDN缓存清理成功');
        } else {
          console.error('❌ CDN缓存清理失败:', await response.text());
        }
      } catch (error) {
        console.error('❌ CDN缓存清理错误:', error);
      }
    }
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(
    originalUrl: string,
    fileSize: number,
    dimensions: { width: number; height: number }
  ): string[] {
    const suggestions: string[] = [];
    const { width, height } = dimensions;

    // 文件大小建议
    if (fileSize > 1024 * 1024) { // 1MB
      suggestions.push('文件大小过大，建议压缩或使用更高效的格式');
    }

    // 尺寸建议
    if (width > 2048 || height > 2048) {
      suggestions.push('图片尺寸过大，建议生成多个尺寸版本');
    }

    // 格式建议
    if (!originalUrl.includes('webp') && !originalUrl.includes('avif')) {
      suggestions.push('建议使用WebP或AVIF格式以获得更好的压缩率');
    }

    // 缓存建议
    if (!originalUrl.includes('cache=')) {
      suggestions.push('建议添加缓存参数以提升加载速度');
    }

    return suggestions;
  }
}

// 创建全局CDN缓存策略实例
export const cdnCacheStrategy = new CDNCacheStrategy();

// 预定义的图片尺寸配置
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 300, height: 300 },
  MEDIUM: { width: 600, height: 600 },
  LARGE: { width: 1200, height: 1200 },
  COVER: { width: 1200, height: 630 },
  AVATAR: { width: 100, height: 100 },
} as const;

// 响应式图片断点
export const RESPONSIVE_BREAKPOINTS = [
  { condition: '(max-width: 320px)', size: '280px' },
  { condition: '(max-width: 640px)', size: '600px' },
  { condition: '(max-width: 1024px)', size: '960px' },
  { condition: '(max-width: 1280px)', size: '1200px' },
  { condition: '(min-width: 1281px)', size: '1600px' },
] as const;

export default CDNCacheStrategy;

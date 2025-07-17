/**
 * @fileoverview URL模式匹配器
 * @description 专门负责URL模式识别和匹配逻辑
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { CDNConfig, URLProcessingContext } from './types';

/**
 * URL模式匹配器类
 */
export class URLPatternMatcher {
  private readonly context: URLProcessingContext;

  constructor(context: URLProcessingContext) {
    this.context = context;
  }

  /**
   * 检查是否为相对路径
   */
  public isRelativePath(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }

  /**
   * 检查是否为绝对URL
   */
  public isAbsoluteUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * 检查是否为本地开发URL
   */
  public isLocalDevelopmentUrl(url: string, config: CDNConfig): boolean {
    return config.localDomains.some(domain => url.startsWith(domain));
  }

  /**
   * 检查是否为错误域名
   */
  public isErrorDomain(url: string, config: CDNConfig): boolean {
    return config.errorDomains.some(errorDomain => url.startsWith(errorDomain));
  }

  /**
   * 检查是否为正确的CDN域名
   */
  public isCorrectCDNDomain(url: string, config: CDNConfig): boolean {
    return url.startsWith(config.cdnDomain) || 
           config.fallbackDomains.some(domain => url.startsWith(domain));
  }

  /**
   * 检查是否为/api/files/路径
   */
  public isApiFilesPath(url: string): boolean {
    if (this.isAbsoluteUrl(url)) {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname.startsWith('/api/files/');
      } catch {
        return false;
      }
    }
    return url.includes('/api/files/');
  }

  /**
   * 检查是否为R2存储URL
   */
  public isR2StorageUrl(url: string): boolean {
    return url.includes('cloudflarestorage.com') || url.includes('r2.dev');
  }

  /**
   * 检查是否为生产CDN域名
   */
  public isProductionCDNUrl(url: string): boolean {
    const productionCdnDomain = process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY || 
                               process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN;
    
    return productionCdnDomain ? url.startsWith(productionCdnDomain) : false;
  }

  /**
   * 提取URL路径部分
   */
  public extractUrlPath(url: string): string {
    try {
      if (this.isAbsoluteUrl(url)) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }
      return url;
    } catch {
      return url;
    }
  }

  /**
   * 提取/api/files/后的文件路径
   */
  public extractApiFilesPath(url: string): string | null {
    const pathname = this.extractUrlPath(url);
    
    if (pathname.startsWith('/api/files/')) {
      return pathname.substring(11); // 去掉 '/api/files/'
    }
    
    return null;
  }

  /**
   * 提取R2存储的文件路径
   */
  public extractR2FilePath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      // 如果是R2存储URL，去掉bucket名称前缀
      if (pathname.startsWith('/didu/')) {
        pathname = pathname.substring(5); // 去掉 '/didu' 保留后面的斜杠
      } else if (pathname.startsWith('/cosv5/')) {
        pathname = pathname.substring(6); // 去掉 '/cosv5' 保留后面的斜杠
      }

      return pathname.startsWith('/') ? pathname : '/' + pathname;
    } catch {
      return null;
    }
  }

  /**
   * 检查URL是否需要修复
   */
  public needsUrlFix(url: string, config: CDNConfig): boolean {
    if (!url) return false;

    // 检查是否使用了错误的域名
    if (this.isErrorDomain(url, config)) {
      return true;
    }

    // 检查是否为旧的/api/files/路径
    if (this.isApiFilesPath(url)) {
      return true;
    }

    // 检查是否为R2存储URL（需要转换为CDN URL）
    if (this.isR2StorageUrl(url)) {
      return true;
    }

    // 开发环境下，生产CDN URL需要转换为本地代理
    if (this.context.environment === 'development' && this.isProductionCDNUrl(url)) {
      return true;
    }

    return false;
  }

  /**
   * 获取URL的域名部分
   */
  public extractDomain(url: string): string | null {
    try {
      if (this.isAbsoluteUrl(url)) {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 检查域名是否匹配模式
   */
  public isDomainMatching(url: string, patterns: string[]): boolean {
    const domain = this.extractDomain(url);
    if (!domain) return false;

    return patterns.some(pattern => {
      // 支持通配符匹配
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(domain);
      }
      return domain.includes(pattern) || url.startsWith(pattern);
    });
  }

  /**
   * 查找最佳匹配的错误域名
   */
  public findBestErrorDomainMatch(url: string, config: CDNConfig): string | null {
    // 按长度排序，优先匹配更具体的域名
    const sortedErrorDomains = [...config.errorDomains].sort((a, b) => b.length - a.length);
    
    for (const errorDomain of sortedErrorDomains) {
      if (url.startsWith(errorDomain)) {
        return errorDomain;
      }
    }
    
    return null;
  }

  /**
   * 检查URL是否为媒体文件
   */
  public isMediaFile(url: string): boolean {
    const mediaExtensions = [
      // 图片
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      // 视频
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v',
      // 音频
      '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'
    ];

    const urlLower = url.toLowerCase();
    return mediaExtensions.some(ext => urlLower.includes(ext));
  }

  /**
   * 检查URL是否为缩略图
   */
  public isThumbnailUrl(url: string): boolean {
    const thumbnailPatterns = [
      '_thumbnail',
      '_thumb',
      '/thumbnails/',
      '/thumbs/',
      'thumbnail=',
      'thumb='
    ];

    const urlLower = url.toLowerCase();
    return thumbnailPatterns.some(pattern => urlLower.includes(pattern));
  }

  /**
   * 生成URL模式匹配报告
   */
  public generateMatchingReport(url: string, config: CDNConfig): {
    url: string;
    isRelativePath: boolean;
    isAbsoluteUrl: boolean;
    isLocalDevelopmentUrl: boolean;
    isErrorDomain: boolean;
    isCorrectCDNDomain: boolean;
    isApiFilesPath: boolean;
    isR2StorageUrl: boolean;
    isProductionCDNUrl: boolean;
    isMediaFile: boolean;
    isThumbnailUrl: boolean;
    needsUrlFix: boolean;
    extractedPath: string;
    extractedDomain: string | null;
  } {
    return {
      url,
      isRelativePath: this.isRelativePath(url),
      isAbsoluteUrl: this.isAbsoluteUrl(url),
      isLocalDevelopmentUrl: this.isLocalDevelopmentUrl(url, config),
      isErrorDomain: this.isErrorDomain(url, config),
      isCorrectCDNDomain: this.isCorrectCDNDomain(url, config),
      isApiFilesPath: this.isApiFilesPath(url),
      isR2StorageUrl: this.isR2StorageUrl(url),
      isProductionCDNUrl: this.isProductionCDNUrl(url),
      isMediaFile: this.isMediaFile(url),
      isThumbnailUrl: this.isThumbnailUrl(url),
      needsUrlFix: this.needsUrlFix(url, config),
      extractedPath: this.extractUrlPath(url),
      extractedDomain: this.extractDomain(url),
    };
  }
}

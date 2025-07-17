/**
 * @fileoverview URL生成器
 * @description 专门负责CDN和存储URL的生成
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { URLGenerationOptions } from './types';

/**
 * URL生成器类
 */
export class URLGenerator {
  /**
   * URL编码文件名（处理中文字符）
   */
  public encodeFilename(filename: string): string {
    return encodeURIComponent(filename);
  }

  /**
   * 生成CDN访问URL (环境变量驱动)
   */
  public generateCDNUrl(key: string, options: URLGenerationOptions = {}): string {
    const {
      forceHttps = true,
      encodeFilename = true,
      customDomain
    } = options;

    // 优先使用自定义域名，然后是CDN域名，最后是endpoint
    let cdnDomain = customDomain ||
                    process.env.COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN ||
                    process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN ||
                    process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT;

    if (!cdnDomain) {
      throw new Error('未配置CDN域名，请设置 COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN 或 COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN');
    }

    // 确保域名格式正确
    cdnDomain = this.normalizeUrl(cdnDomain, forceHttps);

    // 处理文件名编码
    const processedKey = encodeFilename 
      ? key.split('/').map(part => encodeURIComponent(part)).join('/')
      : key;

    return `${cdnDomain}/${processedKey}`;
  }

  /**
   * 生成公开访问URL
   */
  public generatePublicUrl(key: string, options?: URLGenerationOptions): string {
    return this.generateCDNUrl(key, options);
  }

  /**
   * 生成自定义域名URL
   */
  public generateCustomDomainUrl(key: string, options: URLGenerationOptions = {}): string {
    const customDomain = options.customDomain || process.env.COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN;

    if (!customDomain) {
      // 如果没有自定义域名，回退到CDN URL
      return this.generateCDNUrl(key, options);
    }

    // 使用自定义域名生成URL
    return this.generateCDNUrl(key, { ...options, customDomain });
  }

  /**
   * 获取最佳访问URL (优先使用自定义域名)
   */
  public getBestAccessUrl(key: string, options?: URLGenerationOptions): string {
    // 可以根据需要切换使用公开URL或自定义域名
    return this.generatePublicUrl(key, options);
  }

  /**
   * 标准化URL格式
   */
  private normalizeUrl(url: string, forceHttps = true): string {
    let normalizedUrl = url;

    // 确保协议存在
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `${forceHttps ? 'https' : 'http'}://${normalizedUrl}`;
    }

    // 强制使用HTTPS
    if (forceHttps && normalizedUrl.startsWith('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', 'https://');
    }

    // 修复重复的协议问题
    if (normalizedUrl.startsWith('https://https://') || normalizedUrl.startsWith('http://http://')) {
      normalizedUrl = normalizedUrl.replace(/^https?:\/\/https?:\/\//, forceHttps ? 'https://' : 'http://');
    }

    // 移除末尾的斜杠
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    return normalizedUrl;
  }

  /**
   * 验证URL格式
   */
  public validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 提取域名
   */
  public extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return null;
    }
  }

  /**
   * 生成带时间戳的URL（用于缓存破坏）
   */
  public generateTimestampedUrl(key: string, options?: URLGenerationOptions): string {
    const baseUrl = this.generateCDNUrl(key, options);
    const timestamp = Date.now();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${timestamp}`;
  }

  /**
   * 生成带版本的URL
   */
  public generateVersionedUrl(key: string, version: string, options?: URLGenerationOptions): string {
    const baseUrl = this.generateCDNUrl(key, options);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}v=${version}`;
  }

  /**
   * 批量生成URL
   */
  public generateMultipleUrls(keys: string[], options?: URLGenerationOptions): string[] {
    return keys.map(key => this.generateCDNUrl(key, options));
  }

  /**
   * 生成缩略图URL
   */
  public generateThumbnailUrl(key: string, size?: string, options?: URLGenerationOptions): string {
    const thumbnailKey = this.generateThumbnailKey(key, size);
    return this.generateCDNUrl(thumbnailKey, options);
  }

  /**
   * 生成缩略图键名
   */
  private generateThumbnailKey(originalKey: string, size = 'medium'): string {
    const lastDotIndex = originalKey.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${originalKey}_thumb_${size}`;
    }
    
    const nameWithoutExt = originalKey.substring(0, lastDotIndex);
    const extension = originalKey.substring(lastDotIndex);
    return `${nameWithoutExt}_thumb_${size}${extension}`;
  }

  /**
   * 检查URL是否为CDN URL
   */
  public isCDNUrl(url: string): boolean {
    const cdnDomains = [
      process.env.COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN,
      process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
      process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
    ].filter(Boolean);

    return cdnDomains.some(domain => url.startsWith(domain!));
  }

  /**
   * 从URL提取文件键
   */
  public extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // 移除开头的斜杠
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}

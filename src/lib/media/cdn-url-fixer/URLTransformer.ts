/**
 * @fileoverview URL转换器
 * @description 专门负责URL的转换和生成逻辑
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { CDNConfig, URLTransformOptions, URLProcessingContext } from './types';
import { URLPatternMatcher } from './URLPatternMatcher';

/**
 * URL转换器类
 */
export class URLTransformer {
  private readonly context: URLProcessingContext;
  private readonly patternMatcher: URLPatternMatcher;

  constructor(context: URLProcessingContext) {
    this.context = context;
    this.patternMatcher = new URLPatternMatcher(context);
  }

  /**
   * 转换相对路径为CDN URL
   */
  public transformRelativePath(url: string, config: CDNConfig): string {
    if (this.context.environment === 'development') {
      // 开发环境：使用本地代理路径
      if (url.startsWith('/api/files/')) {
        const filePath = url.substring(11); // 去掉 '/api/files/'
        return `/api/media/${filePath}`;
      }
      // 其他相对路径，使用 /api/media/ 代理
      return `/api/media${url}`;
    }

    // 生产环境：使用CDN域名
    return `${config.cdnDomain}${url}`;
  }

  /**
   * 转换/api/files/路径
   */
  public transformApiFilesPath(url: string, config: CDNConfig): string {
    const filePath = this.patternMatcher.extractApiFilesPath(url);
    if (!filePath) return url;

    if (this.context.environment === 'development') {
      return `/api/media/${filePath}`;
    }

    // 生产环境使用配置的CDN域名
    const productionCdnDomain = process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY ||
                               process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN ||
                               config.cdnDomain;

    return `${productionCdnDomain}/${filePath}`;
  }

  /**
   * 转换本地开发URL
   */
  public transformLocalDevelopmentUrl(url: string, config: CDNConfig): string {
    if (this.context.environment !== 'development') {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // 如果是 /api/files/ 路径，转换为 /api/media/ 代理路径
      if (pathname.startsWith('/api/files/')) {
        const filePath = pathname.substring(11); // 去掉 '/api/files/'
        return `/api/media/${filePath}`;
      }

      // 其他本地URL保持不变
      return url;
    } catch {
      return url;
    }
  }

  /**
   * 转换错误域名
   */
  public transformErrorDomain(url: string, config: CDNConfig): string {
    const errorDomain = this.patternMatcher.findBestErrorDomainMatch(url, config);
    if (errorDomain) {
      return url.replace(errorDomain, config.cdnDomain);
    }
    return url;
  }

  /**
   * 转换生产CDN URL为开发代理URL
   */
  public transformProductionCDNUrl(url: string): string {
    if (this.context.environment !== 'development') {
      return url;
    }

    const productionCdnDomain = process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY ||
                               process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN;

    if (productionCdnDomain && url.startsWith(productionCdnDomain)) {
      // 提取路径部分，转换为本地代理URL
      const urlPath = url.replace(productionCdnDomain, '');
      const proxyUrl = `/api/media${urlPath}`;

      if (this.context.enableDebugLog) {
        console.log('🔧 开发环境URL转换:', { 原始URL: url, 代理URL: proxyUrl });
      }

      return proxyUrl;
    }

    return url;
  }

  /**
   * 转换R2存储URL
   */
  public transformR2StorageUrl(url: string): string {
    const filePath = this.patternMatcher.extractR2FilePath(url);
    if (!filePath) return url;

    // 返回本地代理URL，确保路径以斜杠开头
    const proxyUrl = `/api/media${filePath.startsWith('/') ? filePath : '/' + filePath}`;

    if (this.context.enableDebugLog) {
      console.log('🔧 R2存储URL转换:', { 原始URL: url, 代理URL: proxyUrl });
    }

    return proxyUrl;
  }

  /**
   * 生成安全的文件名
   */
  public generateSafeFilename(originalName: string): string {
    // 移除或替换不安全的字符
    let safeName = originalName
      // 替换中文字符
      .replace(/[\u4e00-\u9fff]/g, '')
      // 替换特殊字符
      .replace(/[^\w\-_.]/g, '_')
      // 移除多个连续的下划线
      .replace(/_+/g, '_')
      // 移除开头和结尾的下划线
      .replace(/^_+|_+$/g, '');

    // 如果文件名为空或太短，生成一个基于时间戳的名称
    if (safeName.length < 3) {
      const timestamp = Date.now();
      const extension = originalName.split('.').pop() || 'bin';
      safeName = `file_${timestamp}.${extension}`;
    }

    return safeName;
  }

  /**
   * 应用URL转换选项
   */
  public applyTransformOptions(url: string, options: URLTransformOptions): string {
    let transformedUrl = url;

    try {
      const urlObj = new URL(transformedUrl);

      // 强制使用HTTPS
      if (options.forceHttps && urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
      }

      // 移除查询参数
      if (!options.preserveQuery) {
        urlObj.search = '';
      }

      // 移除片段标识符
      if (!options.preserveFragment) {
        urlObj.hash = '';
      }

      // 应用域名映射
      if (options.domainMapping) {
        const currentDomain = `${urlObj.protocol}//${urlObj.host}`;
        for (const [from, to] of Object.entries(options.domainMapping)) {
          if (currentDomain === from) {
            const newUrl = new URL(to);
            urlObj.protocol = newUrl.protocol;
            urlObj.host = newUrl.host;
            break;
          }
        }
      }

      transformedUrl = urlObj.toString();
    } catch {
      // 如果URL解析失败，返回原URL
    }

    return transformedUrl;
  }

  /**
   * 提取URL路径并使用CDN域名
   */
  public extractPathAndUseCDN(url: string, config: CDNConfig): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // 检查是否为外部域名（如Unsplash、其他CDN等）
      const isExternalDomain = !hostname.includes('localhost') &&
                              !hostname.includes('127.0.0.1') &&
                              !hostname.includes('r2.dev') &&
                              !hostname.includes('cloudflarestorage.com') &&
                              !hostname.includes('cosv5.com') &&
                              !hostname.includes('tutu365.cc');

      if (isExternalDomain) {
        // 外部URL直接返回，不进行路径提取和CDN域名组合
        return url;
      }

      // 对于本地或项目相关的URL，才进行路径提取和CDN域名组合
      return `${config.cdnDomain}${urlObj.pathname}`;
    } catch {
      // 如果URL解析失败，返回原URL
      return url;
    }
  }

  /**
   * 批量转换URL
   */
  public transformMultipleUrls(
    urls: (string | null | undefined)[],
    config: CDNConfig,
    transformFn: (url: string, config: CDNConfig) => string
  ): string[] {
    return urls.map(url => {
      if (!url) return '';
      return transformFn(url, config);
    });
  }

  /**
   * 智能URL转换（根据URL类型自动选择转换方法）
   */
  public smartTransform(url: string, config: CDNConfig): string {
    if (!url) return '';

    // 相对路径
    if (this.patternMatcher.isRelativePath(url)) {
      return this.transformRelativePath(url, config);
    }

    // /api/files/ 路径
    if (this.patternMatcher.isApiFilesPath(url)) {
      return this.transformApiFilesPath(url, config);
    }

    // 本地开发URL
    if (this.patternMatcher.isLocalDevelopmentUrl(url, config)) {
      return this.transformLocalDevelopmentUrl(url, config);
    }

    // 错误域名
    if (this.patternMatcher.isErrorDomain(url, config)) {
      return this.transformErrorDomain(url, config);
    }

    // 已经是正确的CDN域名
    if (this.patternMatcher.isCorrectCDNDomain(url, config)) {
      return url;
    }

    // 开发环境的生产CDN URL
    if (this.context.environment === 'development' && this.patternMatcher.isProductionCDNUrl(url)) {
      return this.transformProductionCDNUrl(url);
    }

    // R2存储URL
    if (this.patternMatcher.isR2StorageUrl(url)) {
      return this.transformR2StorageUrl(url);
    }

    // 其他情况，尝试提取路径部分并使用CDN域名
    return this.extractPathAndUseCDN(url, config);
  }
}

/**
 * @fileoverview 重构后的CDN URL修复器主类
 * @description 专门负责CDN URL的修复和优化
 * @author Augment AI
 * @date 2025-07-15
 * @version 2.0.0
 */

import { cdnConfig } from '../cdn-config-manager';
import type { 
  CDNConfig, 
  MediaObject, 
  CDNConnectivityResult, 
  URLDiagnosisResult,
  URLProcessingContext 
} from './types';
import { URLValidator } from './URLValidator';
import { URLPatternMatcher } from './URLPatternMatcher';
import { URLTransformer } from './URLTransformer';

/**
 * 重构后的CDN URL修复器类
 */
export class CDNUrlFixer {
  private readonly context: URLProcessingContext;
  private readonly validator: URLValidator;
  private readonly patternMatcher: URLPatternMatcher;
  private readonly transformer: URLTransformer;

  constructor(enableDebugLog = false) {
    this.context = {
      environment: (process.env.NODE_ENV as any) || 'development',
      enableDebugLog,
      source: 'CDNUrlFixer',
      userAgent: 'CoserEden-CDNUrlFixer/2.0'
    };

    this.validator = new URLValidator(this.context);
    this.patternMatcher = new URLPatternMatcher(this.context);
    this.transformer = new URLTransformer(this.context);

    // 开发环境强制重新加载CDN配置
    if (this.context.environment === 'development') {
      console.log('🔄 开发环境：重新加载CDN配置...');
      cdnConfig.reloadConfig();
      console.log('✅ CDN配置重新加载完成');
      console.log('🔍 当前白名单域名:', cdnConfig.getConfig().whitelistDomains);
    }
  }

  /**
   * 获取当前CDN配置（动态）
   */
  public getCDNConfig(): CDNConfig {
    const config = cdnConfig.getConfig();

    return {
      // 主CDN域名
      cdnDomain: config.primaryDomain,

      // 备用CDN域名（按优先级排序）
      fallbackDomains: config.backupDomains,

      // 需要替换的错误域名（从环境变量获取）
      errorDomains: (process.env.COSEREEDEN_CDN_ERROR_DOMAINS || '').split(',').filter(Boolean),

      // 本地开发域名
      localDomains: (process.env.COSEREEDEN_LOCAL_DOMAINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').split(',').filter(Boolean),
    };
  }

  /**
   * 修复媒体URL，确保使用正确的CDN域名
   */
  public fixMediaUrl(url: string | null | undefined): string {
    if (!url) return '';

    // 调试日志
    if (this.context.enableDebugLog) {
      console.log('🔧 fixMediaUrl 被调用:', url);
    }

    // 获取当前动态配置
    const config = this.getCDNConfig();
    
    if (this.context.enableDebugLog) {
      console.log('🔧 当前CDN配置:', config);
    }

    // 安全验证：检查URL是否包含恶意内容
    if (!this.validator.isUrlSafe(url)) {
      console.warn('检测到不安全的URL，已拒绝处理:', url);
      return '';
    }

    // 使用智能转换
    const result = this.transformer.smartTransform(url, config);

    // 检查是否为白名单域名
    if (!cdnConfig.isDomainWhitelisted(result)) {
      console.warn('域名不在白名单中，已拒绝处理:', result);
      console.warn('🔍 当前白名单域名:', cdnConfig.getConfig().whitelistDomains);
      console.warn('🔍 检查的URL:', result);

      // 开发环境下，如果是R2域名，尝试重新加载配置
      if (this.context.environment === 'development' && result.includes('r2.dev')) {
        console.log('🔄 检测到R2域名被拒绝，尝试重新加载配置...');
        cdnConfig.reloadConfig();
        console.log('✅ 配置重新加载完成，新的白名单:', cdnConfig.getConfig().whitelistDomains);

        // 重新检查
        if (cdnConfig.isDomainWhitelisted(result)) {
          console.log('✅ 重新加载后域名验证通过');
        } else {
          console.warn('❌ 重新加载后域名仍然被拒绝');
          return '';
        }
      } else {
        return '';
      }
    }

    if (this.context.enableDebugLog) {
      console.log('🔧 fixMediaUrl 返回结果:', result);
    }

    return result;
  }

  /**
   * 批量修复媒体URL
   */
  public fixMediaUrls(urls: (string | null | undefined)[]): string[] {
    return urls.map(url => this.fixMediaUrl(url));
  }

  /**
   * 修复媒体对象的URL字段
   */
  public fixMediaObject<T extends Record<string, any>>(
    media: T,
    urlFields: (keyof T)[] = ['url', 'cdnUrl', 'thumbnailUrl']
  ): T {
    const fixed = { ...media };

    for (const field of urlFields) {
      if (fixed[field] && typeof fixed[field] === 'string') {
        (fixed as any)[field] = this.fixMediaUrl(fixed[field] as string);
      }
    }

    return fixed;
  }

  /**
   * 批量修复媒体对象数组
   */
  public fixMediaObjects<T extends Record<string, any>>(
    mediaArray: T[],
    urlFields: (keyof T)[] = ['url', 'cdnUrl', 'thumbnailUrl']
  ): T[] {
    return mediaArray.map(media => this.fixMediaObject(media, urlFields));
  }

  /**
   * 检查URL是否需要修复
   */
  public needsUrlFix(url: string | null | undefined): boolean {
    if (!url) return false;
    const config = this.getCDNConfig();
    return this.patternMatcher.needsUrlFix(url, config);
  }

  /**
   * 获取媒体URL的最佳版本
   */
  public getBestMediaUrl(media: MediaObject): string {
    // 调试日志
    if (this.context.enableDebugLog) {
      console.log('📸 getBestMediaUrl 被调用:', media);
    }

    // 优先使用CDN URL
    if (media.cdnUrl) {
      if (this.context.enableDebugLog) {
        console.log('📸 使用 cdnUrl:', media.cdnUrl);
      }
      const result = this.fixMediaUrl(media.cdnUrl);
      if (this.context.enableDebugLog) {
        console.log('📸 fixMediaUrl 返回:', result);
      }
      return result;
    }

    // 其次使用主URL
    if (media.url) {
      if (this.context.enableDebugLog) {
        console.log('📸 使用 url:', media.url);
      }
      const result = this.fixMediaUrl(media.url);
      if (this.context.enableDebugLog) {
        console.log('📸 fixMediaUrl 返回:', result);
      }
      return result;
    }

    // 最后使用缩略图URL
    if (media.thumbnailUrl) {
      if (this.context.enableDebugLog) {
        console.log('📸 使用 thumbnailUrl:', media.thumbnailUrl);
      }
      const result = this.fixMediaUrl(media.thumbnailUrl);
      if (this.context.enableDebugLog) {
        console.log('📸 fixMediaUrl 返回:', result);
      }
      return result;
    }

    if (this.context.enableDebugLog) {
      console.log('📸 没有可用的URL，返回空字符串');
    }
    return '';
  }

  /**
   * 获取视频缩略图的最佳URL
   */
  public getBestVideoThumbnailUrl(media: MediaObject): string {
    // 优先使用缩略图URL
    if (media.thumbnailUrl) {
      return this.fixMediaUrl(media.thumbnailUrl);
    }

    // 其次使用CDN URL
    if (media.cdnUrl) {
      return this.fixMediaUrl(media.cdnUrl);
    }

    // 最后使用主URL
    if (media.url) {
      return this.fixMediaUrl(media.url);
    }

    return '';
  }

  /**
   * 检查CDN连通性
   */
  public async checkCdnConnectivity(): Promise<CDNConnectivityResult> {
    const startTime = Date.now();

    try {
      const config = this.getCDNConfig();

      // 使用HEAD请求检查CDN连通性
      const response = await fetch(`${config.cdnDomain}/health-check`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 媒体URL诊断工具
   */
  public async diagnoseMediaUrl(url: string): Promise<URLDiagnosisResult> {
    const fixed = this.fixMediaUrl(url);
    const needsFix = this.needsUrlFix(url);

    // 检查可访问性
    const { accessible } = await this.validator.validateMediaUrl(fixed);

    const recommendations: string[] = [];

    if (needsFix) {
      recommendations.push('URL使用了错误的域名，已自动修复为CDN域名');
    }

    if (!accessible) {
      recommendations.push('URL无法访问，请检查文件是否存在');
    }

    if (url.includes('%')) {
      recommendations.push('URL包含编码字符，可能影响访问');
    }

    return {
      original: url,
      fixed,
      needsFix,
      accessible,
      recommendations,
    };
  }

  /**
   * 生成安全的文件名
   */
  public generateSafeFilename(originalName: string): string {
    return this.transformer.generateSafeFilename(originalName);
  }
}

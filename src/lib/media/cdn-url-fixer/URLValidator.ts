/**
 * @fileoverview URL验证器
 * @description 专门负责URL的安全验证和可访问性检查
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { 
  URLValidationResult, 
  SecurityValidationOptions, 
  URLProcessingContext 
} from './types';

/**
 * URL验证器类
 */
export class URLValidator {
  private readonly context: URLProcessingContext;

  constructor(context: URLProcessingContext) {
    this.context = context;
  }

  /**
   * URL安全验证
   */
  public isUrlSafe(
    url: string, 
    options: SecurityValidationOptions = {}
  ): boolean {
    const {
      allowJavaScript = false,
      allowDataUrl = false,
      customMaliciousPatterns = []
    } = options;

    // 基础恶意模式
    const baseMaliciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /onfocus=/i,
      /onblur=/i,
    ];

    // 根据选项过滤模式
    let maliciousPatterns = baseMaliciousPatterns.filter(pattern => {
      if (!allowJavaScript && pattern.source.includes('javascript')) return true;
      if (!allowDataUrl && pattern.source.includes('data')) return true;
      return !pattern.source.includes('javascript') && !pattern.source.includes('data');
    });

    // 添加自定义模式
    maliciousPatterns = [...maliciousPatterns, ...customMaliciousPatterns];

    const isSafe = !maliciousPatterns.some(pattern => pattern.test(url));

    if (this.context.enableDebugLog) {
      console.log(`🔒 URL安全验证: ${url} -> ${isSafe ? '安全' : '不安全'}`);
    }

    return isSafe;
  }

  /**
   * 验证URL格式是否正确
   */
  public isValidUrlFormat(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      // 检查是否为相对路径
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  }

  /**
   * 验证URL是否可访问
   */
  public async validateMediaUrl(url: string): Promise<URLValidationResult> {
    try {
      if (this.context.enableDebugLog) {
        console.log(`🌐 检查URL可访问性: ${url}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        headers: {
          'User-Agent': this.context.userAgent || 'CoserEden-URLValidator/1.0'
        }
      });

      clearTimeout(timeoutId);

      const result: URLValidationResult = {
        accessible: response.ok,
        status: response.status,
      };

      if (this.context.enableDebugLog) {
        console.log(`✅ URL可访问性检查完成: ${url} -> ${result.accessible}`);
      }

      return result;
    } catch (error) {
      const result: URLValidationResult = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      if (this.context.enableDebugLog) {
        console.log(`❌ URL可访问性检查失败: ${url} -> ${result.error}`);
      }

      return result;
    }
  }

  /**
   * 批量验证URL可访问性
   */
  public async validateMultipleUrls(urls: string[]): Promise<URLValidationResult[]> {
    const promises = urls.map(url => this.validateMediaUrl(url));
    return Promise.all(promises);
  }

  /**
   * 检查URL是否为图片
   */
  public isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(ext)) ||
           urlLower.includes('image') ||
           urlLower.includes('img');
  }

  /**
   * 检查URL是否为视频
   */
  public isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    const urlLower = url.toLowerCase();
    
    return videoExtensions.some(ext => urlLower.includes(ext)) ||
           urlLower.includes('video');
  }

  /**
   * 检查URL是否为音频
   */
  public isAudioUrl(url: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'];
    const urlLower = url.toLowerCase();
    
    return audioExtensions.some(ext => urlLower.includes(ext)) ||
           urlLower.includes('audio');
  }

  /**
   * 获取URL的媒体类型
   */
  public getMediaType(url: string): 'image' | 'video' | 'audio' | 'unknown' {
    if (this.isImageUrl(url)) return 'image';
    if (this.isVideoUrl(url)) return 'video';
    if (this.isAudioUrl(url)) return 'audio';
    return 'unknown';
  }

  /**
   * 验证URL长度是否合理
   */
  public isValidUrlLength(url: string, maxLength = 2048): boolean {
    return url.length <= maxLength;
  }

  /**
   * 检查URL是否包含敏感信息
   */
  public containsSensitiveInfo(url: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /session/i,
      /admin/i,
      /private/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(url));
  }

  /**
   * 综合URL验证
   */
  public async comprehensiveValidation(url: string): Promise<{
    isValid: boolean;
    isSafe: boolean;
    isAccessible: boolean;
    mediaType: string;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 格式验证
    const isValid = this.isValidUrlFormat(url);
    if (!isValid) {
      issues.push('URL格式无效');
      recommendations.push('请检查URL格式是否正确');
    }

    // 安全验证
    const isSafe = this.isUrlSafe(url);
    if (!isSafe) {
      issues.push('URL包含不安全内容');
      recommendations.push('请移除URL中的恶意代码');
    }

    // 长度验证
    if (!this.isValidUrlLength(url)) {
      issues.push('URL长度超过限制');
      recommendations.push('请缩短URL长度');
    }

    // 敏感信息检查
    if (this.containsSensitiveInfo(url)) {
      issues.push('URL可能包含敏感信息');
      recommendations.push('请确保URL不包含密码、令牌等敏感信息');
    }

    // 可访问性验证
    let isAccessible = false;
    if (isValid && isSafe) {
      const validation = await this.validateMediaUrl(url);
      isAccessible = validation.accessible;
      
      if (!isAccessible) {
        issues.push('URL无法访问');
        recommendations.push('请检查URL是否正确或文件是否存在');
      }
    }

    // 媒体类型检测
    const mediaType = this.getMediaType(url);

    return {
      isValid,
      isSafe,
      isAccessible,
      mediaType,
      issues,
      recommendations,
    };
  }
}

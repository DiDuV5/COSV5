/**
 * @fileoverview 智能URL生成器
 * @description 提供动态URL生成，支持CDN和本地存储的自动切换
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - 环境变量配置
 * - 存储错误处理
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

/**
 * URL生成策略
 */
export type UrlStrategy = 'cdn-first' | 'local-first' | 'cdn-only' | 'local-only' | 'hybrid';

/**
 * URL生成配置
 */
export interface UrlGeneratorConfig {
  strategy: UrlStrategy;
  cdnDomain?: string;
  localDomain?: string;
  fallbackEnabled: boolean;
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
}

/**
 * URL生成结果
 */
export interface GeneratedUrls {
  primary: string;
  fallback?: string;
  strategy: UrlStrategy;
  cdnAvailable: boolean;
  warnings: string[];
}

/**
 * 智能URL生成器
 */
export class UrlGenerator {
  private config: UrlGeneratorConfig;
  private cdnHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckPromise: Promise<boolean> | null = null;

  constructor(config?: Partial<UrlGeneratorConfig>) {
    this.config = {
      strategy: 'hybrid',
      cdnDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
      localDomain: process.env.NEXT_PUBLIC_APP_URL || process.env.COSEREEDEN_NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      fallbackEnabled: true,
      healthCheckEnabled: false, // 在服务端环境中禁用网络检查
      healthCheckInterval: 5 * 60 * 1000, // 5分钟
      ...config
    };

    // 初始化CDN健康状态
    this.initializeCdnHealth();
  }

  /**
   * 生成文件URL
   */
  generateFileUrl(
    filename: string,
    folder: string = 'uploads',
    options?: {
      forceStrategy?: UrlStrategy;
      skipHealthCheck?: boolean;
    }
  ): GeneratedUrls {
    const warnings: string[] = [];
    const strategy = options?.forceStrategy || this.config.strategy;

    // 检查CDN健康状态
    if (!options?.skipHealthCheck && this.config.healthCheckEnabled) {
      this.checkCdnHealth();
    }

    // 生成基础路径
    const filePath = `${folder}/${filename}`;
    // 注意：项目已使用R2存储，不再使用本地路径
    const baseUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev';
    const r2Path = `${baseUrl}/media/${filename}`;

    // 根据策略生成URL
    switch (strategy) {
      case 'cdn-only':
        return this.generateCdnOnlyUrls(filePath, warnings);

      case 'local-only':
        return this.generateLocalOnlyUrls(r2Path, warnings);

      case 'cdn-first':
        return this.generateCdnFirstUrls(filePath, r2Path, warnings);

      case 'local-first':
        return this.generateLocalFirstUrls(filePath, r2Path, warnings);

      case 'hybrid':
      default:
        return this.generateHybridUrls(filePath, r2Path, warnings);
    }
  }

  /**
   * 生成仅CDN URL
   */
  private generateCdnOnlyUrls(filePath: string, warnings: string[]): GeneratedUrls {
    if (!this.config.cdnDomain || this.config.cdnDomain === 'undefined') {
      warnings.push('CDN域名未配置，无法生成CDN URL');
      throw new Error('CDN域名未配置');
    }

    if (!this.cdnHealthy) {
      warnings.push('CDN不可用，但策略要求仅使用CDN');
    }

    return {
      primary: `${this.config.cdnDomain}/${filePath}`,
      strategy: 'cdn-only',
      cdnAvailable: this.cdnHealthy,
      warnings
    };
  }

  /**
   * 生成仅R2存储URL
   */
  private generateLocalOnlyUrls(r2Path: string, warnings: string[]): GeneratedUrls {
    return {
      primary: r2Path,
      strategy: 'local-only',
      cdnAvailable: this.cdnHealthy,
      warnings
    };
  }

  /**
   * 生成CDN优先URL
   */
  private generateCdnFirstUrls(filePath: string, r2Path: string, warnings: string[]): GeneratedUrls {
    const cdnAvailable = this.config.cdnDomain &&
      this.config.cdnDomain !== 'undefined' &&
      this.cdnHealthy;

    if (cdnAvailable) {
      return {
        primary: `${this.config.cdnDomain}/${filePath}`,
        fallback: this.config.fallbackEnabled ? r2Path : undefined,
        strategy: 'cdn-first',
        cdnAvailable: true,
        warnings
      };
    } else {
      if (!this.config.cdnDomain || this.config.cdnDomain === 'undefined') {
        warnings.push('CDN域名未配置，回退到本地URL');
      } else if (!this.cdnHealthy) {
        warnings.push('CDN不可用，回退到本地URL');
      }

      return {
        primary: r2Path,
        strategy: 'cdn-first',
        cdnAvailable: false,
        warnings
      };
    }
  }

  /**
   * 生成R2存储优先URL
   */
  private generateLocalFirstUrls(filePath: string, r2Path: string, warnings: string[]): GeneratedUrls {
    const result: GeneratedUrls = {
      primary: r2Path,
      strategy: 'local-first',
      cdnAvailable: this.cdnHealthy,
      warnings
    };

    // 如果启用了回退且CDN可用，提供CDN作为备用
    if (this.config.fallbackEnabled &&
      this.config.cdnDomain &&
      this.config.cdnDomain !== 'undefined' &&
      this.cdnHealthy) {
      result.fallback = `${this.config.cdnDomain}/${filePath}`;
    }

    return result;
  }

  /**
   * 生成混合URL（智能选择）
   */
  private generateHybridUrls(filePath: string, r2Path: string, warnings: string[]): GeneratedUrls {
    const cdnConfigured = this.config.cdnDomain && this.config.cdnDomain !== 'undefined';

    if (cdnConfigured && this.cdnHealthy) {
      // CDN可用，优先使用CDN
      return {
        primary: `${this.config.cdnDomain}/${filePath}`,
        fallback: this.config.fallbackEnabled ? r2Path : undefined,
        strategy: 'hybrid',
        cdnAvailable: true,
        warnings
      };
    } else {
      // CDN不可用或未配置，使用R2存储
      if (!cdnConfigured) {
        warnings.push('CDN域名未配置，使用R2存储');
      } else if (!this.cdnHealthy) {
        warnings.push('CDN健康检查失败，使用R2存储');
      }

      return {
        primary: r2Path,
        fallback: cdnConfigured ? `${this.config.cdnDomain}/${filePath}` : undefined,
        strategy: 'hybrid',
        cdnAvailable: false,
        warnings
      };
    }
  }

  /**
   * 初始化CDN健康状态
   */
  private initializeCdnHealth(): void {
    // 基于配置判断初始状态
    this.cdnHealthy = !!(this.config.cdnDomain && this.config.cdnDomain !== 'undefined');
  }

  /**
   * 检查CDN健康状态
   */
  private checkCdnHealth(): void {
    const now = Date.now();

    // 如果最近检查过，跳过
    if (now - this.lastHealthCheck < this.config.healthCheckInterval) {
      return;
    }

    // 如果正在检查，跳过
    if (this.healthCheckPromise) {
      return;
    }

    this.lastHealthCheck = now;

    // 在服务端环境中，我们不进行实际的网络检查
    // 而是基于配置和错误历史来判断
    this.cdnHealthy = !!(this.config.cdnDomain && this.config.cdnDomain !== 'undefined');
  }

  /**
   * 手动设置CDN健康状态
   */
  setCdnHealth(healthy: boolean): void {
    this.cdnHealthy = healthy;
    this.lastHealthCheck = Date.now();
  }

  /**
   * 获取当前配置
   */
  getConfig(): UrlGeneratorConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<UrlGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeCdnHealth();
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): {
    cdnHealthy: boolean;
    lastCheck: number;
    cdnConfigured: boolean;
  } {
    return {
      cdnHealthy: this.cdnHealthy,
      lastCheck: this.lastHealthCheck,
      cdnConfigured: !!(this.config.cdnDomain && this.config.cdnDomain !== 'undefined')
    };
  }
}

/**
 * 默认URL生成器实例
 */
export const defaultUrlGenerator = new UrlGenerator();

/**
 * 便捷函数：生成媒体文件URL
 */
export function generateMediaUrl(
  filename: string,
  options?: {
    strategy?: UrlStrategy;
    folder?: string;
  }
): GeneratedUrls {
  return defaultUrlGenerator.generateFileUrl(
    filename,
    options?.folder || 'uploads',
    { forceStrategy: options?.strategy }
  );
}

/**
 * 便捷函数：生成缩略图URL
 */
export function generateThumbnailUrl(filename: string): GeneratedUrls {
  return generateMediaUrl(filename, { folder: 'uploads' });
}

/**
 * 便捷函数：检查URL是否为CDN URL
 */
export function isCdnUrl(url: string): boolean {
  const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN;
  return !!(cdnDomain && url.includes(cdnDomain));
}

/**
 * 便捷函数：将本地URL转换为CDN URL
 */
export function convertToOptimalUrl(url: string): string {
  // 如果已经是CDN URL，直接返回
  if (isCdnUrl(url)) {
    return url;
  }

  // 提取文件名
  const filename = url.split('/').pop();
  if (!filename) {
    return url;
  }

  // 生成最优URL
  const result = generateMediaUrl(filename);
  return result.primary;
}

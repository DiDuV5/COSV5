/**
 * @fileoverview 智能URL解析器 - 存储故障转移机制
 * @description 实现智能URL生成和故障转移，优先使用CDN，失败时自动切换到备用方案
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

import { StorageFactory } from './object-storage/storage-factory';

interface UrlOption {
  type: 'cdn' | 'public' | 'custom' | 'local';
  url: string;
  priority: number;
  healthCheck?: boolean;
}

interface UrlResolverConfig {
  enableHealthCheck: boolean;
  healthCheckTimeout: number;
  cacheHealthResults: boolean;
  cacheTtl: number;
}

/**
 * 智能URL解析器类
 */
export class SmartUrlResolver {
  private static instance: SmartUrlResolver | null = null;
  private healthCache = new Map<string, { healthy: boolean; timestamp: number }>();
  private config: UrlResolverConfig;
  private r2Config: any = null;

  constructor(config?: Partial<UrlResolverConfig>) {
    this.config = {
      enableHealthCheck: true,
      healthCheckTimeout: 5000,
      cacheHealthResults: true,
      cacheTtl: 5 * 60 * 1000, // 5分钟
      ...config
    };
  }

  /**
   * 获取R2配置（懒加载）
   */
  private getR2Config() {
    if (!this.r2Config) {
      try {
        this.r2Config = StorageFactory.createCloudflareR2Config();
      } catch (error) {
        console.error('❌ 无法获取R2配置:', error);
        // 提供默认配置以避免完全失败
        this.r2Config = {
          cdnDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || '',
          customDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN || '',
          publicUrl: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || '',
        };
      }
    }
    return this.r2Config;
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<UrlResolverConfig>): SmartUrlResolver {
    if (!SmartUrlResolver.instance) {
      SmartUrlResolver.instance = new SmartUrlResolver(config);
    }
    return SmartUrlResolver.instance;
  }

  /**
   * 生成所有可能的URL选项
   */
  private generateUrlOptions(key: string): UrlOption[] {
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');

    const r2Config = this.getR2Config();
    const options: UrlOption[] = [
      {
        type: 'cdn' as const,
        url: `${r2Config.cdnDomain}/${encodedKey}`,
        priority: 1,
        healthCheck: true
      },
      {
        type: 'custom' as const,
        url: `${r2Config.customDomain}/${encodedKey}`,
        priority: 2,
        healthCheck: true
      },
      {
        type: 'public' as const,
        url: `${r2Config.publicUrl}/${encodedKey}`,
        priority: 3,
        healthCheck: false // 公开URL通常更稳定，跳过健康检查
      },
      {
        type: 'local' as const,
        url: `${process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev'}/media/${encodedKey}`,
        priority: 4,
        healthCheck: false // R2存储URL，跳过健康检查
      }
    ];

    return options.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 检查URL健康状态
   */
  private async checkUrlHealth(url: string): Promise<boolean> {
    // 检查缓存
    if (this.config.cacheHealthResults) {
      const cached = this.healthCache.get(url);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
        return cached.healthy;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'CoserEden-HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);
      const healthy = response.ok;

      // 缓存结果
      if (this.config.cacheHealthResults) {
        this.healthCache.set(url, {
          healthy,
          timestamp: Date.now()
        });
      }

      return healthy;
    } catch (error) {
      // 缓存失败结果
      if (this.config.cacheHealthResults) {
        this.healthCache.set(url, {
          healthy: false,
          timestamp: Date.now()
        });
      }
      return false;
    }
  }

  /**
   * 解析最佳URL
   */
  async resolveBestUrl(key: string): Promise<{
    url: string;
    type: string;
    fallbackUsed: boolean;
    checkedUrls: Array<{ url: string; type: string; healthy: boolean }>;
  }> {
    const urlOptions = this.generateUrlOptions(key);
    const checkedUrls: Array<{ url: string; type: string; healthy: boolean }> = [];

    for (const option of urlOptions) {
      let healthy = true;

      // 如果启用健康检查且该选项需要检查
      if (this.config.enableHealthCheck && option.healthCheck) {
        healthy = await this.checkUrlHealth(option.url);
      }

      checkedUrls.push({
        url: option.url,
        type: option.type,
        healthy
      });

      // 如果健康，返回这个URL
      if (healthy) {
        return {
          url: option.url,
          type: option.type,
          fallbackUsed: option.priority > 1,
          checkedUrls
        };
      }
    }

    // 如果所有URL都不健康，返回最后一个（本地备用）
    const lastOption = urlOptions[urlOptions.length - 1];
    return {
      url: lastOption.url,
      type: lastOption.type,
      fallbackUsed: true,
      checkedUrls
    };
  }

  /**
   * 快速解析URL（不进行健康检查）
   */
  resolveFastUrl(key: string): string {
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    const r2Config = this.getR2Config();

    // 优先使用公开URL，因为它最稳定
    return `${r2Config.publicUrl}/${encodedKey}`;
  }

  /**
   * 解析CDN URL（如果CDN可用）
   */
  async resolveCdnUrl(key: string): Promise<string | null> {
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    const r2Config = this.getR2Config();

    // 修复重复的https://问题
    let cdnDomain = r2Config.cdnDomain || '';
    if (cdnDomain.startsWith('https://https://')) {
      cdnDomain = cdnDomain.replace('https://https://', 'https://');
    }

    const cdnUrl = `${cdnDomain}/${encodedKey}`;

    if (this.config.enableHealthCheck) {
      const healthy = await this.checkUrlHealth(cdnUrl);
      return healthy ? cdnUrl : null;
    }

    return cdnUrl;
  }

  /**
   * 清除健康检查缓存
   */
  clearHealthCache(): void {
    this.healthCache.clear();
  }

  /**
   * 获取健康检查统计
   */
  getHealthStats(): {
    totalChecked: number;
    healthyCount: number;
    unhealthyCount: number;
    cacheSize: number;
  } {
    const entries = Array.from(this.healthCache.values());
    const healthyCount = entries.filter(entry => entry.healthy).length;

    return {
      totalChecked: entries.length,
      healthyCount,
      unhealthyCount: entries.length - healthyCount,
      cacheSize: this.healthCache.size
    };
  }

  /**
   * 预热健康检查缓存
   */
  async warmupHealthCache(keys: string[]): Promise<void> {
    const promises = keys.map(async (key) => {
      const options = this.generateUrlOptions(key);
      const healthCheckPromises = options
        .filter(option => option.healthCheck)
        .map(option => this.checkUrlHealth(option.url));

      await Promise.allSettled(healthCheckPromises);
    });

    await Promise.allSettled(promises);
  }
}

/**
 * 便捷函数：获取最佳URL
 */
export async function getBestMediaUrl(key: string): Promise<string> {
  const resolver = SmartUrlResolver.getInstance();
  const result = await resolver.resolveBestUrl(key);

  // 记录故障转移信息
  if (result.fallbackUsed) {
    console.warn(`🔄 媒体URL故障转移: ${key} -> ${result.type}`, {
      checkedUrls: result.checkedUrls
    });
  }

  return result.url;
}

/**
 * 便捷函数：获取快速URL（不检查健康状态）
 */
export function getFastMediaUrl(key: string): string {
  const resolver = SmartUrlResolver.getInstance();
  return resolver.resolveFastUrl(key);
}

/**
 * 便捷函数：获取CDN URL（如果可用）
 */
export async function getCdnMediaUrl(key: string): Promise<string | null> {
  const resolver = SmartUrlResolver.getInstance();
  return resolver.resolveCdnUrl(key);
}

/**
 * 便捷函数：批量预热URL健康检查
 */
export async function warmupMediaUrls(keys: string[]): Promise<void> {
  const resolver = SmartUrlResolver.getInstance();
  await resolver.warmupHealthCache(keys);
}

/**
 * 便捷函数：获取健康检查统计
 */
export function getUrlHealthStats(): ReturnType<SmartUrlResolver['getHealthStats']> {
  const resolver = SmartUrlResolver.getInstance();
  return resolver.getHealthStats();
}

// 默认导出
export default SmartUrlResolver;

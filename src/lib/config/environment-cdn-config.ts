/**
 * @fileoverview 环境自适应CDN配置管理器
 * @description 根据环境自动选择合适的CDN域名和配置
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { EnvironmentCDNConfig } from '@/lib/config/environment-cdn-config'
 * const cdnConfig = new EnvironmentCDNConfig()
 * const activeDomain = await cdnConfig.getActiveDomain()
 *
 * @dependencies
 * - Node.js 18+
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持环境自动检测和域名切换
 */

import { z } from 'zod';

/**
 * 环境类型定义
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * CDN域名配置接口
 */
export interface CDNDomainConfig {
  url: string;
  name: string;
  environment: Environment[];
  requiresSSL: boolean;
  priority: number;
  healthCheckPath?: string;
  fallbackDomains?: string[];
}

/**
 * 环境CDN配置接口
 */
export interface EnvironmentCDNConfiguration {
  currentEnvironment: Environment;
  domains: CDNDomainConfig[];
  activeDomain: CDNDomainConfig;
  sslConfig: {
    enabled: boolean;
    enforceHTTPS: boolean;
    certificateStatus: 'valid' | 'invalid' | 'pending' | 'unknown';
  };
  fallbackStrategy: 'immediate' | 'gradual' | 'manual';
}

/**
 * 环境CDN配置验证Schema
 */
const EnvironmentCDNConfigSchema = z.object({
  currentEnvironment: z.enum(['development', 'staging', 'production']),
  domains: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    environment: z.array(z.enum(['development', 'staging', 'production'])),
    requiresSSL: z.boolean(),
    priority: z.number(),
    healthCheckPath: z.string().optional(),
    fallbackDomains: z.array(z.string()).optional(),
  })),
  activeDomain: z.object({
    url: z.string().url(),
    name: z.string(),
    environment: z.array(z.enum(['development', 'staging', 'production'])),
    requiresSSL: z.boolean(),
    priority: z.number(),
  }),
  sslConfig: z.object({
    enabled: z.boolean(),
    enforceHTTPS: z.boolean(),
    certificateStatus: z.enum(['valid', 'invalid', 'pending', 'unknown']),
  }),
  fallbackStrategy: z.enum(['immediate', 'gradual', 'manual']),
});

/**
 * 环境自适应CDN配置管理器
 */
export class EnvironmentCDNConfig {
  private config: EnvironmentCDNConfiguration;
  private healthCheckCache: Map<string, { status: boolean; lastCheck: Date }> = new Map();

  constructor() {
    this.config = this.initializeConfiguration();
  }

  /**
   * 初始化配置
   */
  private initializeConfiguration(): EnvironmentCDNConfiguration {
    const environment = this.detectEnvironment();
    const domains = this.loadDomainConfigurations();
    const activeDomain = this.selectActiveDomain(domains, environment);

    return {
      currentEnvironment: environment,
      domains,
      activeDomain,
      sslConfig: {
        enabled: environment === 'production',
        enforceHTTPS: environment === 'production',
        certificateStatus: 'unknown',
      },
      fallbackStrategy: 'immediate',
    };
  }

  /**
   * 检测当前环境
   */
  private detectEnvironment(): Environment {
    // 优先级：环境变量 > NODE_ENV > 域名检测 > 默认值
    
    // 1. 检查显式环境变量
    const explicitEnv = process.env.COSEREEDEN_CDN_ENVIRONMENT as Environment;
    if (explicitEnv && ['development', 'staging', 'production'].includes(explicitEnv)) {
      return explicitEnv;
    }

    // 2. 检查NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'development') return 'development';

    // 3. 检查域名特征
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return 'development';
      }
      if (hostname.includes('staging') || hostname.includes('test')) {
        return 'staging';
      }
      if (hostname.includes('cosereeden.com') || hostname.includes('tutu365.cc')) {
        return 'production';
      }
    }

    // 4. 检查端口
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '3000' || port === '3001') {
        return 'development';
      }
    }

    // 5. 默认值
    return 'development';
  }

  /**
   * 加载域名配置（从环境变量）
   */
  private loadDomainConfigurations(): CDNDomainConfig[] {
    // 从环境变量获取配置
    const r2CdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN;
    const r2Endpoint = process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT;
    const r2Bucket = process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME;
    const productionCdnDomain = process.env.COSEREEDEN_CDN_PRODUCTION_DOMAIN;
    const stagingCdnDomain = process.env.COSEREEDEN_CDN_STAGING_DOMAIN;
    const backupCdnDomain = process.env.COSEREEDEN_CDN_BACKUP_DOMAIN;

    const domains: CDNDomainConfig[] = [];

    // R2 CDN域名（如果配置了）
    if (r2CdnDomain) {
      domains.push({
        url: r2CdnDomain,
        name: 'R2 CDN域名',
        environment: ['development', 'staging'],
        requiresSSL: true,
        priority: 100,
        healthCheckPath: '/favicon.ico',
        fallbackDomains: r2Endpoint && r2Bucket ? [`${r2Endpoint}/${r2Bucket}`] : [],
      });
    }

    // 生产CDN主域名（如果配置了）
    if (productionCdnDomain) {
      domains.push({
        url: productionCdnDomain,
        name: '生产CDN主域名',
        environment: ['production'],
        requiresSSL: true,
        priority: 100,
        healthCheckPath: '/favicon.ico',
        fallbackDomains: [
          backupCdnDomain,
          r2CdnDomain,
          r2Endpoint && r2Bucket ? `${r2Endpoint}/${r2Bucket}` : undefined
        ].filter(Boolean) as string[],
      });
    }

    // Staging CDN域名（如果配置了）
    if (stagingCdnDomain) {
      domains.push({
        url: stagingCdnDomain,
        name: 'Staging CDN域名',
        environment: ['staging'],
        requiresSSL: true,
        priority: 90,
        healthCheckPath: '/favicon.ico',
        fallbackDomains: [
          r2CdnDomain,
          r2Endpoint && r2Bucket ? `${r2Endpoint}/${r2Bucket}` : undefined
        ].filter(Boolean) as string[],
      });
    }

    // R2直接访问（总是可用）
    if (r2Endpoint && r2Bucket) {
      domains.push({
        url: `${r2Endpoint}/${r2Bucket}`,
        name: 'R2直接访问',
        environment: ['development', 'staging', 'production'],
        requiresSSL: true,
        priority: 50,
        healthCheckPath: '/',
      });
    }

    // 如果没有配置任何域名，返回默认的本地配置
    if (domains.length === 0) {
      console.warn('未配置CDN域名，使用本地默认配置');
      domains.push({
        url: 'http://localhost:3000',
        name: '本地开发',
        environment: ['development'],
        requiresSSL: false,
        priority: 10,
        healthCheckPath: '/favicon.ico',
      });
    }

    return domains;
  }

  /**
   * 选择活跃域名
   */
  private selectActiveDomain(domains: CDNDomainConfig[], environment: Environment): CDNDomainConfig {
    // 筛选适用于当前环境的域名
    const applicableDomains = domains.filter(domain => 
      domain.environment.includes(environment)
    );

    // 按优先级排序
    applicableDomains.sort((a, b) => b.priority - a.priority);

    // 返回最高优先级的域名
    return applicableDomains[0] || domains[0];
  }

  /**
   * 获取当前活跃域名
   */
  public async getActiveDomain(): Promise<string> {
    // 检查当前活跃域名的健康状态
    const isHealthy = await this.checkDomainHealth(this.config.activeDomain.url);
    
    if (isHealthy) {
      return this.config.activeDomain.url;
    }

    // 如果当前域名不健康，尝试故障切换
    const fallbackDomain = await this.performFailover();
    return fallbackDomain || this.config.activeDomain.url;
  }

  /**
   * 检查域名健康状态
   */
  public async checkDomainHealth(domainUrl: string): Promise<boolean> {
    const cacheKey = domainUrl;
    const cached = this.healthCheckCache.get(cacheKey);
    
    // 如果缓存未过期（5分钟），返回缓存结果
    if (cached && Date.now() - cached.lastCheck.getTime() < 5 * 60 * 1000) {
      return cached.status;
    }

    try {
      const domain = this.config.domains.find(d => d.url === domainUrl);
      const healthCheckPath = domain?.healthCheckPath || '/favicon.ico';
      const testUrl = `${domainUrl}${healthCheckPath}`;

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      const isHealthy = response.status < 500; // 4xx是可接受的，5xx表示服务器错误
      
      // 更新缓存
      this.healthCheckCache.set(cacheKey, {
        status: isHealthy,
        lastCheck: new Date(),
      });

      return isHealthy;
    } catch (error) {
      // 网络错误视为不健康
      this.healthCheckCache.set(cacheKey, {
        status: false,
        lastCheck: new Date(),
      });
      return false;
    }
  }

  /**
   * 执行故障切换
   */
  public async performFailover(): Promise<string | null> {
    const currentDomain = this.config.activeDomain;
    const fallbackDomains = currentDomain.fallbackDomains || [];

    // 测试备用域名
    for (const fallbackUrl of fallbackDomains) {
      const isHealthy = await this.checkDomainHealth(fallbackUrl);
      if (isHealthy) {
        console.log(`CDN故障切换: ${currentDomain.url} -> ${fallbackUrl}`);
        return fallbackUrl;
      }
    }

    // 如果没有可用的备用域名，尝试其他环境的域名
    const otherDomains = this.config.domains.filter(d => 
      d.url !== currentDomain.url && 
      d.environment.includes(this.config.currentEnvironment)
    );

    for (const domain of otherDomains) {
      const isHealthy = await this.checkDomainHealth(domain.url);
      if (isHealthy) {
        console.log(`CDN故障切换: ${currentDomain.url} -> ${domain.url}`);
        return domain.url;
      }
    }

    return null;
  }

  /**
   * 切换环境
   */
  public switchEnvironment(newEnvironment: Environment): void {
    this.config.currentEnvironment = newEnvironment;
    this.config.activeDomain = this.selectActiveDomain(this.config.domains, newEnvironment);
    
    // 更新SSL配置
    this.config.sslConfig.enabled = newEnvironment === 'production';
    this.config.sslConfig.enforceHTTPS = newEnvironment === 'production';
    
    console.log(`环境切换: ${newEnvironment}, 活跃域名: ${this.config.activeDomain.url}`);
  }

  /**
   * 获取当前配置
   */
  public getConfiguration(): EnvironmentCDNConfiguration {
    return { ...this.config };
  }

  /**
   * 获取环境特定的域名列表
   */
  public getEnvironmentDomains(environment?: Environment): CDNDomainConfig[] {
    const targetEnv = environment || this.config.currentEnvironment;
    return this.config.domains.filter(domain => 
      domain.environment.includes(targetEnv)
    );
  }

  /**
   * 验证SSL证书状态
   */
  public async validateSSLCertificate(domainUrl: string): Promise<'valid' | 'invalid' | 'pending' | 'unknown'> {
    try {
      const response = await fetch(domainUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      // 如果请求成功且是HTTPS，认为SSL有效
      if (response.ok && domainUrl.startsWith('https://')) {
        return 'valid';
      }

      return 'unknown';
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('certificate') || error.message.includes('SSL')) {
          return 'invalid';
        }
      }
      return 'unknown';
    }
  }

  /**
   * 生成CDN URL
   */
  public generateCDNUrl(filePath: string, domainUrl?: string): string {
    const activeDomain = domainUrl || this.config.activeDomain.url;
    
    // 确保文件路径以/开头
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    
    return `${activeDomain}${normalizedPath}`;
  }
}

// 导出单例实例
export const environmentCDNConfig = new EnvironmentCDNConfig();

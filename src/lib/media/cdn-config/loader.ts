/**
 * @fileoverview CDN配置加载器
 * @description 从环境变量加载和验证CDN配置
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import {
  CDNConfig,
  CDNEnvironment,
  CDNConfigSchema,
  CDN_ENV_KEYS,
  DEFAULT_CDN_CONFIG,
  DEFAULT_DOMAINS,
  DEFAULT_WHITELIST_DOMAINS,
  DEFAULT_ALLOWED_ORIGINS,
} from './types';

/**
 * CDN配置加载器类
 */
export class CDNConfigLoader {
  /**
   * 从环境变量加载配置
   */
  static loadConfigFromEnv(): CDNConfig {
    const envValue = process.env[CDN_ENV_KEYS.ENVIRONMENT] || process.env.NODE_ENV || 'development';
    const environment: CDNEnvironment =
      envValue === 'production' ? 'production' :
      envValue === 'staging' ? 'staging' : 'development';

    // 根据环境选择主域名
    const { primaryDomain, backupDomains } = this.loadDomainConfig(environment);

    const rawConfig = {
      environment,
      primaryDomain,
      backupDomains,
      whitelistDomains: this.loadWhitelistDomains(),
      enableHotlinkProtection: this.loadBooleanEnv(CDN_ENV_KEYS.ENABLE_HOTLINK_PROTECTION, true),
      rateLimitPerMinute: this.loadNumberEnv(
        CDN_ENV_KEYS.RATE_LIMIT_REQUESTS_PER_MINUTE,
        DEFAULT_CDN_CONFIG.RATE_LIMIT_PER_MINUTE
      ),
      maxFileSizeMB: this.loadNumberEnv(
        CDN_ENV_KEYS.MAX_FILE_SIZE_MB,
        DEFAULT_CDN_CONFIG.MAX_FILE_SIZE_MB
      ),
      allowedOrigins: this.loadAllowedOrigins(),
      enableAccessLog: this.loadBooleanEnv(CDN_ENV_KEYS.ENABLE_ACCESS_LOG, true),
      enableAnomalyDetection: this.loadBooleanEnv(CDN_ENV_KEYS.ENABLE_ANOMALY_DETECTION, true),
    };

    // 验证配置
    try {
      return CDNConfigSchema.parse(rawConfig) as CDNConfig;
    } catch (error) {
      console.error('CDN配置验证失败:', error);
      // 返回默认安全配置
      return this.getDefaultConfig();
    }
  }

  /**
   * 加载域名配置
   */
  private static loadDomainConfig(environment: CDNEnvironment): {
    primaryDomain: string;
    backupDomains: string[];
  } {
    let primaryDomain: string;
    let backupDomains: string[];

    if (environment === 'production') {
      primaryDomain =
        process.env[CDN_ENV_KEYS.PRODUCTION_PRIMARY] ||
        process.env[CDN_ENV_KEYS.PRIMARY_DOMAIN] ||
        DEFAULT_DOMAINS.PRODUCTION;

      backupDomains = this.parseDomainsFromEnv(
        process.env[CDN_ENV_KEYS.PRODUCTION_BACKUP] ||
        process.env[CDN_ENV_KEYS.BACKUP_DOMAINS] || ''
      );
    } else {
      // 开发环境：优先使用开发环境专用配置
      primaryDomain =
        process.env[CDN_ENV_KEYS.DEVELOPMENT_PRIMARY] ||
        process.env['COSEREEDEN_CDN_DEVELOPMENT_PRIMARY'] ||
        DEFAULT_DOMAINS.DEVELOPMENT;

      backupDomains = this.parseDomainsFromEnv(
        process.env[CDN_ENV_KEYS.BACKUP_DOMAINS] || ''
      );
    }

    // 如果备用域名为空，使用主域名作为备用
    if (backupDomains.length === 0) {
      backupDomains = [primaryDomain];
    }

    return { primaryDomain, backupDomains };
  }

  /**
   * 加载白名单域名
   */
  private static loadWhitelistDomains(): string[] {
    const envDomains = this.parseDomainsFromEnv(
      process.env[CDN_ENV_KEYS.WHITELIST_DOMAINS] || ''
    );

    // 合并环境变量域名和默认域名
    const allDomains = [...envDomains, ...DEFAULT_WHITELIST_DOMAINS];

    // 添加 Cloudflare R2 相关域名
    if (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN]) {
      const r2CdnDomain = (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN] || '')
        .replace(/https?:\/\//, '');
      if (r2CdnDomain) {
        allDomains.push(r2CdnDomain);
      }
    }

    if (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_ENDPOINT]) {
      const r2Endpoint = (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_ENDPOINT] || '')
        .replace(/https?:\/\//, '');
      if (r2Endpoint) {
        allDomains.push(r2Endpoint);
      }
    }

    // 去重并返回
    return [...new Set(allDomains)];
  }

  /**
   * 加载允许的来源
   */
  private static loadAllowedOrigins(): string[] {
    const envOrigins = this.parseDomainsFromEnv(
      process.env[CDN_ENV_KEYS.ALLOWED_ORIGINS] || ''
    );

    if (envOrigins.length > 0) {
      return envOrigins;
    }

    // 使用默认允许的来源
    return [...DEFAULT_ALLOWED_ORIGINS];
  }

  /**
   * 从环境变量解析域名列表
   */
  private static parseDomainsFromEnv(envValue: string): string[] {
    return envValue
      .split(',')
      .filter(domain => domain.trim())
      .map(domain => domain.trim());
  }

  /**
   * 加载布尔类型环境变量
   */
  private static loadBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    return value === 'true';
  }

  /**
   * 加载数字类型环境变量
   */
  private static loadNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 获取默认安全配置
   */
  static getDefaultConfig(): CDNConfig {
    // 在生产环境中，必须设置CDN域名
    if (process.env.NODE_ENV === 'production') {
      if (!process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN]) {
        throw new Error('CLOUDFLARE_R2_CDN_DOMAIN is required in production environment');
      }
    }

    // 使用环境变量中的CDN域名，避免硬编码
    const defaultCDN =
      process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN] ||
      process.env[CDN_ENV_KEYS.DEVELOPMENT_PRIMARY] ||
      (process.env.NODE_ENV === 'development' ? DEFAULT_DOMAINS.DEVELOPMENT : '');

    if (!defaultCDN) {
      throw new Error('CDN domain must be configured via environment variables');
    }

    const allowedOrigins = this.parseDomainsFromEnv(
      process.env[CDN_ENV_KEYS.ALLOWED_ORIGINS] || DEFAULT_ALLOWED_ORIGINS.join(',')
    );

    // 构建白名单域名列表
    const whitelistDomains = [
      defaultCDN.replace(/https?:\/\//, ''),
      ...DEFAULT_WHITELIST_DOMAINS,
    ];

    // 如果有配置 R2 CDN 域名，也添加到白名单
    if (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN]) {
      const r2CdnDomain = (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_CDN_DOMAIN] || '')
        .replace(/https?:\/\//, '');
      if (r2CdnDomain) whitelistDomains.push(r2CdnDomain);
    }

    // 如果有配置 R2 端点，也添加到白名单
    if (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_ENDPOINT]) {
      const r2Endpoint = (process.env[CDN_ENV_KEYS.CLOUDFLARE_R2_ENDPOINT] || '')
        .replace(/https?:\/\//, '');
      if (r2Endpoint) whitelistDomains.push(r2Endpoint);
    }

    return {
      environment: (process.env.NODE_ENV === 'production' ? 'production' :
                   (process.env.NODE_ENV as string) === 'staging' ? 'staging' : 'development') as CDNEnvironment,
      primaryDomain: defaultCDN,
      backupDomains: [defaultCDN],
      whitelistDomains: [...new Set(whitelistDomains)], // 去重
      enableHotlinkProtection: true,
      rateLimitPerMinute: DEFAULT_CDN_CONFIG.RATE_LIMIT_PER_MINUTE,
      maxFileSizeMB: DEFAULT_CDN_CONFIG.MAX_FILE_SIZE_MB,
      allowedOrigins,
      enableAccessLog: true,
      enableAnomalyDetection: true,
    };
  }

  /**
   * 验证配置的有效性
   */
  static validateConfig(config: CDNConfig): boolean {
    try {
      CDNConfigSchema.parse(config);
      return true;
    } catch {
      return false;
    }
  }
}

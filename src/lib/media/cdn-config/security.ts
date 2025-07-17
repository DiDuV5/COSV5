/**
 * @fileoverview CDN安全验证模块
 * @description 提供CDN相关的安全验证功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { CDNConfig, CDNSecurityConfig } from './types';

/**
 * CDN安全验证器类
 */
export class CDNSecurityValidator {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * 验证域名是否在白名单中
   */
  isDomainWhitelisted(domain: string): boolean {
    // 提取域名部分（去掉协议、端口和路径）
    let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // 去掉端口号（如果存在）
    const portIndex = cleanDomain.indexOf(':');
    if (portIndex !== -1) {
      cleanDomain = cleanDomain.substring(0, portIndex);
    }

    return this.config.whitelistDomains.some(whitelistDomain => {
      // 精确匹配
      if (cleanDomain === whitelistDomain) {
        return true;
      }

      // 子域名匹配
      if (cleanDomain.endsWith('.' + whitelistDomain)) {
        return true;
      }

      // 通配符匹配 (*.example.com)
      if (whitelistDomain.startsWith('*.')) {
        const baseDomain = whitelistDomain.substring(2); // 移除 "*."
        return cleanDomain.endsWith('.' + baseDomain) || cleanDomain === baseDomain;
      }

      return false;
    });
  }

  /**
   * 验证来源是否被允许
   */
  isOriginAllowed(origin: string): boolean {
    return this.config.allowedOrigins.includes(origin) ||
           this.config.allowedOrigins.includes('*');
  }

  /**
   * 验证文件大小是否符合限制
   */
  isFileSizeAllowed(fileSizeBytes: number): boolean {
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;
    return fileSizeBytes <= maxSizeBytes;
  }

  /**
   * 验证请求频率是否超过限制
   */
  isRateLimitExceeded(requestCount: number, timeWindowMinutes: number = 1): boolean {
    const requestsPerMinute = requestCount / timeWindowMinutes;
    return requestsPerMinute > this.config.rateLimitPerMinute;
  }

  /**
   * 验证URL是否安全
   */
  isUrlSafe(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // 检查协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // 检查域名是否在白名单中
      if (!this.isDomainWhitelisted(urlObj.hostname)) {
        return false;
      }

      // 检查是否包含危险字符
      const dangerousPatterns = [
        /\.\./,  // 路径遍历
        /[<>'"]/,  // XSS字符
        /javascript:/i,  // JavaScript协议
        /data:/i,  // Data协议
      ];

      return !dangerousPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  }

  /**
   * 验证Referer头是否合法（防盗链）
   */
  isRefererAllowed(referer: string | undefined): boolean {
    // 如果未启用防盗链保护，允许所有请求
    if (!this.config.enableHotlinkProtection) {
      return true;
    }

    // 如果没有Referer头，根据配置决定是否允许
    if (!referer) {
      // 通常允许直接访问（没有Referer）
      return true;
    }

    try {
      const refererUrl = new URL(referer);
      return this.isDomainWhitelisted(refererUrl.hostname);
    } catch {
      // 无效的Referer URL
      return false;
    }
  }

  /**
   * 验证User-Agent是否合法
   */
  isUserAgentAllowed(userAgent: string | undefined): boolean {
    if (!userAgent) {
      return false;
    }

    // 检查是否为已知的恶意User-Agent
    const blockedUserAgents = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /wget/i,
      /curl/i,
    ];

    // 在开发环境中允许curl等工具
    if (this.config.environment === 'development') {
      return true;
    }

    return !blockedUserAgents.some(pattern => pattern.test(userAgent));
  }

  /**
   * 检查IP地址是否被阻止
   */
  isIpBlocked(ip: string): boolean {
    // 这里可以实现IP黑名单检查
    // 目前返回false，表示不阻止任何IP

    // 检查是否为内网IP（在生产环境中可能需要阻止）
    if (this.config.environment === 'production') {
      const privateIpPatterns = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^127\./,
        /^localhost$/i,
      ];

      return privateIpPatterns.some(pattern => pattern.test(ip));
    }

    return false;
  }

  /**
   * 获取安全配置
   */
  getSecurityConfig(): CDNSecurityConfig {
    return {
      whitelistDomains: [...this.config.whitelistDomains],
      allowedOrigins: [...this.config.allowedOrigins],
      enableHotlinkProtection: this.config.enableHotlinkProtection,
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      maxFileSizeMB: this.config.maxFileSizeMB,
      enableAccessLog: this.config.enableAccessLog,
      enableAnomalyDetection: this.config.enableAnomalyDetection,
    };
  }

  /**
   * 验证请求头的安全性
   */
  validateRequestHeaders(headers: Record<string, string | undefined>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证Origin
    if (headers.origin && !this.isOriginAllowed(headers.origin)) {
      errors.push(`Origin not allowed: ${headers.origin}`);
    }

    // 验证Referer
    if (!this.isRefererAllowed(headers.referer)) {
      errors.push(`Referer not allowed: ${headers.referer}`);
    }

    // 验证User-Agent
    if (!this.isUserAgentAllowed(headers['user-agent'])) {
      errors.push(`User-Agent not allowed: ${headers['user-agent']}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成安全报告
   */
  generateSecurityReport(): {
    config: CDNSecurityConfig;
    checks: {
      hotlinkProtection: boolean;
      rateLimiting: boolean;
      fileSizeLimit: boolean;
      domainWhitelist: boolean;
      originControl: boolean;
    };
    recommendations: string[];
  } {
    const config = this.getSecurityConfig();
    const recommendations: string[] = [];

    // 检查安全配置并生成建议
    if (!config.enableHotlinkProtection) {
      recommendations.push('建议启用防盗链保护');
    }

    if (config.rateLimitPerMinute > 500) {
      recommendations.push('速率限制设置过高，建议降低到合理范围');
    }

    if (config.maxFileSizeMB > 500) {
      recommendations.push('文件大小限制过高，可能影响性能');
    }

    if (config.whitelistDomains.length === 0) {
      recommendations.push('建议配置域名白名单以提高安全性');
    }

    if (config.allowedOrigins.includes('*')) {
      recommendations.push('允许所有来源可能存在安全风险，建议限制特定域名');
    }

    return {
      config,
      checks: {
        hotlinkProtection: config.enableHotlinkProtection,
        rateLimiting: config.rateLimitPerMinute > 0,
        fileSizeLimit: config.maxFileSizeMB > 0,
        domainWhitelist: config.whitelistDomains.length > 0,
        originControl: !config.allowedOrigins.includes('*'),
      },
      recommendations,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: CDNConfig): void {
    this.config = newConfig;
  }
}

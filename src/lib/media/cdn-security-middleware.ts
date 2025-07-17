/**
 * @fileoverview CDN安全中间件
 * @description 提供CDN访问控制、防盗链保护、频率限制和异常检测功能
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { CDNSecurityMiddleware } from './cdn-security-middleware'
 * const security = new CDNSecurityMiddleware()
 * const isAllowed = await security.validateRequest(request)
 *
 * @dependencies
 * - ./cdn-config-manager: CDN配置管理器
 * - Node.js crypto: 加密功能
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，实现完整的安全防护功能
 */

import { NextRequest } from 'next/server';
import { cdnConfig } from './cdn-config-manager';
import crypto from 'crypto';

/**
 * 访问记录接口
 */
interface AccessRecord {
  ip: string;
  userAgent: string;
  referer?: string;
  timestamp: number;
  url: string;
  status: 'allowed' | 'blocked' | 'rate_limited';
  reason?: string;
}

/**
 * 频率限制记录
 */
interface RateLimitRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

/**
 * 异常检测结果
 */
interface AnomalyDetectionResult {
  isAnomalous: boolean;
  score: number;
  reasons: string[];
}

/**
 * CDN安全中间件类
 */
export class CDNSecurityMiddleware {
  private rateLimitMap = new Map<string, RateLimitRecord>();
  private accessLogs: AccessRecord[] = [];
  private blockedIPs = new Set<string>();
  private trustedProxies = new Set<string>(['127.0.0.1', '::1']);

  constructor() {
    // 定期清理过期的频率限制记录
    setInterval(() => this.cleanupRateLimitRecords(), 60000); // 每分钟清理一次
    
    // 定期清理访问日志（保留最近1000条）
    setInterval(() => this.cleanupAccessLogs(), 300000); // 每5分钟清理一次
  }

  /**
   * 验证请求是否被允许
   */
  public async validateRequest(request: NextRequest): Promise<{
    allowed: boolean;
    reason?: string;
    status: number;
  }> {
    const config = cdnConfig.getSecurityConfig();
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const url = request.url;

    // 检查IP是否被封禁
    if (this.blockedIPs.has(clientIP)) {
      this.logAccess({
        ip: clientIP,
        userAgent,
        referer,
        timestamp: Date.now(),
        url,
        status: 'blocked',
        reason: 'IP被封禁'
      });
      return { allowed: false, reason: 'IP被封禁', status: 403 };
    }

    // 检查来源验证（防盗链保护）
    if (config.enableHotlinkProtection && !this.validateReferer(referer)) {
      this.logAccess({
        ip: clientIP,
        userAgent,
        referer,
        timestamp: Date.now(),
        url,
        status: 'blocked',
        reason: '来源验证失败'
      });
      return { allowed: false, reason: '来源验证失败', status: 403 };
    }

    // 检查频率限制
    if (!this.checkRateLimit(clientIP, config.rateLimitPerMinute)) {
      this.logAccess({
        ip: clientIP,
        userAgent,
        referer,
        timestamp: Date.now(),
        url,
        status: 'rate_limited',
        reason: '超出频率限制'
      });
      return { allowed: false, reason: '请求过于频繁', status: 429 };
    }

    // 异常检测
    if (config.enableAnomalyDetection) {
      const anomalyResult = this.detectAnomaly(clientIP, userAgent, referer, url);
      if (anomalyResult.isAnomalous && anomalyResult.score > 0.8) {
        this.logAccess({
          ip: clientIP,
          userAgent,
          referer,
          timestamp: Date.now(),
          url,
          status: 'blocked',
          reason: `异常检测: ${anomalyResult.reasons.join(', ')}`
        });
        return { allowed: false, reason: '检测到异常行为', status: 403 };
      }
    }

    // 记录正常访问
    this.logAccess({
      ip: clientIP,
      userAgent,
      referer,
      timestamp: Date.now(),
      url,
      status: 'allowed'
    });

    return { allowed: true, status: 200 };
  }

  /**
   * 获取客户端真实IP
   */
  private getClientIP(request: NextRequest): string {
    // 检查代理头部
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (xRealIP) return xRealIP;
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    // 从连接信息获取IP（在Edge Runtime中可能不可用）
    return request.ip || '127.0.0.1';
  }

  /**
   * 验证来源（防盗链保护）
   */
  private validateReferer(referer: string): boolean {
    if (!referer) {
      // 允许直接访问（无referer）
      return true;
    }

    const config = cdnConfig.getSecurityConfig();
    
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      
      // 检查是否在允许的来源列表中
      return config.allowedOrigins.includes(refererOrigin) || 
             config.allowedOrigins.includes('*');
    } catch {
      // 无效的referer URL
      return false;
    }
  }

  /**
   * 检查频率限制
   */
  private checkRateLimit(clientIP: string, limitPerMinute: number): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1分钟窗口

    const record = this.rateLimitMap.get(clientIP);
    
    if (!record) {
      // 首次访问
      this.rateLimitMap.set(clientIP, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
      return true;
    }

    // 如果记录过期，重置计数
    if (record.firstRequest < windowStart) {
      this.rateLimitMap.set(clientIP, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
      return true;
    }

    // 检查是否超出限制
    if (record.count >= limitPerMinute) {
      return false;
    }

    // 更新记录
    record.count++;
    record.lastRequest = now;
    
    return true;
  }

  /**
   * 异常检测
   */
  private detectAnomaly(ip: string, userAgent: string, referer: string, url: string): AnomalyDetectionResult {
    const reasons: string[] = [];
    let score = 0;

    // 检查User-Agent
    if (!userAgent || userAgent.length < 10) {
      reasons.push('可疑的User-Agent');
      score += 0.3;
    }

    // 检查是否为已知的爬虫或机器人
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /wget/i, /curl/i, /python/i, /java/i
    ];
    
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      reasons.push('检测到爬虫行为');
      score += 0.4;
    }

    // 检查请求频率异常
    const record = this.rateLimitMap.get(ip);
    if (record && record.count > 50) { // 1分钟内超过50次请求
      reasons.push('请求频率异常');
      score += 0.5;
    }

    // 检查URL模式
    if (url.includes('..') || url.includes('%2e%2e')) {
      reasons.push('可疑的路径遍历');
      score += 0.8;
    }

    // 检查是否尝试访问敏感文件
    const sensitivePatterns = [
      /\.env/i, /\.git/i, /\.ssh/i, /config/i,
      /admin/i, /backup/i, /database/i
    ];
    
    if (sensitivePatterns.some(pattern => pattern.test(url))) {
      reasons.push('尝试访问敏感文件');
      score += 0.6;
    }

    return {
      isAnomalous: score > 0.5,
      score,
      reasons
    };
  }

  /**
   * 记录访问日志
   */
  private logAccess(record: AccessRecord): void {
    const config = cdnConfig.getSecurityConfig();
    
    if (config.enableAccessLog) {
      this.accessLogs.push(record);
      
      // 如果是被阻止的请求，输出到控制台
      if (record.status !== 'allowed') {
        console.warn(`CDN安全: ${record.status} - ${record.ip} - ${record.reason} - ${record.url}`);
      }
    }
  }

  /**
   * 清理过期的频率限制记录
   */
  private cleanupRateLimitRecords(): void {
    const now = Date.now();
    const expireTime = now - 60000; // 1分钟前

    const entries = Array.from(this.rateLimitMap.entries());
    for (const [ip, record] of entries) {
      if (record.lastRequest < expireTime) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  /**
   * 清理访问日志
   */
  private cleanupAccessLogs(): void {
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000); // 保留最近1000条
    }
  }

  /**
   * 获取访问统计
   */
  public getAccessStats(): {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    rateLimitedRequests: number;
    topIPs: Array<{ ip: string; count: number }>;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1小时前
    
    const recentLogs = this.accessLogs.filter(log => log.timestamp > oneHourAgo);
    
    const ipCounts = new Map<string, number>();
    let allowedCount = 0;
    let blockedCount = 0;
    let rateLimitedCount = 0;

    for (const log of recentLogs) {
      ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);
      
      switch (log.status) {
        case 'allowed':
          allowedCount++;
          break;
        case 'blocked':
          blockedCount++;
          break;
        case 'rate_limited':
          rateLimitedCount++;
          break;
      }
    }

    const topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: recentLogs.length,
      allowedRequests: allowedCount,
      blockedRequests: blockedCount,
      rateLimitedRequests: rateLimitedCount,
      topIPs
    };
  }

  /**
   * 手动封禁IP
   */
  public blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    console.log(`IP已被封禁: ${ip}`);
  }

  /**
   * 解封IP
   */
  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    console.log(`IP已被解封: ${ip}`);
  }

  /**
   * 获取被封禁的IP列表
   */
  public getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }
}

// 导出单例实例
export const cdnSecurity = new CDNSecurityMiddleware();

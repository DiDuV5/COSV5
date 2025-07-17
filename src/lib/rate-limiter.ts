/**
 * @fileoverview 速率限制器
 * @description 防止暴力破解和API滥用的速率限制实现
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean; // 是否跳过失败请求
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// 内存存储（生产环境应使用 Redis）
const store: RateLimitStore = {};

/**
 * 清理过期的记录
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime <= now) {
      delete store[key];
    }
  });
}

/**
 * 获取客户端标识符
 */
function getClientIdentifier(req: NextRequest): string {
  // 优先使用真实IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
  
  // 对于登录请求，可以结合用户名
  const userAgent = req.headers.get('user-agent') || '';
  const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 10);
  
  return `${ip}:${userAgentHash}`;
}

/**
 * 速率限制检查
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const identifier = getClientIdentifier(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // 清理过期记录
  cleanupExpiredRecords();
  
  // 获取或创建记录
  if (!store[identifier] || store[identifier].resetTime <= now) {
    store[identifier] = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  const record = store[identifier];
  
  // 检查是否超过限制
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }
  
  // 增加计数
  record.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * 登录速率限制配置
 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 5, // 最多5次尝试
  skipSuccessfulRequests: true, // 成功登录不计入限制
};

/**
 * 注册速率限制配置
 */
export const REGISTER_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1小时
  maxRequests: 3, // 最多3次注册
};

/**
 * API 通用速率限制配置
 */
export const API_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 100, // 最多100次请求
};

/**
 * 严格的速率限制（用于敏感操作）
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 10, // 最多10次请求
};

/**
 * 创建速率限制中间件
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: NextRequest) => {
    const result = checkRateLimit(req, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: '请求过于频繁，请稍后再试',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      );
    }
    
    return null; // 允许继续
  };
}

/**
 * IP 黑名单检查
 */
const IP_BLACKLIST = new Set<string>();

export function addToBlacklist(ip: string, duration: number = 24 * 60 * 60 * 1000) {
  IP_BLACKLIST.add(ip);
  
  // 自动移除
  setTimeout(() => {
    IP_BLACKLIST.delete(ip);
  }, duration);
}

export function isBlacklisted(ip: string): boolean {
  return IP_BLACKLIST.has(ip);
}

/**
 * 检查可疑活动
 */
export function detectSuspiciousActivity(req: NextRequest): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const userAgent = req.headers.get('user-agent') || '';
  const ip = getClientIdentifier(req);
  
  // 检查 User-Agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('缺少或异常的 User-Agent');
  }
  
  // 检查常见的爬虫标识
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('检测到爬虫或自动化工具');
  }
  
  // 检查是否在黑名单中
  if (isBlacklisted(ip)) {
    reasons.push('IP地址在黑名单中');
  }
  
  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * 自适应速率限制
 * 根据用户行为动态调整限制
 */
export class AdaptiveRateLimiter {
  private userScores: Map<string, number> = new Map();
  private baseConfig: RateLimitConfig;
  
  constructor(baseConfig: RateLimitConfig) {
    this.baseConfig = baseConfig;
  }
  
  /**
   * 更新用户信誉分数
   */
  updateUserScore(identifier: string, action: 'success' | 'failure' | 'suspicious') {
    const currentScore = this.userScores.get(identifier) || 0;
    
    switch (action) {
      case 'success':
        this.userScores.set(identifier, Math.min(100, currentScore + 1));
        break;
      case 'failure':
        this.userScores.set(identifier, Math.max(0, currentScore - 5));
        break;
      case 'suspicious':
        this.userScores.set(identifier, Math.max(0, currentScore - 20));
        break;
    }
  }
  
  /**
   * 获取自适应配置
   */
  getAdaptiveConfig(identifier: string): RateLimitConfig {
    const score = this.userScores.get(identifier) || 50;
    
    // 根据信誉分数调整限制
    const multiplier = score >= 80 ? 1.5 : score <= 20 ? 0.5 : 1;
    
    return {
      ...this.baseConfig,
      maxRequests: Math.floor(this.baseConfig.maxRequests * multiplier),
    };
  }
}

// 导出全局自适应限制器实例
export const adaptiveLoginLimiter = new AdaptiveRateLimiter(LOGIN_RATE_LIMIT);
export const adaptiveApiLimiter = new AdaptiveRateLimiter(API_RATE_LIMIT);

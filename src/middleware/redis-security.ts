/**
 * @fileoverview 基于Redis的安全中间件
 * @description 集成Redis的安全功能中间件，支持分布式部署
 * @author Augment AI
 * @date 2025-07-02
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig
} from '@/lib/security/redis-rate-limiter';
import {
  ipBlacklist,
  BlacklistReason,
  checkRequestBlacklist
} from '@/lib/security/redis-ip-blacklist';
import { SECURITY_HEADERS, detectMaliciousContent } from '@/lib/input-sanitizer';
import { auditLogger, AuditEventType, AuditLevel } from '@/lib/audit-logger';

/**
 * 安全中间件配置
 */
interface SecurityConfig {
  enableRateLimit: boolean;
  enableSecurityHeaders: boolean;
  enableSuspiciousActivityDetection: boolean;
  enableAuditLogging: boolean;
  enableBlacklist: boolean;
}

/**
 * 获取安全配置
 */
function getSecurityConfig(): SecurityConfig {
  return {
    enableRateLimit: process.env.COSEREEDEN_ENABLE_RATE_LIMITING !== 'false', // 默认启用
    enableSecurityHeaders: process.env.COSEREEDEN_ENABLE_SECURITY_HEADERS !== 'false', // 默认启用
    enableSuspiciousActivityDetection: true,
    enableAuditLogging: process.env.COSEREEDEN_ENABLE_AUDIT_LOGGING !== 'false', // 默认启用
    enableBlacklist: true,
  };
}

/**
 * 获取客户端IP
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
}

/**
 * 应用安全头
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * 检查请求速率限制
 */
async function checkRequestRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  // 根据路径选择速率限制配置
  let rateLimitConfig: RateLimitConfig;

  if (pathname.includes('/api/auth/signin') || pathname.includes('/login')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.LOGIN;
  } else if (pathname.includes('/api/auth/signup') || pathname.includes('/register')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.REGISTER;
  } else if (pathname.includes('/api/upload')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.UPLOAD;
  } else if (pathname.startsWith('/api/')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.API;
  } else {
    rateLimitConfig = RATE_LIMIT_CONFIGS.STRICT;
  }

  const result = await rateLimiter.checkRateLimit(req, rateLimitConfig);

  if (!result.allowed) {
    // 记录速率限制事件
    const config = getSecurityConfig();
    if (config.enableAuditLogging) {
      await auditLogger.logSecurityViolation(
        AuditEventType.RATE_LIMIT_EXCEEDED,
        `速率限制超出: ${pathname}`,
        req,
        {
          pathname,
          remaining: result.remaining,
          resetTime: result.resetTime,
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: '请求过于频繁，请稍后再试',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': result.retryAfter?.toString() || '60',
        },
      }
    );
  }

  return null;
}

/**
 * 检查可疑活动
 */
async function checkSuspiciousActivity(req: NextRequest): Promise<NextResponse | null> {
  const config = getSecurityConfig();

  if (!config.enableSuspiciousActivityDetection) {
    return null;
  }

  // 简化的可疑活动检测
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const ip = getClientIP(req);

  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|java/i,
    /automated|script/i,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious) {
    // 记录可疑活动
    if (config.enableAuditLogging) {
      await auditLogger.logSuspiciousActivity(
        `检测到可疑User-Agent: ${userAgent}`,
        req,
        {
          userAgent,
          referer,
          ip,
          pathname: req.nextUrl.pathname,
        }
      );
    }

    // 对于严重的可疑活动，添加到黑名单
    if (config.enableBlacklist && userAgent.includes('bot')) {
      await ipBlacklist.addToBlacklist(
        ip,
        BlacklistReason.SUSPICIOUS_ACTIVITY,
        60 * 60 * 1000, // 1小时
        `可疑User-Agent: ${userAgent}`
      );

      return new NextResponse(
        JSON.stringify({
          error: 'Access Denied',
          message: '访问被拒绝',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  return null;
}

/**
 * 检查恶意内容
 */
async function checkMaliciousContent(req: NextRequest): Promise<NextResponse | null> {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return null;
  }

  try {
    const body = await req.text();

    if (body) {
      const maliciousCheck = detectMaliciousContent(body);

      if (maliciousCheck.isMalicious) {
        const ip = getClientIP(req);
        const config = getSecurityConfig();

        // 记录恶意内容尝试
        if (config.enableAuditLogging) {
          await auditLogger.logSecurityViolation(
            maliciousCheck.reasons.includes('检测到潜在的脚本注入')
              ? AuditEventType.XSS_ATTEMPT
              : AuditEventType.SQL_INJECTION_ATTEMPT,
            `检测到恶意内容: ${maliciousCheck.reasons.join(', ')}`,
            req,
            {
              reasons: maliciousCheck.reasons,
              ip,
              pathname: req.nextUrl.pathname,
              contentLength: body.length,
            }
          );
        }

        // 添加到黑名单
        if (config.enableBlacklist) {
          await ipBlacklist.addToBlacklist(
            ip,
            BlacklistReason.MALICIOUS_CONTENT,
            24 * 60 * 60 * 1000, // 24小时
            `恶意内容: ${maliciousCheck.reasons.join(', ')}`
          );
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Malicious Content Detected',
            message: '检测到恶意内容，请求被拒绝',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }
  } catch (error: any) {
    // 解析请求体失败，继续处理
    console.warn('解析请求体失败:', error);
  }

  return null;
}

/**
 * 主安全中间件
 */
export async function redisSecurityMiddleware(req: NextRequest): Promise<NextResponse> {
  const config = getSecurityConfig();

  try {
    // 1. 检查IP黑名单
    if (config.enableBlacklist) {
      const isBlocked = await checkRequestBlacklist(req);
      if (isBlocked) {
        if (config.enableAuditLogging) {
          await auditLogger.logSecurityViolation(
            AuditEventType.UNAUTHORIZED_ACCESS,
            '黑名单IP尝试访问',
            req
          );
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Access Denied',
            message: '访问被拒绝',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // 2. 检查速率限制
    if (config.enableRateLimit) {
      const rateLimitResponse = await checkRequestRateLimit(req);
      if (rateLimitResponse) {
        return config.enableSecurityHeaders
          ? applySecurityHeaders(rateLimitResponse)
          : rateLimitResponse;
      }
    }

    // 3. 检查可疑活动
    const suspiciousResponse = await checkSuspiciousActivity(req);
    if (suspiciousResponse) {
      return config.enableSecurityHeaders
        ? applySecurityHeaders(suspiciousResponse)
        : suspiciousResponse;
    }

    // 4. 检查恶意内容
    const maliciousResponse = await checkMaliciousContent(req);
    if (maliciousResponse) {
      return config.enableSecurityHeaders
        ? applySecurityHeaders(maliciousResponse)
        : maliciousResponse;
    }

    // 5. 继续处理请求
    const response = NextResponse.next();

    // 应用安全头
    if (config.enableSecurityHeaders) {
      return applySecurityHeaders(response);
    }

    return response;
  } catch (error) {
    console.error('安全中间件执行失败:', error);

    // 安全中间件失败时，允许请求继续但记录错误
    if (config.enableAuditLogging) {
      await auditLogger.logSecurityViolation(
        AuditEventType.SECURITY_VIOLATION,
        `安全中间件执行失败: ${error}`,
        req,
        { error: String(error) }
      );
    }

    const response = NextResponse.next();
    return config.enableSecurityHeaders
      ? applySecurityHeaders(response)
      : response;
  }
}

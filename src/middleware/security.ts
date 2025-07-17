/**
 * @fileoverview 安全中间件
 * @description 集成所有安全功能的中间件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { AuditEventType, auditLogger } from '@/lib/audit-logger';
import { SECURITY_HEADERS, detectMaliciousContent } from '@/lib/input-sanitizer';
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
    enableRateLimit: process.env.COSEREEDEN_ENABLE_RATE_LIMITING === 'true',
    enableSecurityHeaders: process.env.COSEREEDEN_ENABLE_SECURITY_HEADERS === 'true',
    enableSuspiciousActivityDetection: true,
    enableAuditLogging: process.env.COSEREEDEN_ENABLE_AUDIT_LOGGING === 'true',
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
 * 检查IP黑名单
 */
async function checkIPBlacklist(req: NextRequest): Promise<boolean> {
  const ip = getClientIP(req);
  return await checkRequestBlacklist(req);
}

/**
 * 应用安全头部
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const config = getSecurityConfig();

  if (!config.enableSecurityHeaders) {
    return response;
  }

  // 应用所有安全头部
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * 检查速率限制
 */
async function checkRequestRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const config = getSecurityConfig();

  if (!config.enableRateLimit) {
    return null;
  }

  const pathname = req.nextUrl.pathname;
  let rateLimitConfig;

  // 根据路径选择不同的速率限制
  if (pathname.includes('/api/auth/') || pathname.includes('/auth/')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.LOGIN;
  } else if (pathname.startsWith('/api/')) {
    rateLimitConfig = RATE_LIMIT_CONFIGS.API;
  } else {
    return null; // 不对其他路径进行速率限制
  }

  const result = await rateLimiter.checkRateLimit(req, rateLimitConfig);

  if (!result.allowed) {
    // 记录速率限制事件
    if (config.enableAuditLogging) {
      auditLogger.logSecurityViolation(
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

  const suspiciousCheck = detectMaliciousContent(req.url || '');

  if (suspiciousCheck.isMalicious) {
    const ip = getClientIP(req);

    // 记录可疑活动
    if (config.enableAuditLogging) {
      await auditLogger.logSuspiciousActivity(
        `检测到可疑活动: ${suspiciousCheck.reasons.join(', ')}`,
        req,
        {
          reasons: suspiciousCheck.reasons,
          ip,
          userAgent: req.headers.get('user-agent'),
          pathname: req.nextUrl.pathname,
        }
      );
    }

    // 对于严重的可疑活动，添加到黑名单
    const severeReasons = ['检测到爬虫或自动化工具', 'IP地址在黑名单中'];
    const isSevere = suspiciousCheck.isMalicious;

    if (isSevere && config.enableBlacklist) {
      await ipBlacklist.addToBlacklist(ip, BlacklistReason.SUSPICIOUS_ACTIVITY, 60 * 60 * 1000); // 1小时黑名单

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
  const config = getSecurityConfig();

  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return null;
  }

  try {
    const body = await req.text();

    if (body) {
      const maliciousCheck = detectMaliciousContent(body);

      if (maliciousCheck.isMalicious) {
        const ip = getClientIP(req);

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
          await ipBlacklist.addToBlacklist(ip, BlacklistReason.MALICIOUS_CONTENT, 24 * 60 * 60 * 1000); // 24小时黑名单
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
  } catch (error) {
    // 解析请求体失败，继续处理
    console.warn('解析请求体失败:', error);
  }

  return null;
}

/**
 * 主安全中间件
 */
export async function securityMiddleware(req: NextRequest): Promise<NextResponse> {
  const config = getSecurityConfig();

  // 1. 检查IP黑名单
  if (config.enableBlacklist && await checkIPBlacklist(req)) {
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

  // 2. 检查速率限制
  const rateLimitResponse = await checkRequestRateLimit(req);
  if (rateLimitResponse) {
    return applySecurityHeaders(rateLimitResponse);
  }

  // 3. 检查可疑活动
  const suspiciousResponse = await checkSuspiciousActivity(req);
  if (suspiciousResponse) {
    return applySecurityHeaders(suspiciousResponse);
  }

  // 4. 检查恶意内容
  const maliciousResponse = await checkMaliciousContent(req);
  if (maliciousResponse) {
    return applySecurityHeaders(maliciousResponse);
  }

  // 5. 继续处理请求
  const response = NextResponse.next();

  // 6. 应用安全头部
  return applySecurityHeaders(response);
}

/**
 * 检查路径是否需要安全检查
 */
export function shouldApplySecurity(pathname: string): boolean {
  // 跳过静态文件
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return false;
  }

  // 跳过 Next.js 内部路径
  if (pathname.startsWith('/_next/')) {
    return false;
  }

  return true;
}

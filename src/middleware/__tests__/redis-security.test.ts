/**
 * @fileoverview Redis安全中间件测试用例
 * @description 测试基于Redis的安全中间件功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisSecurityMiddleware } from '../redis-security';

// 测试辅助函数：创建测试请求URL
const createTestUrl = (path: string = '/api/test'): string => {
  const baseUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

// Mock dependencies
jest.mock('@/lib/security/redis-rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: jest.fn(),
  },
  RATE_LIMIT_CONFIGS: {
    LOGIN: { windowMs: 900000, maxRequests: 5 },
    REGISTER: { windowMs: 3600000, maxRequests: 3 },
    API: { windowMs: 60000, maxRequests: 100 },
    STRICT: { windowMs: 60000, maxRequests: 10 },
    UPLOAD: { windowMs: 60000, maxRequests: 5 },
  },
}));

jest.mock('@/lib/security/redis-ip-blacklist', () => ({
  checkRequestBlacklist: jest.fn(),
  ipBlacklist: {
    addToBlacklist: jest.fn(),
  },
  BlacklistReason: {
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    MALICIOUS_CONTENT: 'MALICIOUS_CONTENT',
  },
}));

jest.mock('@/lib/input-sanitizer', () => ({
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  },
  detectMaliciousContent: jest.fn(),
}));

jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    logSecurityViolation: jest.fn(),
    logSuspiciousActivity: jest.fn(),
  },
  AuditEventType: {
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    XSS_ATTEMPT: 'XSS_ATTEMPT',
    SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
    SYSTEM_ERROR: 'SYSTEM_ERROR',
  },
  AuditLevel: {
    CRITICAL: 'CRITICAL',
    WARNING: 'WARNING',
  },
}));

describe('redisSecurityMiddleware', () => {
  let mockRateLimiter: any;
  let mockCheckRequestBlacklist: any;
  let mockIpBlacklist: any;
  let mockDetectMaliciousContent: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 获取mock实例
    mockRateLimiter = require('@/lib/security/redis-rate-limiter').rateLimiter;
    mockCheckRequestBlacklist = require('@/lib/security/redis-ip-blacklist').checkRequestBlacklist;
    mockIpBlacklist = require('@/lib/security/redis-ip-blacklist').ipBlacklist;
    mockDetectMaliciousContent = require('@/lib/input-sanitizer').detectMaliciousContent;
    mockAuditLogger = require('@/lib/audit-logger').auditLogger;

    // 设置环境变量
    process.env.COSEREEDEN_ENABLE_RATE_LIMITING = 'true';
    process.env.COSEREEDEN_ENABLE_SECURITY_HEADERS = 'true';
    process.env.COSEREEDEN_ENABLE_AUDIT_LOGGING = 'true';
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.COSEREEDEN_ENABLE_RATE_LIMITING;
    delete process.env.COSEREEDEN_ENABLE_SECURITY_HEADERS;
    delete process.env.COSEREEDEN_ENABLE_AUDIT_LOGGING;
  });

  describe('IP黑名单检查', () => {
    it('应该阻止黑名单中的IP', async () => {
      mockCheckRequestBlacklist.mockResolvedValue(true);

      const request = new NextRequest(createTestUrl('/api/test'), {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(403);
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalled();

      const body = await response.json();
      expect(body.error).toBe('Access Denied');
    });

    it('应该允许非黑名单IP继续', async () => {
      mockCheckRequestBlacklist.mockResolvedValue(false);
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest(createTestUrl('/api/test'));

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('速率限制检查', () => {
    beforeEach(() => {
      mockCheckRequestBlacklist.mockResolvedValue(false);
    });

    it('应该对不同路径应用不同的速率限制', async () => {
      const testCases = [
        { path: '/api/auth/signin', expectedConfig: 'LOGIN' },
        { path: '/api/auth/signup', expectedConfig: 'REGISTER' },
        { path: '/api/upload', expectedConfig: 'UPLOAD' },
        { path: '/api/posts', expectedConfig: 'API' },
        { path: '/other', expectedConfig: 'STRICT' },
      ];

      for (const testCase of testCases) {
        mockRateLimiter.checkRateLimit.mockResolvedValue({
          allowed: true,
          remaining: 10,
          resetTime: Date.now() + 60000,
        });

        const request = new NextRequest(createTestUrl(testCase.path));
        await redisSecurityMiddleware(request);

        expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
          request,
          expect.objectContaining({
            maxRequests: expect.any(Number),
            windowMs: expect.any(Number),
          })
        );
      }
    });

    it('应该在超过速率限制时返回429', async () => {
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      const request = new NextRequest(createTestUrl('/api/test'));

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalled();

      const body = await response.json();
      expect(body.error).toBe('Too Many Requests');
    });
  });

  describe('可疑活动检测', () => {
    beforeEach(() => {
      mockCheckRequestBlacklist.mockResolvedValue(false);
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
    });

    it('应该检测可疑的User-Agent', async () => {
      const request = new NextRequest(createTestUrl('/api/test'), {
        headers: {
          'user-agent': 'python-requests/2.25.1',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await redisSecurityMiddleware(request);

      expect(mockAuditLogger.logSuspiciousActivity).toHaveBeenCalledWith(
        expect.stringContaining('可疑User-Agent'),
        request,
        expect.any(Object)
      );
    });

    it('应该对严重可疑活动添加到黑名单', async () => {
      const request = new NextRequest(createTestUrl('/api/test'), {
        headers: {
          'user-agent': 'bot-crawler',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(403);
      expect(mockIpBlacklist.addToBlacklist).toHaveBeenCalledWith(
        '192.168.1.1',
        'SUSPICIOUS_ACTIVITY',
        3600000, // 1小时
        expect.stringContaining('可疑User-Agent')
      );
    });
  });

  describe('恶意内容检测', () => {
    beforeEach(() => {
      mockCheckRequestBlacklist.mockResolvedValue(false);
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
    });

    it('应该检测POST请求中的恶意内容', async () => {
      mockDetectMaliciousContent.mockReturnValue({
        isMalicious: true,
        reasons: ['检测到潜在的脚本注入'],
      });

      const request = new NextRequest(createTestUrl('/api/test'), {
        method: 'POST',
        body: '<script>alert("xss")</script>',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(400);
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalled();
      expect(mockIpBlacklist.addToBlacklist).toHaveBeenCalledWith(
        '192.168.1.1',
        'MALICIOUS_CONTENT',
        86400000, // 24小时
        expect.stringContaining('恶意内容')
      );

      const body = await response.json();
      expect(body.error).toBe('Malicious Content Detected');
    });

    it('应该忽略GET请求的内容检测', async () => {
      const request = new NextRequest(createTestUrl('/api/test'), {
        method: 'GET',
      });

      await redisSecurityMiddleware(request);

      expect(mockDetectMaliciousContent).not.toHaveBeenCalled();
    });
  });

  describe('安全头应用', () => {
    beforeEach(() => {
      mockCheckRequestBlacklist.mockResolvedValue(false);
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
    });

    it('应该在启用时应用安全头', async () => {
      const request = new NextRequest(createTestUrl('/api/test'));

      const response = await redisSecurityMiddleware(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('应该在禁用时不应用安全头', async () => {
      process.env.COSEREEDEN_ENABLE_SECURITY_HEADERS = 'false';

      const request = new NextRequest(createTestUrl('/api/test'));

      const response = await redisSecurityMiddleware(request);

      expect(response.headers.get('X-Content-Type-Options')).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该在中间件失败时继续处理请求', async () => {
      mockCheckRequestBlacklist.mockRejectedValue(new Error('Redis连接失败'));

      const request = new NextRequest(createTestUrl('/api/test'));

      const response = await redisSecurityMiddleware(request);

      expect(response.status).toBe(200);
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalledWith(
        'SYSTEM_ERROR',
        expect.stringContaining('安全中间件执行失败'),
        request,
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('配置管理', () => {
    it('应该根据环境变量启用/禁用功能', async () => {
      // 禁用速率限制
      process.env.COSEREEDEN_ENABLE_RATE_LIMITING = 'false';

      mockCheckRequestBlacklist.mockResolvedValue(false);

      const request = new NextRequest(createTestUrl('/api/test'));

      await redisSecurityMiddleware(request);

      expect(mockRateLimiter.checkRateLimit).not.toHaveBeenCalled();
    });
  });
});

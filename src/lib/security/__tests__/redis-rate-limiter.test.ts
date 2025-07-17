/**
 * @fileoverview Redis速率限制器测试用例
 * @description 测试基于Redis的速率限制功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { RedisRateLimiter, RATE_LIMIT_CONFIGS } from '../redis-rate-limiter';
import { getRedis } from '@/lib/redis';

import { createRateLimitMiddleware } from '../redis-rate-limiter';
import { createRateLimitMiddleware } from '../redis-rate-limiter';

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn(),
  REDIS_KEYS: {
    RATE_LIMIT: 'security:ratelimit:',
  },
  RedisUtils: {},
}));

describe('RedisRateLimiter', () => {
  let rateLimiter: RedisRateLimiter;
  let mockRedis: any;

  beforeEach(() => {
    // 创建Redis mock
    mockRedis = {
      multi: jest.fn(() => ({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      })),
      zrem: jest.fn(),
      del: jest.fn(),
      zcard: jest.fn(),
      ttl: jest.fn(),
    };

    (getRedis as jest.Mock).mockReturnValue(mockRedis);
    rateLimiter = new RedisRateLimiter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('应该允许在限制内的请求', async () => {
      // 模拟Redis事务返回
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 1], // zremrangebyscore
        [null, 2], // zcard - 当前请求数
        [null, 1], // zadd
        [null, 1], // expire
      ]);

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const result = await rateLimiter.checkRateLimit(
        mockRequest,
        RATE_LIMIT_CONFIGS.API
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(97); // 100 - 2 - 1
      expect(mockMulti.exec).toHaveBeenCalled();
    });

    it('应该拒绝超过限制的请求', async () => {
      // 模拟Redis事务返回 - 已达到限制
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 1], // zremrangebyscore
        [null, 100], // zcard - 已达到最大请求数
        [null, 1], // zadd
        [null, 1], // expire
      ]);

      mockRedis.zrem.mockResolvedValue(1);

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const result = await rateLimiter.checkRateLimit(
        mockRequest,
        RATE_LIMIT_CONFIGS.API
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60); // 1分钟
      expect(mockRedis.zrem).toHaveBeenCalled();
    });

    it('应该在Redis失败时使用降级策略', async () => {
      // 模拟Redis事务失败
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue(null);

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const result = await rateLimiter.checkRateLimit(
        mockRequest,
        RATE_LIMIT_CONFIGS.API
      );

      // 降级策略应该允许请求
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('应该处理不同的客户端标识符', async () => {
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      // 测试不同的IP和User-Agent组合
      const requests = [
        new NextRequest('http://localhost:3000/api/test', {
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        }),
        new NextRequest('http://localhost:3000/api/test', {
          headers: {
            'x-forwarded-for': '192.168.1.2',
            'user-agent': 'Mozilla/5.0',
          },
        }),
        new NextRequest('http://localhost:3000/api/test', {
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Chrome/91.0',
          },
        }),
      ];

      for (const request of requests) {
        const result = await rateLimiter.checkRateLimit(
          request,
          RATE_LIMIT_CONFIGS.API
        );
        expect(result.allowed).toBe(true);
      }

      // 应该为每个不同的标识符调用Redis
      expect(mockMulti.exec).toHaveBeenCalledTimes(3);
    });
  });

  describe('resetRateLimit', () => {
    it('应该重置指定标识符的速率限制', async () => {
      mockRedis.del.mockResolvedValue(1);

      await rateLimiter.resetRateLimit('test-identifier');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'security:ratelimit:test-identifier'
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('应该返回速率限制状态', async () => {
      mockRedis.zcard.mockResolvedValue(5);
      mockRedis.ttl.mockResolvedValue(300);

      const status = await rateLimiter.getRateLimitStatus('test-identifier');

      expect(status.requestCount).toBe(5);
      expect(status.ttl).toBe(300);
      expect(mockRedis.zcard).toHaveBeenCalledWith(
        'security:ratelimit:test-identifier'
      );
      expect(mockRedis.ttl).toHaveBeenCalledWith(
        'security:ratelimit:test-identifier'
      );
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('应该包含所有预定义的配置', () => {
      expect(RATE_LIMIT_CONFIGS.LOGIN).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.REGISTER).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.API).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.STRICT).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.UPLOAD).toBeDefined();

      // 验证登录配置
      expect(RATE_LIMIT_CONFIGS.LOGIN.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.LOGIN.windowMs).toBe(15 * 60 * 1000);

      // 验证API配置
      expect(RATE_LIMIT_CONFIGS.API.maxRequests).toBe(100);
      expect(RATE_LIMIT_CONFIGS.API.windowMs).toBe(60 * 1000);
    });
  });

  describe('createRateLimitMiddleware', () => {
    it('应该创建有效的中间件函数', async () => {
      
      const middleware = createRateLimitMiddleware(RATE_LIMIT_CONFIGS.API);
      expect(typeof middleware).toBe('function');

      // 模拟允许的请求
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await middleware(mockRequest);

      expect(result).toBeNull(); // 允许继续
    });

    it('应该在超过限制时返回429响应', async () => {
      
      const middleware = createRateLimitMiddleware(RATE_LIMIT_CONFIGS.API);

      // 模拟超过限制的请求
      const mockMulti = mockRedis.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 1],
        [null, 100], // 已达到限制
        [null, 1],
        [null, 1],
      ]);

      mockRedis.zrem.mockResolvedValue(1);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await middleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(429);
      
      const body = await result?.json();
      expect(body.error).toBe('Too Many Requests');
    });
  });
});

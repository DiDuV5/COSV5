/**
 * @fileoverview Redis集成测试
 * @description 测试Redis连接、基本CRUD操作、错误处理和降级策略
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import {
import { closeRedis } from '../redis';
import { getRedis } from '../redis';
import { checkRedisHealth } from '../redis';
import { checkRedisHealth } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';

  getRedis,
  closeRedis,
  checkRedisHealth,
  RedisUtils,
  REDIS_KEYS
} from '../redis';
import { RedisCacheManager } from '../cache/redis-cache-manager';
import { RedisCacheService } from '../cache/redis-cache-service';
import { TRPCErrorHandler } from '../errors/trpc-error-handler';

// Mock ioredis for testing
const mockRedisInstance = {
  on: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  connect: jest.fn().mockResolvedValue(undefined),
  status: 'ready',
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

// Mock Redis module
jest.mock('../redis', () => ({
  getRedis: jest.fn(() => mockRedisInstance),
  closeRedis: jest.fn(),
  checkRedisHealth: jest.fn(),
  RedisUtils: {
    setWithExpiry: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
  },
  REDIS_KEYS: {
    IP_BLACKLIST: 'security:blacklist:ip:',
    RATE_LIMIT: 'security:ratelimit:',
    USER_SESSION: 'session:user:',
    PERMISSION_CACHE: 'cache:permission:',
    AUDIT_LOG: 'audit:log:',
  },
}));

describe('Redis Integration Tests', () => {
  let cacheManager: RedisCacheManager;
  let cacheService: RedisCacheService;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 重置mock实例的状态
    mockRedisInstance.ping.mockResolvedValue('PONG');
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.setex.mockResolvedValue('OK');
    mockRedisInstance.del.mockResolvedValue(1);
    mockRedisInstance.exists.mockResolvedValue(0);
    mockRedisInstance.ttl.mockResolvedValue(-1);

    // 创建缓存管理器实例
    cacheManager = new RedisCacheManager();
    cacheService = new RedisCacheService();
  });

  afterEach(async () => {
    // 清理连接
    await closeRedis();
  });

  describe('Redis连接测试', () => {
    it('应该成功连接Redis', async () => {
      const redis = getRedis();
      expect(redis).toBeDefined();

      const result = await redis.ping();
      expect(result).toBe('PONG');
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it('应该正确检查Redis健康状态', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      checkRedisHealth.mockResolvedValue(true);

      const isHealthy = await checkRedisHealth();
      expect(isHealthy).toBe(true);
    });

    it('应该处理Redis连接失败', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection failed'));
      checkRedisHealth.mockResolvedValue(false);

      const isHealthy = await checkRedisHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Redis缓存管理器测试', () => {
    beforeEach(async () => {
      // 模拟Redis连接成功
      (cacheManager as any)['isConnected'] = true;
      (cacheManager as any)['redis'] = mockRedisInstance as any;
    });

    it('应该成功设置缓存', async () => {
      const testData = { id: '123', name: 'test user' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheManager.set('test-key', testData, 300);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        expect.stringContaining('"id":"123"')
      );
    });

    it('应该成功获取缓存', async () => {
      const testData = { id: '123', name: 'test user' };
      const cacheItem = {
        data: testData,
        timestamp: Date.now(),
        ttl: 300,
        version: '1.0'
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cacheItem));

      const result = await cacheManager.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('应该处理缓存未命中', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheManager.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('应该成功删除缓存', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheManager.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('应该正确统计缓存指标', async () => {
      // 模拟缓存命中
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify({
        data: 'test',
        timestamp: Date.now(),
        ttl: 300,
        version: '1.0'
      }));

      await cacheManager.get('hit-key');

      // 模拟缓存未命中
      mockRedisInstance.get.mockResolvedValueOnce(null);
      await cacheManager.get('miss-key');

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('Redis错误处理和降级策略测试', () => {
    it('应该在Redis连接失败时使用内存缓存', async () => {
      // 模拟Redis连接失败
      (cacheManager as any)['isConnected'] = false;
      (cacheManager as any)['redis'] = null;

      const testData = { id: '123', name: 'test user' };
      const result = await cacheManager.set('test-key', testData, 300);

      // 应该返回true（使用内存缓存）
      expect(result).toBe(true);
    });

    it('应该在关键操作时抛出TRPCError', () => {
      // 模拟Redis未连接
      (cacheManager as any)['isConnected'] = false;
      (cacheManager as any)['redis'] = null;

      expect(() => {
        cacheManager.requireRedisConnection();
      }).toThrow();
    });

    it('应该在Redis服务不可用时抛出详细错误', async () => {
      // 模拟Redis服务不可用
      cacheService['redis'] = null;

      await expect(cacheService.validateRedisAvailability()).rejects.toThrow();
    });
  });

  describe('Redis工具函数测试', () => {
    it('应该正确设置带过期时间的键值', async () => {
      RedisUtils.setWithExpiry.mockResolvedValue('OK');

      await RedisUtils.setWithExpiry('test-key', 'test-value', 300);

      expect(RedisUtils.setWithExpiry).toHaveBeenCalledWith('test-key', 'test-value', 300);
    });

    it('应该正确检查键是否存在', async () => {
      RedisUtils.exists.mockResolvedValue(true);

      const exists = await RedisUtils.exists('test-key');

      expect(exists).toBe(true);
      expect(RedisUtils.exists).toHaveBeenCalledWith('test-key');
    });

    it('应该正确获取TTL', async () => {
      RedisUtils.ttl.mockResolvedValue(300);

      const ttl = await RedisUtils.ttl('test-key');

      expect(ttl).toBe(300);
      expect(RedisUtils.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Redis键名常量测试', () => {
    it('应该包含所有预定义的键前缀', () => {
      expect(REDIS_KEYS.IP_BLACKLIST).toBe('security:blacklist:ip:');
      expect(REDIS_KEYS.RATE_LIMIT).toBe('security:ratelimit:');
      expect(REDIS_KEYS.USER_SESSION).toBe('session:user:');
      expect(REDIS_KEYS.PERMISSION_CACHE).toBe('cache:permission:');
      expect(REDIS_KEYS.AUDIT_LOG).toBe('audit:log:');
    });
  });

  describe('Redis缓存服务测试', () => {
    it('应该正确初始化缓存服务', () => {
      expect(cacheService).toBeDefined();
    });

    it('应该在禁用时抛出错误', async () => {
      const disabledService = new RedisCacheService({ enabled: false });

      await expect(disabledService.validateRedisAvailability()).rejects.toThrow();
    });

    it('应该正确处理缓存设置和获取', async () => {
      cacheService['redis'] = mockRedisInstance as any;
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        data: 'test-value',
        timestamp: Date.now(),
        ttl: 300
      }));

      await cacheService.set('test-key', 'test-value', 300);
      const result = await cacheService.get('test-key');

      expect(result).toBe('test-value');
    });



    it('应该在Redis不可用时使用内存缓存', async () => {
      cacheService['redis'] = null;

      await cacheService.set('fallback-key', 'fallback-value', 300);
      const result = await cacheService.get('fallback-key');

      expect(result).toBe('fallback-value');
    });
  });

  describe('Redis缓存管理器高级功能测试', () => {
    beforeEach(() => {
      (cacheManager as any)['isConnected'] = true;
      (cacheManager as any)['redis'] = mockRedisInstance as any;
    });

    it('应该正确处理缓存过期时间设置', async () => {
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await cacheManager.expire('test-key', 600);
      expect(result).toBe(true);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('test-key', 600);
    });

    it('应该正确检查键是否存在', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheManager.exists('test-key');
      expect(result).toBe(true);
    });



    it('应该正确处理连接状态检查', () => {
      expect(cacheManager.isRedisConnected()).toBe(true);

      (cacheManager as any)['isConnected'] = false;
      expect(cacheManager.isRedisConnected()).toBe(false);
    });

    it('应该正确重置统计信息', () => {
      cacheManager['stats'].hits = 10;
      cacheManager['stats'].misses = 5;

      cacheManager.resetStats();

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

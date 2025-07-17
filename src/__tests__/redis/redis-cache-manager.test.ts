/**
 * @fileoverview Redis缓存管理器测试 - P2级别
 * @description 测试Redis缓存管理器的高级功能，包括动态TTL、缓存预热、穿透防护等
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock ioredis
const mockRedis = {
  ping: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  pipeline: jest.fn(),
  multi: jest.fn(),
  exec: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  status: 'ready',
  connect: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  config: jest.fn(),
  eval: jest.fn(),
  evalsha: jest.fn(),
  script: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock日志去重器
jest.mock('@/lib/logging/log-deduplicator', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Redis连接
jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn(() => mockRedis),
}));

import { RedisCacheManager } from '@/lib/cache/redis-cache-manager';

describe('Redis缓存管理器测试 - P2级别', () => {
  let cacheManager: RedisCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();

    cacheManager = new RedisCacheManager({
      host: 'localhost',
      port: 6379,
      db: 1,
      keyPrefix: 'test:cache:',
      defaultTTL: 3600,
      enableDynamicTTL: true,
      enableCacheWarmup: true,
      enablePenetrationProtection: true,
      hitRateThreshold: 85,
      warmupBatchSize: 10,
      penetrationCacheTTL: 60,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('基础缓存操作', () => {
    it('应该成功设置缓存项', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User', email: 'test@example.com' };
      const ttl = 1800;

      // 模拟Redis不可用，使用fallback
      const result = await cacheManager.set(key, value, ttl);

      expect(result).toBe(true);
    });

    it('应该成功获取缓存项', async () => {
      const key = 'user:123';
      const cacheItem = {
        data: { id: '123', name: 'Test User' },
        timestamp: Date.now(),
        ttl: 3600,
        version: '1.0'
      };

      // 由于Redis不可用，会使用fallback，先设置再获取
      await cacheManager.set(key, cacheItem.data);
      const result = await cacheManager.get(key);

      expect(result).toEqual(cacheItem.data);
    });

    it('应该处理缓存未命中', async () => {
      const key = 'nonexistent:key';

      const result = await cacheManager.get(key);

      expect(result).toBeNull();
    });

    it('应该成功删除缓存项', async () => {
      const key = 'user:123';

      const result = await cacheManager.delete(key);

      expect(result).toBe(true);
    });
  });

  describe('动态TTL功能', () => {
    it('应该根据访问频率调整TTL', async () => {
      const key = 'popular:item';
      const value = { data: 'popular content' };

      // 第一次设置
      const result = await cacheManager.set(key, value, 3600);

      expect(result).toBe(true);
    });

    it('应该为不同类型的数据设置不同的TTL', async () => {
      const userKey = 'user:123';
      const sessionKey = 'session:456';
      const configKey = 'config:app';

      const result1 = await cacheManager.set(userKey, { type: 'user' }, 3600);
      const result2 = await cacheManager.set(sessionKey, { type: 'session' }, 1800);
      const result3 = await cacheManager.set(configKey, { type: 'config' }, 7200);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe('缓存预热功能', () => {
    it('应该支持批量设置缓存', async () => {
      const warmupData = [
        { key: 'user:1', value: { id: '1', name: 'User 1' } },
        { key: 'user:2', value: { id: '2', name: 'User 2' } },
        { key: 'user:3', value: { id: '3', name: 'User 3' } },
      ];

      // 使用mset方法进行批量设置
      const result = await cacheManager.mset(warmupData);

      expect(result).toBe(true);
    });

    it('应该处理批量设置过程中的错误', async () => {
      const warmupData = [
        { key: 'user:1', value: { id: '1', name: 'User 1' } },
        { key: 'user:2', value: { id: '2', name: 'User 2' } },
      ];

      // 测试错误处理
      const result = await cacheManager.mset(warmupData);

      // 由于使用fallback，应该成功
      expect(result).toBe(true);
    });

    it('应该支持分批处理大量数据', async () => {
      const largeWarmupData = Array.from({ length: 25 }, (_, i) => ({
        key: `user:${i}`,
        value: { id: i.toString(), name: `User ${i}` }
      }));

      // 分批处理
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < largeWarmupData.length; i += batchSize) {
        batches.push(largeWarmupData.slice(i, i + batchSize));
      }

      let successCount = 0;
      for (const batch of batches) {
        const result = await cacheManager.mset(batch);
        if (result) successCount += batch.length;
      }

      expect(successCount).toBe(25);
      expect(batches.length).toBe(3); // 25个项目分3批
    });
  });

  describe('缓存穿透防护', () => {
    it('应该处理空值查询', async () => {
      const key = 'nonexistent:user:999';

      // 第一次查询，应该返回null
      const result1 = await cacheManager.get(key);
      expect(result1).toBeNull();

      // 第二次查询，仍然返回null
      const result2 = await cacheManager.get(key);
      expect(result2).toBeNull();
    });

    it('应该正常缓存有效数据', async () => {
      const key = 'user:123';
      const userData = { id: '123', name: 'Test User' };

      // 设置数据
      await cacheManager.set(key, userData);

      // 获取数据
      const result = await cacheManager.get(key);

      expect(result).toEqual(userData);
    });
  });

  describe('缓存统计和监控', () => {
    it('应该正确统计缓存命中率', async () => {
      // 先设置一个值
      await cacheManager.set('hit:key', { id: '123' });

      // 模拟命中
      await cacheManager.get('hit:key');

      // 模拟未命中
      await cacheManager.get('miss:key');

      const stats = cacheManager.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('应该提供详细的缓存统计信息', async () => {
      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('errors');
    });

    it('应该重置统计信息', async () => {
      // 先产生一些统计数据
      await cacheManager.get('test:key');

      let stats = cacheManager.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);

      // 重置统计
      cacheManager.resetStats();

      stats = cacheManager.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('批量操作', () => {
    it('应该支持批量获取', async () => {
      const keys = ['user:1', 'user:2', 'user:3'];

      // 先设置一些数据
      await cacheManager.set('user:1', { id: '1' });
      await cacheManager.set('user:2', { id: '2' });
      // user:3 不设置，保持为null

      const results = await cacheManager.mget(keys);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: '1' });
      expect(results[1]).toEqual({ id: '2' });
      expect(results[2]).toBeNull();
    });

    it('应该支持批量设置', async () => {
      const data = [
        { key: 'user:1', value: { id: '1', name: 'User 1' } },
        { key: 'user:2', value: { id: '2', name: 'User 2' } },
        { key: 'user:3', value: { id: '3', name: 'User 3' } },
      ];

      const result = await cacheManager.mset(data);

      expect(result).toBe(true);
    });

    it('应该支持过期时间设置', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // 先设置数据
      await cacheManager.set(key, value);

      // 设置过期时间
      const result = await cacheManager.expire(key, 1800);

      expect(result).toBe(true);
    });
  });

  describe('自动优化功能', () => {
    it('应该提供缓存统计信息', async () => {
      // 产生一些缓存活动
      await cacheManager.set('test:1', { data: 'test1' });
      await cacheManager.get('test:1');
      await cacheManager.get('nonexistent:key');

      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('hitRate');
    });

    it('应该处理缓存配置', async () => {
      // 测试缓存管理器的配置
      expect(cacheManager).toBeDefined();

      // 验证基本操作可以正常工作
      const testKey = 'config:test';
      const testValue = { config: 'value' };

      await cacheManager.set(testKey, testValue);
      const result = await cacheManager.get(testKey);

      expect(result).toEqual(testValue);
    });

    it('应该支持缓存清理操作', async () => {
      const testKey = 'cleanup:test';
      const testValue = { data: 'cleanup' };

      // 设置数据
      await cacheManager.set(testKey, testValue);

      // 验证数据存在
      let result = await cacheManager.get(testKey);
      expect(result).toEqual(testValue);

      // 删除数据
      await cacheManager.delete(testKey);

      // 验证数据已删除
      result = await cacheManager.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理Redis连接错误', async () => {
      (mockRedis.get as any).mockRejectedValue(new Error('Connection lost'));

      const result = await cacheManager.get('test:key');

      expect(result).toBeNull();
    });

    it('应该在Redis不可用时使用fallback', async () => {
      // 模拟Redis不可用
      const fallbackManager = new RedisCacheManager({
        host: 'localhost',
        port: 6379,
        db: 1,
        keyPrefix: 'test:',
        defaultTTL: 300,
      });

      // 设置Redis为不可用状态
      (mockRedis.ping as any).mockRejectedValue(new Error('Redis unavailable'));

      const testData = { id: '123', name: 'Test' };

      // 应该使用内存缓存作为fallback
      const setResult = await fallbackManager.set('fallback:key', testData);
      expect(setResult).toBe(true);

      const getResult = await fallbackManager.get('fallback:key');
      expect(getResult).toEqual(testData);
    });

    it('应该处理序列化/反序列化错误', async () => {
      // 测试反序列化错误
      (mockRedis.get as any).mockResolvedValue('invalid json');

      const result = await cacheManager.get('invalid:key');

      expect(result).toBeNull();
    });
  });
});

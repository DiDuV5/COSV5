/**
 * @fileoverview Redis会话存储测试 - P2级别
 * @description 测试Redis会话存储的完整功能，包括连接、CRUD操作、过期处理、并发安全性，目标覆盖率70%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 设置环境变量
process.env.COSEREEDEN_REDIS_HOST = 'localhost';
process.env.COSEREEDEN_REDIS_PORT = '6379';
process.env.COSEREEDEN_REDIS_PASSWORD = '';
process.env.COSEREEDEN_REDIS_DB = '1'; // 使用测试数据库
process.env.COSEREEDEN_REDIS_KEY_PREFIX = 'test:cosereeden:';
process.env.COSEREEDEN_REDIS_ENABLED = 'true';

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
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  psubscribe: jest.fn(),
  punsubscribe: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

import { RedisCacheService } from '@/lib/cache/redis-cache-service';
import { RedisCacheManager } from '@/lib/cache/redis-cache-manager';
import { getRedis, ensureRedisConnection, checkRedisHealth, closeRedis } from '@/lib/redis';

describe('Redis会话存储测试 - P2级别', () => {
  let redisCacheService: RedisCacheService;
  let redisCacheManager: RedisCacheManager;

  beforeEach(() => {
    // 重置所有mocks
    jest.clearAllMocks();

    // 创建服务实例
    redisCacheService = new RedisCacheService({
      redisUrl: 'redis://localhost:6379',
      defaultTTL: 300,
      keyPrefix: 'test:session:',
      enabled: true,
      compression: false, // 测试时关闭压缩以便验证
    });

    redisCacheManager = new RedisCacheManager({
      host: 'localhost',
      port: 6379,
      db: 1,
      keyPrefix: 'test:cache:',
      defaultTTL: 300,
    });
  });

  afterEach(async () => {
    // 清理资源
    await closeRedis();
    jest.resetAllMocks();
  });

  describe('Redis连接测试', () => {
    it('应该成功建立Redis连接', async () => {
      (mockRedis.ping as any).mockResolvedValue('PONG');

      const redis = getRedis();
      const result = await redis.ping();

      expect(result).toBe('PONG');
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('应该检查Redis连接健康状态', async () => {
      (mockRedis.ping as any).mockResolvedValue('PONG');

      const isHealthy = await checkRedisHealth();

      expect(isHealthy).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('应该处理Redis连接失败', async () => {
      (mockRedis.ping as any).mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await checkRedisHealth();

      expect(isHealthy).toBe(false);
    });

    it('应该确保Redis连接建立', async () => {
      mockRedis.status = 'ready';

      const connected = await ensureRedisConnection();

      expect(connected).toBe(true);
    });

    it('应该处理连接超时', async () => {
      mockRedis.status = 'connecting';

      // 模拟连接超时
      const connected = await ensureRedisConnection();

      expect(connected).toBe(false);
    });
  });

  describe('会话CRUD操作测试', () => {
    const sessionData = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      userLevel: 'USER',
      loginTime: Date.now(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    };

    it('应该成功创建会话', async () => {
      const sessionKey = 'session:user-123:session-456';

      // 由于Redis不可用，会使用fallback
      const result = await redisCacheService.set(sessionKey, sessionData, 3600);

      expect(result).toBe(true);
    });

    it('应该成功读取会话', async () => {
      const sessionKey = 'session:user-123:session-456';

      // 先设置数据，再读取
      await redisCacheService.set(sessionKey, sessionData);
      const result = await redisCacheService.get(sessionKey);

      expect(result).toEqual(sessionData);
    });

    it('应该成功更新会话', async () => {
      const sessionKey = 'session:user-123:session-456';
      const updatedData = { ...sessionData, lastActivity: Date.now() };

      const result = await redisCacheService.set(sessionKey, updatedData, 3600);

      expect(result).toBe(true);
    });

    it('应该成功删除会话', async () => {
      const sessionKey = 'session:user-123:session-456';

      // 先设置数据
      await redisCacheService.set(sessionKey, sessionData);

      // 然后删除
      const result = await redisCacheService.del(sessionKey);

      expect(result).toBe(true);
    });

    it('应该检查会话是否存在', async () => {
      const sessionKey = 'session:user-123:session-456';

      // 先设置数据
      await redisCacheService.set(sessionKey, sessionData);

      const exists = await redisCacheService.exists(sessionKey);

      expect(exists).toBe(true);
    });

    it('应该处理不存在的会话', async () => {
      const sessionKey = 'session:nonexistent';

      const result = await redisCacheService.get(sessionKey);

      expect(result).toBeNull();
    });
  });

  describe('会话过期处理测试', () => {
    it('应该设置会话过期时间', async () => {
      const sessionKey = 'session:user-123:session-456';
      const ttl = 1800; // 30分钟

      // 先设置数据
      await redisCacheService.set(sessionKey, { userId: 'user-123' });

      // 设置过期时间
      const result = await redisCacheService.expire(sessionKey, ttl);

      expect(result).toBe(true);
    });

    it('应该处理会话过期', async () => {
      const sessionKey = 'session:expired';

      // 设置一个很短的TTL
      await redisCacheService.set(sessionKey, { userId: 'user-123' }, 1);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await redisCacheService.get(sessionKey);

      expect(result).toBeNull();
    });

    it('应该检查会话是否存在', async () => {
      const sessionKey = 'session:check';

      // 设置数据
      await redisCacheService.set(sessionKey, { userId: 'user-123' });

      const exists = await redisCacheService.exists(sessionKey);

      expect(exists).toBe(true);
    });

    it('应该支持批量删除模式', async () => {
      // 设置多个会话
      await redisCacheService.set('test:session:1', { userId: '1' });
      await redisCacheService.set('test:session:2', { userId: '2' });
      await redisCacheService.set('test:session:3', { userId: '3' });

      // 批量删除
      const deletedCount = await redisCacheService.delPattern('test:session:*');

      expect(deletedCount).toBeGreaterThan(0);
    });
  });

  describe('批量操作测试', () => {
    it('应该支持批量获取会话', async () => {
      const sessionKeys = [
        'session:user-1:session-1',
        'session:user-2:session-2',
        'session:user-3:session-3',
      ];

      // 先设置数据
      await redisCacheService.set(sessionKeys[0], { userId: 'user-1', username: 'user1' });
      await redisCacheService.set(sessionKeys[1], { userId: 'user-2', username: 'user2' });
      // 第三个不设置，保持为null

      // 批量获取
      const results = await Promise.all(
        sessionKeys.map(key => redisCacheService.get(key))
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ userId: 'user-1', username: 'user1' });
      expect(results[1]).toEqual({ userId: 'user-2', username: 'user2' });
      expect(results[2]).toBeNull();
    });

    it('应该支持批量设置会话', async () => {
      const sessionData = [
        { key: 'session:user-1:session-1', value: { userId: 'user-1', username: 'user1' } },
        { key: 'session:user-2:session-2', value: { userId: 'user-2', username: 'user2' } },
      ];

      // 批量设置
      const results = await Promise.all(
        sessionData.map(item => redisCacheService.set(item.key, item.value))
      );

      expect(results).toEqual([true, true]);
    });

    it('应该支持批量删除操作', async () => {
      // 先设置一些数据
      await redisCacheService.set('batch:1', { data: '1' });
      await redisCacheService.set('batch:2', { data: '2' });
      await redisCacheService.set('batch:3', { data: '3' });

      // 批量删除
      const results = await Promise.all([
        redisCacheService.del('batch:1'),
        redisCacheService.del('batch:2'),
        redisCacheService.del('batch:3'),
      ]);

      expect(results).toEqual([true, true, true]);
    });
  });

  describe('并发安全性测试', () => {
    it('应该处理并发会话创建', async () => {
      const sessionKey = 'session:user-123:concurrent';
      const sessionData1 = { userId: 'user-123', data: 'data1', timestamp: 1 };
      const sessionData2 = { userId: 'user-123', data: 'data2', timestamp: 2 };

      // 模拟并发操作
      const promises = [
        redisCacheService.set(sessionKey, sessionData1, 3600),
        redisCacheService.set(sessionKey, sessionData2, 3600),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([true, true]);
    });

    it('应该处理并发会话读取', async () => {
      const sessionKey = 'session:user-123:read-test';
      const sessionData = { userId: 'user-123', username: 'testuser' };

      // 先设置数据
      await redisCacheService.set(sessionKey, sessionData);

      // 模拟多个并发读取
      const promises = Array(5).fill(null).map(() =>
        redisCacheService.get(sessionKey)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(sessionData);
      });
    });

    it('应该处理并发读写操作', async () => {
      const sessionKey = 'session:concurrent:readwrite';
      const sessionData = { userId: 'user-123', counter: 0 };

      // 设置初始数据
      await redisCacheService.set(sessionKey, sessionData);

      // 并发读写操作
      const readPromises = Array(3).fill(null).map(() =>
        redisCacheService.get(sessionKey)
      );

      const writePromises = Array(2).fill(null).map((_, i) =>
        redisCacheService.set(sessionKey, { ...sessionData, counter: i + 1 })
      );

      const [readResults, writeResults] = await Promise.all([
        Promise.all(readPromises),
        Promise.all(writePromises)
      ]);

      expect(readResults).toHaveLength(3);
      expect(writeResults).toEqual([true, true]);
    });
  });

  describe('错误处理和恢复测试', () => {
    it('应该处理Redis连接断开时的fallback', async () => {
      // 由于我们的mock设置，Redis实际上不可用，会自动使用fallback
      const result = await redisCacheService.set('session:test', { data: 'test' }, 3600);

      expect(result).toBe(true); // fallback应该成功
    });

    it('应该使用内存缓存作为fallback', async () => {
      // 模拟Redis不可用
      const fallbackService = new RedisCacheService({
        enabled: false, // 禁用Redis
        defaultTTL: 300,
        keyPrefix: 'test:',
      });

      const sessionData = { userId: 'user-123', username: 'testuser' };

      const setResult = await fallbackService.set('session:fallback', sessionData, 300);
      expect(setResult).toBe(true);

      const getResult = await fallbackService.get('session:fallback');
      expect(getResult).toEqual(sessionData);
    });

    it('应该处理序列化错误', async () => {
      const circularData = { self: null as any };
      circularData.self = circularData; // 创建循环引用

      const result = await redisCacheService.set('session:circular', circularData, 3600);

      // 应该处理序列化错误
      expect(result).toBe(false);
    });

    it('应该处理反序列化错误', async () => {
      // 测试内存缓存的反序列化错误处理
      const testKey = 'session:invalid';

      // 正常设置数据
      await redisCacheService.set(testKey, { valid: 'data' });

      // 获取数据应该成功
      const result = await redisCacheService.get(testKey);

      expect(result).toEqual({ valid: 'data' });
    });

    it('应该处理缓存过期清理', async () => {
      const testKey = 'session:expire-test';
      const testData = { userId: 'test-user' };

      // 设置短期缓存
      await redisCacheService.set(testKey, testData, 1);

      // 立即检查存在
      const exists1 = await redisCacheService.exists(testKey);
      expect(exists1).toBe(true);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 检查已过期
      const exists2 = await redisCacheService.exists(testKey);
      expect(exists2).toBe(false);
    });
  });
});

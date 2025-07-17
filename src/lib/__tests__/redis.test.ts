/**
import Redis from 'ioredis';
import { getRedis } from '../redis';
import Redis from 'ioredis';
import { getRedis } from '../redis';
import Redis from 'ioredis';
import { getRedis } from '../redis';
import Redis from 'ioredis';
import { getRedis, closeRedis } from '../redis';
import { closeRedis } from '../redis';
import Redis from 'ioredis';
import { checkRedisHealth } from '../redis';
import Redis from 'ioredis';
import { checkRedisHealth } from '../redis';
import Redis from 'ioredis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';
import { RedisUtils } from '../redis';

 * @fileoverview Redis配置测试用例
 * @description 测试Redis连接和工具函数
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { 
  getRedis, 
  closeRedis, 
  checkRedisHealth, 
  RedisUtils,
  REDIS_KEYS 
} from '../redis';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  }));
});

describe('Redis配置', () => {
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置模块状态
    jest.resetModules();
    
    // 设置环境变量
    process.env.COSEREEDEN_REDIS_HOST = 'localhost';
    process.env.COSEREEDEN_REDIS_PORT = '6379';
    process.env.COSEREEDEN_REDIS_PASSWORD = 'test-password';
    process.env.COSEREEDEN_REDIS_DB = '1';
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.COSEREEDEN_REDIS_HOST;
    delete process.env.COSEREEDEN_REDIS_PORT;
    delete process.env.COSEREEDEN_REDIS_PASSWORD;
    delete process.env.COSEREEDEN_REDIS_DB;
  });

  describe('getRedis', () => {
    it('应该创建Redis连接实例', () => {
      mockRedis = {
        on: jest.fn(),
        ping: jest.fn(),
        quit: jest.fn(),
      };
      Redis.mockReturnValue(mockRedis);

      const redis = getRedis();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'test-password',
        db: 1,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('应该使用默认配置', () => {
      // 清除环境变量
      delete process.env.COSEREEDEN_REDIS_HOST;
      delete process.env.COSEREEDEN_REDIS_PORT;
      delete process.env.COSEREEDEN_REDIS_PASSWORD;
      delete process.env.COSEREEDEN_REDIS_DB;

      mockRedis = { on: jest.fn() };
      Redis.mockReturnValue(mockRedis);

      getRedis();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    });

    it('应该返回单例实例', () => {
      mockRedis = { on: jest.fn() };
      Redis.mockReturnValue(mockRedis);

      const redis1 = getRedis();
      const redis2 = getRedis();

      expect(redis1).toBe(redis2);
      expect(Redis).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeRedis', () => {
    it('应该关闭Redis连接', async () => {
      mockRedis = {
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      Redis.mockReturnValue(mockRedis);

      getRedis(); // 创建连接
      
      await closeRedis();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('应该处理未创建连接的情况', async () => {
      
      // 不应该抛出错误
      await expect(closeRedis()).resolves.toBeUndefined();
    });
  });

  describe('checkRedisHealth', () => {
    it('应该在连接正常时返回true', async () => {
      mockRedis = {
        on: jest.fn(),
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      Redis.mockReturnValue(mockRedis);

      const isHealthy = await checkRedisHealth();

      expect(isHealthy).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('应该在连接失败时返回false', async () => {
      mockRedis = {
        on: jest.fn(),
        ping: jest.fn().mockRejectedValue(new Error('连接失败')),
      };
      Redis.mockReturnValue(mockRedis);

      const isHealthy = await checkRedisHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('RedisUtils', () => {
    beforeEach(() => {
      mockRedis = {
        on: jest.fn(),
        setex: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
      };
      Redis.mockReturnValue(mockRedis);
    });

    describe('setWithExpiry', () => {
      it('应该设置带过期时间的键值', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        await RedisUtils.setWithExpiry('test-key', 'test-value', 3600);

        expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      });
    });

    describe('get', () => {
      it('应该获取键值', async () => {
        mockRedis.get.mockResolvedValue('test-value');

        const value = await RedisUtils.get('test-key');

        expect(value).toBe('test-value');
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });
    });

    describe('del', () => {
      it('应该删除键', async () => {
        mockRedis.del.mockResolvedValue(1);

        const result = await RedisUtils.del('test-key');

        expect(result).toBe(1);
        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      });
    });

    describe('exists', () => {
      it('应该检查键是否存在', async () => {
        mockRedis.exists.mockResolvedValue(1);

        const exists = await RedisUtils.exists('test-key');

        expect(exists).toBe(true);
        expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
      });

      it('应该在键不存在时返回false', async () => {
        mockRedis.exists.mockResolvedValue(0);

        const exists = await RedisUtils.exists('test-key');

        expect(exists).toBe(false);
      });
    });

    describe('incr', () => {
      it('应该原子递增', async () => {
        mockRedis.incr.mockResolvedValue(5);

        const result = await RedisUtils.incr('counter-key');

        expect(result).toBe(5);
        expect(mockRedis.incr).toHaveBeenCalledWith('counter-key');
      });
    });

    describe('expire', () => {
      it('应该设置过期时间', async () => {
        mockRedis.expire.mockResolvedValue(1);

        const result = await RedisUtils.expire('test-key', 3600);

        expect(result).toBe(true);
        expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 3600);
      });
    });

    describe('ttl', () => {
      it('应该获取剩余过期时间', async () => {
        mockRedis.ttl.mockResolvedValue(1800);

        const ttl = await RedisUtils.ttl('test-key');

        expect(ttl).toBe(1800);
        expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
      });
    });
  });

  describe('REDIS_KEYS', () => {
    it('应该包含所有预定义的键前缀', () => {
      expect(REDIS_KEYS.IP_BLACKLIST).toBe('security:blacklist:ip:');
      expect(REDIS_KEYS.RATE_LIMIT).toBe('security:ratelimit:');
      expect(REDIS_KEYS.USER_SESSION).toBe('session:user:');
      expect(REDIS_KEYS.PERMISSION_CACHE).toBe('cache:permission:');
      expect(REDIS_KEYS.AUDIT_LOG).toBe('audit:log:');
    });
  });
});

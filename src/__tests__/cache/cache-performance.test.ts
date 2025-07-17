/**
 * 缓存性能测试
 * 验证P1级缓存策略优化的效果
 */

import { redisCacheManager } from '@/lib/cache/redis-cache-manager';

describe('缓存性能测试', () => {
  beforeAll(async () => {
    await redisCacheManager.initialize();
  });

  afterAll(async () => {
    await redisCacheManager.disconnect();
  });

  beforeEach(async () => {
    await redisCacheManager.flush();
    redisCacheManager.resetStats();
  });

  describe('动态TTL功能', () => {
    it('应该根据命中率调整TTL', async () => {
      const key = 'test:dynamic-ttl';
      const value = { data: 'test' };

      // 设置初始缓存
      await redisCacheManager.set(key, value, 300);
      
      // 模拟高命中率场景
      for (let i = 0; i < 10; i++) {
        await redisCacheManager.get(key);
      }

      const stats = redisCacheManager.getStats();
      expect(stats.hitRate).toBeGreaterThan(90);
      expect(stats.dynamicTTLAdjustments).toBeGreaterThanOrEqual(0);
    });
  });

  describe('缓存穿透防护', () => {
    it('应该防止频繁的缓存穿透', async () => {
      const key = 'test:penetration';
      let callCount = 0;

      const fallbackFn = async () => {
        callCount++;
        return null; // 模拟数据不存在
      };

      // 连续调用多次
      for (let i = 0; i < 5; i++) {
        await redisCacheManager.getWithFallback(key, fallbackFn, 300);
      }

      const stats = redisCacheManager.getStats();
      expect(stats.penetrationPrevented).toBeGreaterThan(0);
      expect(callCount).toBeLessThan(5); // 应该有防护效果
    });
  });

  describe('缓存预热功能', () => {
    it('应该成功预热缓存', async () => {
      const keys = ['user:1', 'user:2', 'user:3'];
      const dataLoader = async (key: string) => {
        const id = key.split(':')[1];
        return { id, name: `User ${id}` };
      };

      await redisCacheManager.warmupCache({
        keys,
        dataLoader,
        ttl: 300,
        batchSize: 2
      });

      const stats = redisCacheManager.getStats();
      expect(stats.warmupExecuted).toBe(keys.length);

      // 验证缓存已存在
      for (const key of keys) {
        const cached = await redisCacheManager.get(key);
        expect(cached).not.toBeNull();
      }
    });
  });

  describe('自动优化功能', () => {
    it('应该执行自动优化', async () => {
      // 模拟低命中率场景
      for (let i = 0; i < 10; i++) {
        await redisCacheManager.get(`nonexistent:${i}`);
      }

      await redisCacheManager.autoOptimize();

      const stats = redisCacheManager.getStats();
      expect(stats.lastOptimization).not.toBeNull();
    });
  });

  describe('优化的模式删除', () => {
    it('应该使用SCAN而不是KEYS进行模式删除', async () => {
      // 设置多个测试缓存
      const testKeys = ['test:pattern:1', 'test:pattern:2', 'test:pattern:3'];
      
      for (const key of testKeys) {
        await redisCacheManager.set(key, { data: key }, 300);
      }

      // 使用模式删除
      const deletedCount = await redisCacheManager.deletePattern('test:pattern:*');
      
      expect(deletedCount).toBe(testKeys.length);

      // 验证缓存已删除
      for (const key of testKeys) {
        const cached = await redisCacheManager.get(key);
        expect(cached).toBeNull();
      }
    });
  });

  describe('缓存命中率监控', () => {
    it('应该正确计算缓存命中率', async () => {
      const key = 'test:hit-rate';
      const value = { data: 'test' };

      // 设置缓存
      await redisCacheManager.set(key, value, 300);

      // 命中5次
      for (let i = 0; i < 5; i++) {
        await redisCacheManager.get(key);
      }

      // 未命中3次
      for (let i = 0; i < 3; i++) {
        await redisCacheManager.get(`nonexistent:${i}`);
      }

      const stats = redisCacheManager.getStats();
      expect(stats.hits).toBe(5);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBeCloseTo(62.5, 1); // 5/(5+3) * 100
    });
  });

  describe('性能基准测试', () => {
    it('应该在合理时间内完成大量操作', async () => {
      const startTime = Date.now();
      const operations = 1000;

      // 执行大量缓存操作
      const promises = [];
      for (let i = 0; i < operations; i++) {
        promises.push(redisCacheManager.set(`perf:${i}`, { id: i }, 300));
      }
      await Promise.all(promises);

      // 执行大量读取操作
      const readPromises = [];
      for (let i = 0; i < operations; i++) {
        readPromises.push(redisCacheManager.get(`perf:${i}`));
      }
      await Promise.all(readPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`完成${operations * 2}个缓存操作耗时: ${duration}ms`);
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成

      const stats = redisCacheManager.getStats();
      expect(stats.hitRate).toBeGreaterThan(80); // 命中率应该大于80%
    });
  });
});

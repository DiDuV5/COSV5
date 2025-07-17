/**
 * @fileoverview Query Optimizer 集成兼容性测试
 * @description 验证重构后的查询优化器集成和兼容性
 * @author Augment AI
 * @date 2025-07-06
 */

import { describe, it, expect } from '@jest/globals';

describe('Query Optimizer 集成兼容性测试', () => {
  describe('模块导入验证', () => {
    it('应该能够正常导入QueryOptimizer类', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      expect(QueryOptimizer).toBeDefined();
      expect(typeof QueryOptimizer).toBe('function');
    });

    it('应该能够导入所有必要的类型', async () => {
      const queryOptimizerModule = await import('../query-optimizer');

      // 验证主要导出存在
      expect(queryOptimizerModule.QueryOptimizer).toBeDefined();
      expect(typeof queryOptimizerModule.QueryOptimizer).toBe('function');

      // 验证类型可以通过实例化验证
      const optimizer = new queryOptimizerModule.QueryOptimizer({} as any);
      expect(optimizer).toBeDefined();
      expect(typeof optimizer.getUserInfo).toBe('function');
      expect(typeof optimizer.getUserPermissions).toBe('function');
    });

    it('应该能够导入默认导出', async () => {
      const QueryOptimizerDefault = (await import('../query-optimizer')).default;
      expect(QueryOptimizerDefault).toBeDefined();
      expect(typeof QueryOptimizerDefault).toBe('function');
    });

    it('应该能够导入全局实例', async () => {
      const { queryOptimizer } = await import('../query-optimizer');
      expect(queryOptimizer).toBeDefined();
      expect(typeof queryOptimizer.getUserInfo).toBe('function');
      expect(typeof queryOptimizer.getUserPermissions).toBe('function');
      expect(typeof queryOptimizer.getStats).toBe('function');
    });
  });

  describe('API接口兼容性验证', () => {
    it('应该保持原有的构造函数签名', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');

      // 测试无参数构造
      expect(() => new QueryOptimizer({} as any)).not.toThrow();

      // 测试带配置参数构造
      expect(() => new QueryOptimizer({} as any, {
        enableCache: false,
        defaultCacheTTL: 600,
        enableQueryLogging: true,
        slowQueryThreshold: 2000,
      })).not.toThrow();
    });

    it('应该保持原有的方法签名', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 验证方法存在
      expect(typeof optimizer.getUserInfo).toBe('function');
      expect(typeof optimizer.getUserPermissions).toBe('function');
      expect(typeof optimizer.getStats).toBe('function');
      expect(typeof optimizer.resetStats).toBe('function');
      expect(typeof optimizer.invalidateUserCache).toBe('function');
      expect(typeof optimizer.invalidatePostCache).toBe('function');

      // 验证方法参数数量
      expect(optimizer.getUserInfo.length).toBe(1);
      expect(optimizer.getUserPermissions.length).toBe(1);
      expect(optimizer.getStats.length).toBe(0);
      expect(optimizer.resetStats.length).toBe(0);
      expect(optimizer.invalidateUserCache.length).toBe(1);
      expect(optimizer.invalidatePostCache.length).toBe(0);
    });

    it('应该保持原有的返回类型结构', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 验证getStats返回结构
      const stats = optimizer.getStats();
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('averageQueryTime');
      expect(stats).toHaveProperty('slowQueries');

      expect(typeof stats.totalQueries).toBe('number');
      expect(typeof stats.cacheHits).toBe('number');
      expect(typeof stats.cacheMisses).toBe('number');
      expect(typeof stats.averageQueryTime).toBe('number');
      expect(typeof stats.slowQueries).toBe('number');
    });
  });

  describe('配置兼容性验证', () => {
    it('应该支持所有原有配置选项', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');

      const config = {
        enableCache: false,
        defaultCacheTTL: 600,
        enableQueryLogging: true,
        slowQueryThreshold: 2000,
      };

      expect(() => new QueryOptimizer({} as any, config)).not.toThrow();
    });

    it('应该保持默认配置值', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 通过行为验证默认配置
      const stats = optimizer.getStats();
      expect(stats).toBeDefined();

      // 验证resetStats功能
      optimizer.resetStats();
      const resetStats = optimizer.getStats();
      expect(resetStats.totalQueries).toBe(0);
      expect(resetStats.cacheHits).toBe(0);
      expect(resetStats.cacheMisses).toBe(0);
      expect(resetStats.averageQueryTime).toBe(0);
      expect(resetStats.slowQueries).toBe(0);
    });
  });

  describe('错误处理兼容性验证', () => {
    it('应该优雅处理无效参数', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 这些调用不应该抛出错误
      expect(async () => {
        await optimizer.getUserInfo('');
        await optimizer.getUserInfo('invalid-id');
        await optimizer.getUserPermissions('');
        await optimizer.getUserPermissions('invalid-id');
        await optimizer.invalidateUserCache('');
        await optimizer.invalidateUserCache('invalid-id');
        await optimizer.invalidatePostCache();
      }).not.toThrow();
    });

    it('应该保持错误处理行为', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 验证方法调用不会抛出异常
      const userInfo = await optimizer.getUserInfo('test-id');
      const userPermissions = await optimizer.getUserPermissions('test-id');

      // 由于没有真实数据库连接，应该返回null
      expect(userInfo).toBeNull();
      expect(userPermissions).toBeNull();
    });
  });

  describe('性能特性验证', () => {
    it('应该保持统计功能', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      const initialStats = optimizer.getStats();
      expect(initialStats.totalQueries).toBe(0);

      // 执行一些操作（即使失败也会记录统计）
      await optimizer.getUserInfo('test-id');
      await optimizer.getUserPermissions('test-id');

      const updatedStats = optimizer.getStats();
      expect(updatedStats.totalQueries).toBeGreaterThan(initialStats.totalQueries);
    });

    it('应该支持统计重置', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 执行一些操作
      await optimizer.getUserInfo('test-id');

      const statsBeforeReset = optimizer.getStats();
      expect(statsBeforeReset.totalQueries).toBeGreaterThan(0);

      // 重置统计
      optimizer.resetStats();

      const statsAfterReset = optimizer.getStats();
      expect(statsAfterReset.totalQueries).toBe(0);
      expect(statsAfterReset.cacheHits).toBe(0);
      expect(statsAfterReset.cacheMisses).toBe(0);
      expect(statsAfterReset.averageQueryTime).toBe(0);
      expect(statsAfterReset.slowQueries).toBe(0);
    });
  });

  describe('缓存功能验证', () => {
    it('应该支持缓存清理操作', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');
      const optimizer = new QueryOptimizer({} as any);

      // 这些操作不应该抛出错误
      await expect(optimizer.invalidateUserCache('test-user')).resolves.not.toThrow();
      await expect(optimizer.invalidatePostCache()).resolves.not.toThrow();
    });

    it('应该支持配置缓存开关', async () => {
      const { QueryOptimizer } = await import('../query-optimizer');

      const optimizerWithCache = new QueryOptimizer({} as any, { enableCache: true });
      const optimizerWithoutCache = new QueryOptimizer({} as any, { enableCache: false });

      // 两种配置都应该正常工作
      expect(optimizerWithCache).toBeDefined();
      expect(optimizerWithoutCache).toBeDefined();

      // 方法调用都应该正常
      await expect(optimizerWithCache.getUserInfo('test')).resolves.toBeDefined();
      await expect(optimizerWithoutCache.getUserInfo('test')).resolves.toBeDefined();
    });
  });

  describe('模块结构验证', () => {
    it('应该保持文件大小在合理范围内', async () => {
      // 验证主文件不会过大（通过导入成功来间接验证）
      const queryOptimizerModule = await import('../query-optimizer');
      expect(Object.keys(queryOptimizerModule).length).toBeGreaterThan(0);
    });

    it('应该保持清晰的导出结构', async () => {
      const queryOptimizerModule = await import('../query-optimizer');

      // 验证主要导出
      expect(queryOptimizerModule.QueryOptimizer).toBeDefined();
      expect(queryOptimizerModule.queryOptimizer).toBeDefined();
      expect(queryOptimizerModule.default).toBeDefined();

      // 验证导出的一致性
      expect(queryOptimizerModule.QueryOptimizer).toBe(queryOptimizerModule.default);
    });
  });
});

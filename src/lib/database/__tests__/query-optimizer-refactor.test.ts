/**
 * @fileoverview Query Optimizer 重构验证测试
 * @description 验证重构后的查询优化器向后兼容性和核心功能
 * @author Augment AI
 * @date 2025-07-06
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { QueryOptimizer, type UserInfoResult, type UserPermissionsResult } from '../query-optimizer';

// Mock Redis Cache Manager
jest.mock('@/lib/cache/redis-cache-manager', () => ({
  redisCacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn(),
  },
}));

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
  },
} as any;

describe('Query Optimizer 重构验证测试', () => {
  let queryOptimizer: QueryOptimizer;

  beforeEach(() => {
    queryOptimizer = new QueryOptimizer(mockPrismaClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('向后兼容性验证', () => {
    it('应该保持原有的类构造函数接口', () => {
      expect(queryOptimizer).toBeInstanceOf(QueryOptimizer);
      expect(typeof queryOptimizer.getUserInfo).toBe('function');
      expect(typeof queryOptimizer.getUserPermissions).toBe('function');
      expect(typeof queryOptimizer.getStats).toBe('function');
      expect(typeof queryOptimizer.resetStats).toBe('function');
    });

    it('应该保持原有的配置选项', () => {
      const customConfig = {
        enableCache: false,
        defaultCacheTTL: 600,
        enableQueryLogging: true,
        slowQueryThreshold: 2000,
      };

      const customOptimizer = new QueryOptimizer(mockPrismaClient, customConfig);
      expect(customOptimizer).toBeInstanceOf(QueryOptimizer);
    });

    it('应该导出所有必要的类型', () => {
      // 验证类型导出（编译时检查）
      const userInfo: UserInfoResult = {
        id: 'test-id',
        username: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: null,
      };

      const userPermissions: UserPermissionsResult = {
        id: 'test-id',
        userLevel: 'USER',
        isActive: true,
        isVerified: false,
        permissions: ['comment', 'like', 'follow'],
        canUpload: false,
        canComment: true,
        canLike: true,
        canFollow: true,
      };

      expect(userInfo.id).toBe('test-id');
      expect(userPermissions.id).toBe('test-id');
    });
  });

  describe('核心功能验证', () => {
    describe('getUserInfo', () => {
      it('应该成功获取用户信息', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
          userLevel: 'USER',
          isVerified: true,
          isActive: true,
          createdAt: new Date('2023-01-01'),
          lastActiveAt: new Date('2023-12-01'),
        };

        (mockPrismaClient.user.findUnique as any).mockResolvedValue(mockUser);

        const result = await queryOptimizer.getUserInfo('user-123');

        expect(result).toEqual({
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
          userLevel: 'USER',
          isVerified: true,
          isActive: true,
          createdAt: new Date('2023-01-01'),
          lastActiveAt: new Date('2023-12-01'),
        });

        expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
            isActive: true,
            createdAt: true,
            lastActiveAt: true,
          },
        });
      });

      it('应该处理用户不存在的情况', async () => {
        (mockPrismaClient.user.findUnique as any).mockResolvedValue(null);

        const result = await queryOptimizer.getUserInfo('nonexistent-user');

        expect(result).toBeNull();
      });

      it('应该处理数据库错误', async () => {
        // 清除之前的mock设置
        jest.clearAllMocks();
        (mockPrismaClient.user.findUnique as any).mockRejectedValue(new Error('Database error'));

        const result = await queryOptimizer.getUserInfo('user-123');

        expect(result).toBeNull();
      });
    });

    describe('getUserPermissions', () => {
      it('应该成功获取用户权限', async () => {
        const mockUser = {
          id: 'user-123',
          userLevel: 'VIP',
          isActive: true,
          isVerified: true,
        };

        (mockPrismaClient.user.findUnique as any).mockResolvedValue(mockUser);

        const result = await queryOptimizer.getUserPermissions('user-123');

        expect(result).toEqual({
          id: 'user-123',
          userLevel: 'VIP',
          isActive: true,
          isVerified: true,
          permissions: ['upload', 'comment', 'like', 'follow', 'priority'],
          canUpload: true,
          canComment: true,
          canLike: true,
          canFollow: true,
        });
      });

      it('应该处理未知用户级别', async () => {
        const mockUser = {
          id: 'user-123',
          userLevel: 'UNKNOWN_LEVEL',
          isActive: true,
          isVerified: true,
        };

        (mockPrismaClient.user.findUnique as any).mockResolvedValue(mockUser);

        const result = await queryOptimizer.getUserPermissions('user-123');

        // 未知用户级别应该默认为GUEST权限
        expect(result?.permissions).toEqual(['view']);
      });
    });

    describe('统计功能验证', () => {
      it('应该正确记录查询统计', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarUrl: null,
          userLevel: 'USER',
          isVerified: false,
          isActive: true,
          createdAt: new Date(),
          lastActiveAt: null,
        };

        (mockPrismaClient.user.findUnique as any).mockResolvedValue(mockUser);

        // 执行几次查询
        await queryOptimizer.getUserInfo('user-123');
        await queryOptimizer.getUserInfo('user-456');

        const stats = queryOptimizer.getStats();

        expect(stats.totalQueries).toBeGreaterThan(0);
        expect(stats.averageQueryTime).toBeGreaterThanOrEqual(0);
      });

      it('应该能够重置统计信息', () => {
        queryOptimizer.resetStats();

        const stats = queryOptimizer.getStats();

        expect(stats).toEqual({
          totalQueries: 0,
          cacheHits: 0,
          cacheMisses: 0,
          averageQueryTime: 0,
          slowQueries: 0,
        });
      });
    });

    describe('缓存功能验证', () => {
      it('应该支持缓存清理功能', async () => {
        await queryOptimizer.invalidateUserCache('user-123');
        await queryOptimizer.invalidatePostCache();

        // 验证缓存清理方法不会抛出错误
        expect(true).toBe(true);
      });
    });
  });

  describe('错误处理验证', () => {
    it('应该优雅处理数据库连接错误', async () => {
      (mockPrismaClient.user.findUnique as any).mockRejectedValue(new Error('Connection failed'));

      const result = await queryOptimizer.getUserInfo('user-123');

      expect(result).toBeNull();
    });

    it('应该优雅处理无效输入', async () => {
      const result = await queryOptimizer.getUserInfo('');

      expect(result).toBeNull();
    });
  });

  describe('性能验证', () => {
    it('应该在合理时间内完成查询', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: null,
      };

      (mockPrismaClient.user.findUnique as any).mockResolvedValue(mockUser);

      const startTime = Date.now();
      await queryOptimizer.getUserInfo('user-123');
      const endTime = Date.now();

      const queryTime = endTime - startTime;
      expect(queryTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});

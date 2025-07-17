/**
 * 权限系统性能测试
 * 验证P1级权限控制完善的效果
 */

import { validatePermissions, getCacheStats, clearUserCache, clearPermissionConfigCache } from '@/lib/permissions/unified-permission-middleware';
import { UserLevel } from '@/types/user-level';

// Mock数据
const mockUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  userLevel: 'USER' as UserLevel,
  isVerified: true,
  canPublish: true,
  isActive: true,
  approvalStatus: 'APPROVED',
  lastLoginAt: new Date(),
  createdAt: new Date(),
};

const mockSession = {
  user: { id: 'test-user-123' }
};

const mockDb = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockUser)
  },
  post: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'test-post-123',
      authorId: 'test-user-123',
      isPublic: true,
      visibility: 'PUBLIC'
    })
  }
};

const mockCtx = {
  session: mockSession,
  db: mockDb
};

describe('权限系统性能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearUserCache('test-user-123');
    clearPermissionConfigCache();
  });

  describe('缓存性能测试', () => {
    it('应该在第二次调用时使用缓存', async () => {
      const options = {
        requiredLevel: 'USER' as UserLevel,
        operation: 'test_operation',
        enableAudit: false
      };

      // 第一次调用
      const start1 = Date.now();
      await validatePermissions(mockCtx, options);
      const duration1 = Date.now() - start1;

      // 第二次调用（应该使用缓存）
      const start2 = Date.now();
      await validatePermissions(mockCtx, options);
      const duration2 = Date.now() - start2;

      // 第二次调用应该更快
      expect(duration2).toBeLessThan(duration1);
      
      // 验证数据库只被调用一次
      expect(mockDb.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('应该正确管理缓存统计', async () => {
      const initialStats = getCacheStats();
      
      await validatePermissions(mockCtx, {
        requiredLevel: 'USER' as UserLevel,
        operation: 'test_cache_stats'
      });

      const afterStats = getCacheStats();
      
      expect(afterStats.userPermissionCacheSize).toBeGreaterThan(initialStats.userPermissionCacheSize);
    });
  });

  describe('细粒度权限控制测试', () => {
    it('应该检查资源访问权限', async () => {
      const options = {
        requiredLevel: 'USER' as UserLevel,
        operation: 'view',
        resourceType: 'post' as const,
        resourceId: 'test-post-123',
        enableAudit: true
      };

      const result = await validatePermissions(mockCtx, options);
      
      expect(result.user).toEqual(mockUser);
      expect(mockDb.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-post-123' },
        select: {
          authorId: true,
          isPublic: true,
          visibility: true,
        },
      });
    });

    it('应该拒绝无权限的资源访问', async () => {
      // Mock一个不属于用户的帖子
      mockDb.post.findUnique.mockResolvedValueOnce({
        id: 'other-post-123',
        authorId: 'other-user-123',
        isPublic: false,
        visibility: 'PRIVATE'
      });

      const options = {
        requiredLevel: 'USER' as UserLevel,
        operation: 'edit',
        resourceType: 'post' as const,
        resourceId: 'other-post-123',
        enableAudit: true
      };

      await expect(validatePermissions(mockCtx, options))
        .rejects
        .toThrow('没有访问该post的权限');
    });
  });

  describe('审计日志测试', () => {
    it('应该记录权限检查审计日志', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const options = {
        requiredLevel: 'USER' as UserLevel,
        operation: 'test_audit',
        enableAudit: true
      };

      await validatePermissions(mockCtx, options);

      // 等待审计日志缓冲区刷新
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        'PERMISSION_AUDIT:',
        expect.stringContaining('"operation":"test_audit"')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('性能基准测试', () => {
    it('应该在合理时间内完成权限检查', async () => {
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        await validatePermissions(mockCtx, {
          requiredLevel: 'USER' as UserLevel,
          operation: `perf_test_${i}`,
          enableAudit: false // 关闭审计以测试纯权限检查性能
        });
        
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log(`权限检查性能统计:`);
      console.log(`- 平均耗时: ${avgDuration.toFixed(2)}ms`);
      console.log(`- 最大耗时: ${maxDuration}ms`);
      console.log(`- 总检查次数: ${iterations}`);

      // 平均响应时间应该小于10ms（目标：减少40%）
      expect(avgDuration).toBeLessThan(10);
      
      // 最大响应时间应该小于50ms
      expect(maxDuration).toBeLessThan(50);
    });

    it('应该在高并发下保持性能', async () => {
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      const start = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          validatePermissions(mockCtx, {
            requiredLevel: 'USER' as UserLevel,
            operation: `concurrent_test_${i}`,
            enableAudit: false
          })
        );
      }

      await Promise.all(promises);
      
      const totalDuration = Date.now() - start;
      const avgDurationPerRequest = totalDuration / concurrentRequests;

      console.log(`并发权限检查性能:`);
      console.log(`- 总耗时: ${totalDuration}ms`);
      console.log(`- 平均每请求: ${avgDurationPerRequest.toFixed(2)}ms`);
      console.log(`- 并发数: ${concurrentRequests}`);

      // 并发情况下平均响应时间应该小于20ms
      expect(avgDurationPerRequest).toBeLessThan(20);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理无效的用户等级', async () => {
      mockDb.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        userLevel: 'INVALID_LEVEL'
      });

      const options = {
        requiredLevel: 'ADMIN' as UserLevel,
        operation: 'test_invalid_level'
      };

      await expect(validatePermissions(mockCtx, options))
        .rejects
        .toThrow();
    });

    it('应该处理不存在的资源', async () => {
      mockDb.post.findUnique.mockResolvedValueOnce(null);

      const options = {
        requiredLevel: 'USER' as UserLevel,
        operation: 'view',
        resourceType: 'post' as const,
        resourceId: 'nonexistent-post'
      };

      await expect(validatePermissions(mockCtx, options))
        .rejects
        .toThrow('没有访问该post的权限');
    });
  });
});

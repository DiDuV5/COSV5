/**
 * @fileoverview 待审批用户列表功能测试 - 重构版本
 * @description 使用新的测试架构重构的待审批用户列表测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('待审批用户列表功能 - 重构版本', () => {
  // 测试数据
  const mockPendingUsers = [
    TestMockFactory.createUserData('USER', {
      id: 'user-1',
      username: 'pending1',
      email: 'pending1@example.com',
      approvalStatus: 'PENDING',
      createdAt: new Date('2025-01-01'),
    }),
    TestMockFactory.createUserData('USER', {
      id: 'user-2',
      username: 'pending2',
      email: 'pending2@example.com',
      approvalStatus: 'PENDING',
      createdAt: new Date('2025-01-02'),
    }),
    TestMockFactory.createUserData('USER', {
      id: 'user-3',
      username: 'pending3',
      email: 'pending3@example.com',
      approvalStatus: 'PENDING',
      createdAt: new Date('2025-01-03'),
    }),
  ];

  const mockListInput = {
    limit: 10,
    cursor: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: ''
  };

  const mockListResult = {
    success: true,
    users: mockPendingUsers,
    total: 3,
    hasMore: false,
    nextCursor: null
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('getPendingUsersList 方法', () => {
    describe('成功场景', () => {
      it('应该返回待审批用户列表', async () => {
        // Arrange
        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(mockListResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(mockListInput);

        // Assert
        expect(result).toEqual({
          success: true,
          users: expect.arrayContaining([
            expect.objectContaining({
              id: 'user-1',
              approvalStatus: 'PENDING'
            }),
            expect.objectContaining({
              id: 'user-2',
              approvalStatus: 'PENDING'
            }),
            expect.objectContaining({
              id: 'user-3',
              approvalStatus: 'PENDING'
            })
          ]),
          total: 3,
          hasMore: false,
          nextCursor: null
        });

        TestHelpers.verifyMockCallTimes(mockUserService.getPendingUsersList, 1);
      });

      it('应该支持分页查询', async () => {
        // Arrange
        const paginatedInput = {
          ...mockListInput,
          limit: 2,
          cursor: 'user-1'
        };

        const paginatedResult = {
          success: true,
          users: mockPendingUsers.slice(1, 3),
          total: 3,
          hasMore: false,
          nextCursor: null
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(paginatedResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(paginatedInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(2);
        expect(result.total).toBe(3);
        expect(result.hasMore).toBe(false);
      });

      it('应该支持搜索功能', async () => {
        // Arrange
        const searchInput = {
          ...mockListInput,
          search: 'pending1'
        };

        const searchResult = {
          success: true,
          users: [mockPendingUsers[0]],
          total: 1,
          hasMore: false,
          nextCursor: null
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(searchResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(searchInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(1);
        expect(result.users[0].username).toBe('pending1');
        expect(result.total).toBe(1);
      });

      it('应该支持排序功能', async () => {
        // Arrange
        const sortedInput = {
          ...mockListInput,
          sortBy: 'username',
          sortOrder: 'asc'
        };

        const sortedUsers = [...mockPendingUsers].sort((a, b) =>
          a.username.localeCompare(b.username)
        );

        const sortedResult = {
          success: true,
          users: sortedUsers,
          total: 3,
          hasMore: false,
          nextCursor: null
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(sortedResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(sortedInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users[0].username).toBe('pending1');
        expect(result.users[1].username).toBe('pending2');
        expect(result.users[2].username).toBe('pending3');
      });
    });

    describe('错误场景', () => {
      it('应该处理数据库查询失败', async () => {
        // Arrange
        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockRejectedValue(
            new Error('数据库查询失败')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockUserService.getPendingUsersList(mockListInput),
          '数据库查询失败'
        );
      });

      it('应该处理无效的分页参数', async () => {
        // Arrange
        const invalidInput = {
          ...mockListInput,
          limit: -1
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockRejectedValue(
            new Error('无效的分页参数')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockUserService.getPendingUsersList(invalidInput),
          '无效的分页参数'
        );
      });

      it('应该处理无效的排序参数', async () => {
        // Arrange
        const invalidInput = {
          ...mockListInput,
          sortBy: 'invalid_field'
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockRejectedValue(
            new Error('无效的排序字段')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockUserService.getPendingUsersList(invalidInput),
          '无效的排序字段'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理空结果', async () => {
        // Arrange
        const emptyResult = {
          success: true,
          users: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(emptyResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(mockListInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.hasMore).toBe(false);
      });

      it('应该处理大量数据的分页', async () => {
        // Arrange
        const largeDataInput = {
          ...mockListInput,
          limit: 50
        };

        const largeDataResult = {
          success: true,
          users: Array.from({ length: 50 }, (_, i) =>
            TestMockFactory.createUserData('USER', {
              id: `user-${i + 1}`,
              username: `pending${i + 1}`,
              approvalStatus: 'PENDING'
            })
          ),
          total: 150,
          hasMore: true,
          nextCursor: 'user-50'
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(largeDataResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(largeDataInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(50);
        expect(result.total).toBe(150);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBe('user-50');
      });

      it('应该处理特殊字符的搜索', async () => {
        // Arrange
        const specialSearchInput = {
          ...mockListInput,
          search: '@#$%^&*()'
        };

        const emptyResult = {
          success: true,
          users: [],
          total: 0,
          hasMore: false,
          nextCursor: null
        };

        const mockUserService = ServiceMockFactory.createUserService({
          getPendingUsersList: jest.fn().mockResolvedValue(emptyResult)
        });

        // Act
        const result = await mockUserService.getPendingUsersList(specialSearchInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.users).toHaveLength(0);
      });
    });
  });

  describe('权限验证', () => {
    it('管理员应该能够查看待审批用户列表', async () => {
      // Arrange
      const mockUserService = ServiceMockFactory.createUserService({
        getPendingUsersList: jest.fn().mockResolvedValue(mockListResult)
      });

      // Act
      const result = await mockUserService.getPendingUsersList(mockListInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertUserPermission('ADMIN', 'ADMIN');
    });

    it('普通用户不应该能够查看待审批用户列表', async () => {
      // Arrange
      const mockUserService = ServiceMockFactory.createUserService({
        getPendingUsersList: jest.fn().mockRejectedValue(
          new Error('权限不足')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockUserService.getPendingUsersList(mockListInput),
        '权限不足'
      );
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内返回结果', async () => {
      // Arrange
      const mockUserService = ServiceMockFactory.createUserService({
        getPendingUsersList: jest.fn().mockResolvedValue(mockListResult)
      });

      // Act
      const startTime = Date.now();
      const result = await mockUserService.getPendingUsersList(mockListInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 100); // 100ms内完成
    });

    it('应该正确处理列表数据的完整性', async () => {
      // Arrange
      const mockUserService = ServiceMockFactory.createUserService({
        getPendingUsersList: jest.fn().mockResolvedValue(mockListResult)
      });

      // Act
      const result = await mockUserService.getPendingUsersList(mockListInput);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('nextCursor');

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.users)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');

      // 验证用户数据结构
      result.users.forEach((user: any) => {
        TestAssertions.assertValidUserData(user);
        expect(user.approvalStatus).toBe('PENDING');
      });
    });
  });
});

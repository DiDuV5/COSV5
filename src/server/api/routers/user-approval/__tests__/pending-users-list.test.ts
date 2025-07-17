/**
 * @fileoverview 待审批用户列表功能测试
 * @description 测试获取待审批用户列表的各种场景
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// @ts-expect-error - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getPendingUsersList } from '../approval-handler';
import {
  createMockContext,
  createMockUsers,
  createUserListInput,
  setupBasicMocks,
  expectUserListResult,
} from './test-utils';

describe('待审批用户列表功能', () => {
  let mockContext: any;
  let mockPrisma: any;

  beforeEach(() => {
    // 创建Mock上下文
    mockContext = createMockContext('ADMIN');
    mockPrisma = mockContext.prisma;

    // 设置基础Mock
    setupBasicMocks(mockContext);
  });

  describe('getPendingUsersList - 成功场景', () => {
    it('应该返回待审批用户列表', async () => {
      const mockUsers = createMockUsers(5);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        limit: 10,
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 5,
        hasMore: false,
        nextCursor: null,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        take: input.limit + 1,
      });
    });

    it('应该支持分页查询', async () => {
      const mockUsers = createMockUsers(11); // 超过limit的数量

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        limit: 10,
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 10, // 应该只返回limit数量的用户
        hasMore: true,
      });

      expect(result.nextCursor).toBeDefined();
    });

    it('应该支持搜索功能', async () => {
      const mockUsers = createMockUsers(3);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        search: 'test',
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 3,
        hasMore: false,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
          OR: expect.any(Array),
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        take: input.limit + 1,
      });
    });

    it('应该支持不同的排序方式', async () => {
      const mockUsers = createMockUsers(3);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        sortBy: 'username',
        sortOrder: 'asc',
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 3,
        hasMore: false,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
        },
        select: expect.any(Object),
        orderBy: { username: 'asc' },
        take: input.limit + 1,
      });
    });

    it('应该支持游标分页', async () => {
      const mockUsers = createMockUsers(5);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        cursor: 'cursor-123',
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 5,
        hasMore: false,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        take: input.limit + 1,
        cursor: { id: input.cursor },
        skip: 1,
      });
    });
  });

  describe('getPendingUsersList - 边界情况', () => {
    it('应该处理空结果', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const input = createUserListInput();

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 0,
        hasMore: false,
        nextCursor: null,
      });
    });

    it('应该处理最小limit值', async () => {
      const mockUsers = createMockUsers(1);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        limit: 1,
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 1,
        hasMore: false,
      });
    });

    it('应该处理最大limit值', async () => {
      const mockUsers = createMockUsers(100);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        limit: 100,
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 100,
        hasMore: false,
      });
    });

    it('应该处理特殊字符搜索', async () => {
      const mockUsers = createMockUsers(2);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        search: '@#$%^&*()',
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 2,
        hasMore: false,
      });
    });

    it('应该处理长搜索字符串', async () => {
      const mockUsers = createMockUsers(1);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const longSearch = 'a'.repeat(1000);
      const input = createUserListInput({
        search: longSearch,
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 1,
        hasMore: false,
      });
    });
  });

  describe('getPendingUsersList - 错误场景', () => {
    it('应该在数据库查询失败时抛出错误', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const input = createUserListInput();

      await expect(
        getPendingUsersList(
          mockContext.db,
          input.limit,
          input.cursor,
          input.sortBy,
          input.sortOrder,
          input.search
        )
      ).rejects.toThrow();
    });

    it('应该在无效的排序字段时使用默认排序', async () => {
      const mockUsers = createMockUsers(3);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const input = createUserListInput({
        sortBy: 'invalidField',
      });

      const result = await getPendingUsersList(
        mockContext.db,
        input.limit,
        input.cursor,
        input.sortBy,
        input.sortOrder,
        input.search
      );

      expectUserListResult(result, {
        itemsLength: 3,
        hasMore: false,
      });

      // 应该使用默认排序
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        take: input.limit + 1,
      });
    });
  });
});

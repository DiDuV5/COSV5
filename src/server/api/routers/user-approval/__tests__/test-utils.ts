/**
 * @fileoverview 用户审批测试工具函数
 * @description 提供测试中使用的共享Mock函数和工具
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

// Mock notification functions
export const mockNotificationHandlers = {
  sendUserApprovalNotification: jest.fn() as any,
  sendBatchUserApprovalNotifications: jest.fn() as any,
};

// Mock dependencies
jest.mock('../notification-handler', () => mockNotificationHandlers);

/**
 * 创建增强的Mock上下文函数
 */
export function createMockContext(userLevel: string = 'ADMIN') {
  const baseContext = global.createMockContext({ userLevel });

  // 设置数据库Mock返回值以支持认证
  baseContext.prisma.user.findUnique.mockResolvedValue({
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    userLevel: userLevel as any,
    isVerified: true,
    canPublish: true,
    isActive: true,
    approvalStatus: 'APPROVED',
    avatarUrl: null,
    displayName: null,
  });

  return {
    ...baseContext,
    db: baseContext.prisma, // 确保db属性存在
    session: {
      ...baseContext.session,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 添加expires属性
      user: {
        ...baseContext.session.user,
        id: 'test-user-id', // 确保user.id存在
        userLevel: userLevel as any, // 确保userLevel正确
        isVerified: true,
        canPublish: true,
        approvalStatus: 'APPROVED',
      },
    },
  };
}

/**
 * 创建Mock用户数据
 */
export function createMockUser(overrides: any = {}) {
  return global.createMockUser({
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    approvalStatus: 'PENDING',
    userLevel: 'USER',
    ...overrides,
  });
}

/**
 * 创建Mock批量用户数据
 */
export function createMockUsers(count: number = 3) {
  return Array.from({ length: count }, (_, index) => ({
    id: `user-${index + 1}`,
    username: `user${index + 1}`,
    email: `user${index + 1}@example.com`,
    displayName: `User ${index + 1}`,
    approvalStatus: 'PENDING',
    userLevel: 'USER',
  }));
}

/**
 * 设置基础Mock返回值
 */
export function setupBasicMocks(mockContext: any) {
  // 设置默认的Mock返回值
  mockContext.prisma.systemSetting.findFirst.mockResolvedValue({ value: 'true' });

  // 重置所有Mock
  jest.clearAllMocks();

  // 重置通知Mock
  mockNotificationHandlers.sendUserApprovalNotification.mockResolvedValue();
  mockNotificationHandlers.sendBatchUserApprovalNotifications.mockResolvedValue();
}

/**
 * 创建Mock请求对象
 */
export function createMockRequest(overrides: any = {}) {
  return {
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  };
}

/**
 * 验证审批结果的通用函数
 */
export function expectApprovalResult(result: any, expectedValues: any) {
  expect(result).toBeDefined();
  expect(result.success).toBe(expectedValues.success);
  expect(result.message).toBe(expectedValues.message);
  if (expectedValues.user) {
    expect(result.user).toMatchObject(expectedValues.user);
  }
}

/**
 * 验证批量审批结果的通用函数
 */
export function expectBatchApprovalResult(result: any, expectedValues: any) {
  expect(result).toBeDefined();
  expect(result.success).toBe(expectedValues.success);
  expect(result.message).toBe(expectedValues.message);
  expect(result.processedCount).toBe(expectedValues.processedCount);
  if (expectedValues.successfulUsers) {
    expect(result.successfulUsers).toHaveLength(expectedValues.successfulUsers);
  }
  if (expectedValues.failedUsers) {
    expect(result.failedUsers).toHaveLength(expectedValues.failedUsers);
  }
}

/**
 * 验证用户列表结果的通用函数
 */
export function expectUserListResult(result: any, expectedValues: any) {
  expect(result).toBeDefined();
  expect(result.items).toHaveLength(expectedValues.itemsLength);
  expect(result.hasMore).toBe(expectedValues.hasMore);
  if (expectedValues.nextCursor !== undefined) {
    expect(result.nextCursor).toBe(expectedValues.nextCursor);
  }
}

/**
 * 创建标准的审批输入数据
 */
export function createApprovalInput(overrides: any = {}) {
  return {
    userId: 'user-123',
    action: 'APPROVE' as const,
    reason: '符合要求',
    notifyUser: true,
    ...overrides,
  };
}

/**
 * 创建标准的批量审批输入数据
 */
export function createBatchApprovalInput(overrides: any = {}) {
  return {
    userIds: ['user-1', 'user-2', 'user-3'],
    action: 'APPROVE' as const,
    reason: '批量审批通过',
    notifyUsers: true,
    ...overrides,
  };
}

/**
 * 创建标准的用户列表查询输入
 */
export function createUserListInput(overrides: any = {}) {
  return {
    limit: 10,
    cursor: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: undefined,
    ...overrides,
  };
}

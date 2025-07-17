/**
 * @fileoverview Mock类型定义
 * @description 为测试提供统一的Mock类型定义
 * @author Augment AI
 * @date 2025-07-05
 */

import { jest } from '@jest/globals';

/**
 * 通用Mock函数类型
 */
export type MockFunction = jest.Mock<any>;

/**
 * Mock返回值类型
 */
export type MockReturnValue<T = any> = T;

/**
 * Prisma Mock类型定义 - 简化版本，使用any类型以避免复杂的类型兼容性问题
 */
export interface MockPrismaClient {
  user: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    updateMany: any;
    delete: any;
    deleteMany: any;
    count: any;
    upsert: any;
  };
  session: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    updateMany: any;
    delete: any;
    deleteMany: any;
  };
  verificationToken: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    delete: any;
    deleteMany: any;
  };
  userApprovalLog: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    delete: any;
    deleteMany: any;
  };
  timeoutNotification: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    delete: any;
    deleteMany: any;
  };
  systemSetting: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    delete: any;
    deleteMany: any;
    upsert: any;
  };
  userCansAccount: {
    findUnique: any;
    findFirst: any;
    findMany: any;
    create: any;
    update: any;
    delete: any;
    deleteMany: any;
  };
  $transaction: any;
  $connect: any;
  $disconnect: any;
}

/**
 * 创建Mock Prisma客户端
 */
export function createMockPrismaClient(): MockPrismaClient {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    verificationToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userApprovalLog: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    timeoutNotification: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    userCansAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  } as MockPrismaClient;
}

/**
 * Mock上下文类型
 */
export interface MockContext {
  session?: any;
  user?: any;
  prisma: MockPrismaClient;
  db: MockPrismaClient;
}

/**
 * 创建Mock上下文
 */
export function createMockContext(options: { userLevel?: string; session?: any } = {}): MockContext {
  const mockPrisma = createMockPrismaClient();

  const defaultSession = options.session || {
    user: {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      userLevel: options.userLevel || 'USER',
      emailVerified: new Date(),
      isActive: true,
      isVerified: true,
      canPublish: true,
      approvalStatus: 'APPROVED',
      avatarUrl: null,
      // 添加测试中期望的属性
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return {
    session: defaultSession,
    user: defaultSession.user,
    prisma: mockPrisma as any, // 类型断言以兼容Prisma类型
    db: mockPrisma as any, // 类型断言以兼容Prisma类型
  };
}

/**
 * 创建兼容tRPC的Mock上下文（类型更宽松）
 */
export function createMockTRPCContext(options: any = {}): any {
  const mockPrisma = createMockPrismaClient();

  const defaultSession = options.session || {
    user: {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      userLevel: options.userLevel || 'USER',
      emailVerified: new Date(),
      isActive: true,
      isVerified: true,
      canPublish: true,
      approvalStatus: 'APPROVED',
      avatarUrl: null,
      // 添加测试中期望的属性
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return {
    session: defaultSession,
    user: defaultSession.user,
    prisma: mockPrisma as any,
    db: mockPrisma as any,
    ...options,
  };
}

/**
 * Mock bcrypt类型
 */
export interface MockBcrypt {
  hash: MockFunction;
  compare: MockFunction;
}

/**
 * 重置所有Mock
 */
export function resetAllMocks(mockPrisma: MockPrismaClient) {
  Object.values(mockPrisma.user).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  Object.values(mockPrisma.session).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  Object.values(mockPrisma.verificationToken).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  Object.values(mockPrisma.userApprovalLog).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  Object.values(mockPrisma.timeoutNotification).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  Object.values(mockPrisma.systemSetting).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  if (mockPrisma.$transaction && 'mockReset' in mockPrisma.$transaction) {
    mockPrisma.$transaction.mockReset();
  }
}

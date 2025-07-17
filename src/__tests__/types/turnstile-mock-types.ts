/**
 * @fileoverview Turnstile测试Mock类型定义
 * @description 为Turnstile相关测试提供类型安全的Mock定义
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Jest Mock函数类型
 */
export type MockFunction<T = any> = jest.MockedFunction<(...args: any[]) => T>;

/**
 * Turnstile配置Mock类型
 */
export interface MockTurnstileConfig {
  id: string;
  featureId: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * 用户Mock类型
 */
export interface MockUser {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
  userLevel: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prisma Mock客户端类型（专门为Turnstile测试设计）
 */
export interface MockPrismaClient {
  user: {
    findUnique: MockFunction<Promise<MockUser | null>>;
    findFirst: MockFunction<Promise<MockUser | null>>;
    findMany: MockFunction<Promise<MockUser[]>>;
    create: MockFunction<Promise<MockUser>>;
    update: MockFunction<Promise<MockUser>>;
    updateMany: MockFunction<Promise<{ count: number }>>;
    delete: MockFunction<Promise<MockUser>>;
    deleteMany: MockFunction<Promise<{ count: number }>>;
    count: MockFunction<Promise<number>>;
    upsert: MockFunction<Promise<MockUser>>;
  };
  turnstileConfig: {
    findUnique: MockFunction<Promise<MockTurnstileConfig | null>>;
    findFirst: MockFunction<Promise<MockTurnstileConfig | null>>;
    findMany: MockFunction<Promise<MockTurnstileConfig[]>>;
    create: MockFunction<Promise<MockTurnstileConfig>>;
    update: MockFunction<Promise<MockTurnstileConfig>>;
    updateMany: MockFunction<Promise<{ count: number }>>;
    delete: MockFunction<Promise<MockTurnstileConfig>>;
    deleteMany: MockFunction<Promise<{ count: number }>>;
    count: MockFunction<Promise<number>>;
    upsert: MockFunction<Promise<MockTurnstileConfig>>;
  };
  $transaction: MockFunction<Promise<any>>;
  $connect: MockFunction<Promise<void>>;
  $disconnect: MockFunction<Promise<void>>;
}

/**
 * 批量操作结果Mock类型
 */
export interface MockBatchResult {
  success: boolean;
  enabledCount?: number;
  disabledCount?: number;
  totalCount: number;
  errors: string[];
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
    turnstileConfig: {
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
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

/**
 * 创建Mock用户数据
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    username: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
    userLevel: 'SUPER_ADMIN',
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建Mock Turnstile配置数据
 */
export function createMockTurnstileConfig(overrides: Partial<MockTurnstileConfig> = {}): MockTurnstileConfig {
  return {
    id: 'test-config-id',
    featureId: 'USER_LOGIN',
    enabled: true,
    updatedBy: 'test-user-id',
    updatedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建Mock批量操作结果
 */
export function createMockBatchResult(overrides: Partial<MockBatchResult> = {}): MockBatchResult {
  return {
    success: true,
    enabledCount: 4,
    totalCount: 4,
    errors: [],
    ...overrides,
  };
}

/**
 * 类型安全的Mock断言函数
 */
export function asMockPrismaClient(client: any): MockPrismaClient {
  return client as MockPrismaClient;
}

/**
 * 重置所有Mock
 */
export function resetAllMocks(mockPrisma: MockPrismaClient): void {
  // 重置用户相关Mock
  Object.values(mockPrisma.user).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  // 重置Turnstile配置相关Mock
  Object.values(mockPrisma.turnstileConfig).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });

  // 重置事务Mock
  if (mockPrisma.$transaction && 'mockReset' in mockPrisma.$transaction) {
    mockPrisma.$transaction.mockReset();
  }
}

/**
 * 设置默认Mock行为
 */
export function setupDefaultMockBehavior(mockPrisma: MockPrismaClient): void {
  // 设置用户查询默认行为
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
  mockPrisma.user.findFirst.mockResolvedValue(createMockUser());
  mockPrisma.user.findMany.mockResolvedValue([createMockUser()]);
  mockPrisma.user.create.mockResolvedValue(createMockUser());
  mockPrisma.user.upsert.mockResolvedValue(createMockUser());

  // 设置Turnstile配置默认行为
  mockPrisma.turnstileConfig.findUnique.mockResolvedValue(createMockTurnstileConfig());
  mockPrisma.turnstileConfig.findMany.mockResolvedValue([createMockTurnstileConfig()]);
  mockPrisma.turnstileConfig.create.mockResolvedValue(createMockTurnstileConfig());
  mockPrisma.turnstileConfig.upsert.mockResolvedValue(createMockTurnstileConfig());
  mockPrisma.turnstileConfig.updateMany.mockResolvedValue({ count: 4 });

  // 设置事务默认行为
  mockPrisma.$transaction.mockImplementation((callback) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.resolve(callback);
  });
}

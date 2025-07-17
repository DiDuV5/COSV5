/**
 * 扩展的Mock类型定义
 * 用于解决测试中的类型兼容性问题
 */

import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Mock Prisma客户端类型
export type MockPrismaClient = {
  [K in keyof PrismaClient]: any;
};

// Mock Session类型
export type MockSession = {
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    userLevel: string;
    emailVerified: Date | null;
    isActive: boolean;
    isVerified: boolean;
    canPublish: boolean;
    avatarUrl?: string | null;
    approvalStatus: string;
  };
  expires: string;
};

// Mock Context类型
export type MockContext = {
  session: MockSession | null;
  prisma: MockPrismaClient;
  db: MockPrismaClient;
};

// Mock函数类型
export type MockFunction<T = any> = jest.MockedFunction<(...args: any[]) => T>;

// Mock返回值类型断言
export const mockResolvedValue = <T>(value: T): T => value as any;

// Mock Prisma操作结果类型
export interface MockPrismaResult<T = any> {
  id: string;
  [key: string]: any;
}

// Mock邮件服务类型
export interface MockEmailService {
  sendVerificationEmail: MockFunction<Promise<boolean>>;
  sendUserApprovalNotification: MockFunction<Promise<void>>;
  sendBatchUserApprovalNotifications: MockFunction<Promise<void>>;
}

// Mock上传任务类型
export interface MockUploadTask {
  id: string;
  userId: string;
  filename: string;
  size: number;
  priority: 'normal' | 'high' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: Date;
  execute: MockFunction<Promise<string>>;
  request?: any;
}

// 类型安全的Mock创建函数
export const createMockPrismaClient = (): MockPrismaClient => {
  const mockMethods = {
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
  };

  return {
    user: mockMethods,
    verificationToken: mockMethods,
    userApprovalLog: mockMethods,
    post: mockMethods,
    file: mockMethods,
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  } as any;
};

// 类型安全的Mock上下文创建函数
export const createMockContextTyped = (overrides?: Partial<MockContext>): any => {
  const defaultContext = {
    session: {
      user: {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER' as any,
        emailVerified: new Date(),
        isActive: true,
        isVerified: true,
        canPublish: true,
        avatarUrl: null,
        approvalStatus: 'APPROVED',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    prisma: createMockPrismaClient(),
    db: createMockPrismaClient(),
  };

  return {
    ...defaultContext,
    ...overrides,
  } as any;
};

// Mock数据生成器
export const createMockUser = (overrides?: any) => ({
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  userLevel: 'USER',
  emailVerified: new Date(),
  isActive: true,
  isVerified: true,
  canPublish: true,
  avatarUrl: null,
  approvalStatus: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockVerificationToken = (overrides?: any) => ({
  token: 'test-token',
  identifier: 'test@example.com',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  ...overrides,
});

export const createMockUploadTask = (overrides?: any): MockUploadTask => ({
  id: 'test-task-id',
  userId: 'test-user-id',
  filename: 'test-file.jpg',
  size: 1024,
  priority: 'normal',
  status: 'pending',
  retryCount: 0,
  createdAt: new Date(),
  execute: jest.fn().mockResolvedValue('success'),
  ...overrides,
});

// 全局Mock类型断言函数
export const asMockFunction = <T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> => fn as any;
export const asMockPrismaClient = (client: any): MockPrismaClient => client as any;
export const asMockContext = (context: any): MockContext => context as any;

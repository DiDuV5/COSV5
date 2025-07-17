/**
 * @fileoverview 认证测试工具函数
 * @description 提供认证测试所需的通用工具和模拟数据
 */

import { jest } from '@jest/globals';
import { PrismaClient as _PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encode, decode } from 'next-auth/jwt';

// 模拟用户数据
export const mockUsers = {
  validUser: {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedpassword',
    userLevel: 'USER',
    isVerified: true,
    isActive: true,
    canPublish: false,
    emailVerified: new Date(),
    registrationStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  unverifiedUser: {
    id: 'user-456',
    username: 'unverified',
    email: 'unverified@example.com',
    passwordHash: '$2a$10$hashedpassword',
    userLevel: 'USER',
    isVerified: false,
    isActive: true,
    canPublish: false,
    emailVerified: null,
    registrationStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  inactiveUser: {
    id: 'user-789',
    username: 'inactive',
    email: 'inactive@example.com',
    passwordHash: '$2a$10$hashedpassword',
    userLevel: 'USER',
    isVerified: true,
    isActive: false,
    canPublish: false,
    emailVerified: new Date(),
    registrationStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  adminUser: {
    id: 'admin-123',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2a$10$hashedpassword',
    userLevel: 'ADMIN',
    isVerified: true,
    isActive: true,
    canPublish: true,
    emailVerified: new Date(),
    registrationStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// 创建模拟的Prisma客户端
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  } as any;
}

// 创建模拟的tRPC上下文
export function createMockTRPCContext(options: {
  user?: any;
  session?: any;
  prisma?: any;
} = {}) {
  const prisma = options.prisma || createMockPrismaClient();
  return {
    session: options.session || null,
    user: options.user || null,
    prisma: prisma,
    db: prisma, // 添加db属性，指向同一个prisma实例
    repositories: { // 添加repositories属性
      user: {
        findByUsername: jest.fn(),
        findByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findByToken: jest.fn(),
        delete: jest.fn(),
      },
      post: {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      comment: {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
    req: {
      headers: {},
      cookies: {},
    },
    res: {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    },
  };
}

// 模拟bcrypt函数
export function setupBcryptMocks() {
  const mockBcrypt = bcrypt as any;
  mockBcrypt.compare = jest.fn();
  mockBcrypt.hash = jest.fn();
  mockBcrypt.genSalt = jest.fn();

  return mockBcrypt;
}

// 模拟NextAuth JWT函数
export function setupJWTMocks() {
  const mockEncode = encode as jest.MockedFunction<typeof encode>;
  const mockDecode = decode as jest.MockedFunction<typeof decode>;

  mockEncode.mockResolvedValue('mock-jwt-token');
  mockDecode.mockResolvedValue({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    userLevel: 'USER',
    isVerified: true,
    canPublish: false,
    approvalStatus: 'approved',
    isActive: true,
    emailVerified: new Date(),
    avatarUrl: null,
    displayName: 'Test User',
  });

  return { mockEncode, mockDecode };
}

// 重置所有模拟
export function resetAllMocks(mockPrisma: any) {
  Object.values(mockPrisma).forEach((table: any) => {
    if (typeof table === 'object' && table !== null) {
      Object.values(table).forEach((method: any) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
}

// 设置成功的登录场景
export function setupSuccessfulLogin(mockPrisma: any, mockBcrypt: any, user = mockUsers.validUser) {
  mockPrisma.user.findFirst.mockResolvedValue(user);
  mockBcrypt.compare.mockResolvedValue(true);
  mockPrisma.user.update.mockResolvedValue({ ...user, lastLoginAt: new Date() });
  mockPrisma.session.create.mockResolvedValue({
    id: 'session-123',
    userId: user.id,
    sessionToken: `session_${user.id}_${Date.now()}`,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
  });
  mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
}

// 设置失败的登录场景
export function setupFailedLogin(mockPrisma: any, mockBcrypt: any, scenario: 'user-not-found' | 'wrong-password' | 'unverified' | 'inactive') {
  switch (scenario) {
    case 'user-not-found':
      mockPrisma.user.findFirst.mockResolvedValue(null);
      break;
    case 'wrong-password':
      mockPrisma.user.findFirst.mockResolvedValue(mockUsers.validUser);
      mockBcrypt.compare.mockResolvedValue(false);
      break;
    case 'unverified':
      mockPrisma.user.findFirst.mockResolvedValue(mockUsers.unverifiedUser);
      mockBcrypt.compare.mockResolvedValue(true);
      break;
    case 'inactive':
      mockPrisma.user.findFirst.mockResolvedValue(mockUsers.inactiveUser);
      mockBcrypt.compare.mockResolvedValue(true);
      break;
  }
}

// 验证登录结果的工具函数
export function expectSuccessfulLoginResult(result: any, expectedUser: any) {
  expect(result.success).toBe(true);
  expect(result.message).toContain('登录成功');
  expect(result.user).toMatchObject({
    id: expectedUser.id,
    username: expectedUser.username,
    email: expectedUser.email,
    userLevel: expectedUser.userLevel,
    emailVerified: expectedUser.emailVerified,
    isActive: expectedUser.isActive,
  });
  expect(result.session).toBeDefined();
  expect(result.session.token).toBeDefined();
  expect(result.session.expires).toBeDefined();
}

// 验证登录失败结果的工具函数
export function expectFailedLoginResult(error: any, expectedMessage: string) {
  expect(error.message).toContain(expectedMessage);
}

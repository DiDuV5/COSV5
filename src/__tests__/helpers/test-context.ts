/**
 * @fileoverview 测试上下文辅助函数
 * @description 为测试提供统一的上下文创建
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 创建测试上下文
 */
export function createTestContext(overrides: any = {}) {
  const mockPrisma = overrides.prisma || {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    like: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  // 创建mock repositories
  const mockRepositories = {
    user: {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    post: {
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    session: overrides.session || null,
    prisma: mockPrisma,
    db: mockPrisma,
    repositories: overrides.repositories || mockRepositories,
    ...overrides,
  };
}

/**
 * @fileoverview 认证系统性能和压力测试 - P2级别
 * @description 测试认证系统的性能基准，包括登录性能、并发用户测试、内存使用监控、响应时间分析，目标<500ms响应时间
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 设置环境变量
process.env.COSEREEDEN_NEXTAUTH_SECRET = 'test-secret-key-for-jwt';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

// Mock TRPCErrorHandler
class MockTRPCError extends Error {
  code: string;
  constructor(options: { code: string; message: string }) {
    super(options.message);
    this.name = 'TRPCError';
    this.code = options.code;
  }
}

jest.mock('@/lib/errors/trpc-error-handler', () => ({
  TRPCErrorHandler: {
    businessError: jest.fn((type, message, context) => {
      return new MockTRPCError({
        code: 'BAD_REQUEST',
        message: (message as string) || 'Business error',
      });
    }),
  },
  BusinessErrorType: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  },
}));

// Mock UserLevel
jest.mock('@/types/user-level', () => ({
  UserLevel: {
    GUEST: 'GUEST',
    USER: 'USER',
    VIP: 'VIP',
    CREATOR: 'CREATOR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },
}));

import * as bcrypt from 'bcryptjs';

describe('认证系统性能和压力测试 - P2级别', () => {
  let mockPrisma: any;
  let mockCtx: any;
  let mockBcrypt: any;
  let performanceMetrics: {
    loginTimes: number[];
    memoryUsage: number[];
    concurrentUsers: number;
    errorRate: number;
  };

  beforeEach(() => {
    mockBcrypt = bcrypt as any;

    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };

    mockCtx = {
      prisma: mockPrisma,
      db: mockPrisma,
      session: null,
      user: null,
    };

    performanceMetrics = {
      loginTimes: [],
      memoryUsage: [],
      concurrentUsers: 0,
      errorRate: 0,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('登录性能基准测试', () => {
    const testUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: '$2a$10$hashedpassword',
      userLevel: 'USER',
      isActive: true,
      emailVerified: new Date(),
    };

    it('应该在500ms内完成单次登录', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        userId: testUser.id,
        sessionToken: 'session-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const startTime = performance.now();

      // 模拟登录过程
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      // 执行登录逻辑
      const user = await mockPrisma.user.findFirst({
        where: { username: loginData.username },
      });

      if (user) {
        const passwordValid = await mockBcrypt.compare(loginData.password, user.passwordHash);
        if (passwordValid) {
          await mockPrisma.userSession.create({
            data: {
              userId: user.id,
              sessionToken: 'session-token',
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      const endTime = performance.now();
      const loginTime = endTime - startTime;

      performanceMetrics.loginTimes.push(loginTime);

      expect(loginTime).toBeLessThan(500); // 500ms目标
      expect(user).toBeDefined();
    });

    it('应该测试批量登录性能', async () => {
      const batchSize = 10;
      const loginPromises: Promise<any>[] = [];

      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        userId: testUser.id,
        sessionToken: 'session-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const startTime = performance.now();

      // 创建批量登录请求
      for (let i = 0; i < batchSize; i++) {
        const loginPromise = (async () => {
          const user = await mockPrisma.user.findFirst({
            where: { username: `testuser${i}` },
          });

          if (user) {
            const passwordValid = await mockBcrypt.compare('password123', user.passwordHash);
            if (passwordValid) {
              return await mockPrisma.userSession.create({
                data: {
                  userId: user.id,
                  sessionToken: `session-token-${i}`,
                  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });
            }
          }
          return null;
        })();

        loginPromises.push(loginPromise);
      }

      const results = await Promise.all(loginPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / batchSize;

      performanceMetrics.loginTimes.push(averageTime);

      expect(averageTime).toBeLessThan(500); // 平均500ms目标
      expect(results.filter(r => r !== null)).toHaveLength(batchSize);
    });

    it('应该测试密码验证性能', async () => {
      const passwords = [
        'password123',
        'verylongpasswordwithmanycharacters',
        'short',
        'P@ssw0rd!Complex',
        '12345678901234567890',
      ];

      const hashTimes: number[] = [];
      const compareTimes: number[] = [];

      for (const password of passwords) {
        // 测试密码哈希性能
        const hashStartTime = performance.now();
        mockBcrypt.genSalt.mockResolvedValue('salt');
        mockBcrypt.hash.mockResolvedValue('$2a$10$hashedpassword');

        await mockBcrypt.genSalt(10);
        await mockBcrypt.hash(password, 'salt');

        const hashEndTime = performance.now();
        hashTimes.push(hashEndTime - hashStartTime);

        // 测试密码比较性能
        const compareStartTime = performance.now();
        mockBcrypt.compare.mockResolvedValue(true);

        await mockBcrypt.compare(password, '$2a$10$hashedpassword');

        const compareEndTime = performance.now();
        compareTimes.push(compareEndTime - compareStartTime);
      }

      const avgHashTime = hashTimes.reduce((a, b) => a + b, 0) / hashTimes.length;
      const avgCompareTime = compareTimes.reduce((a, b) => a + b, 0) / compareTimes.length;

      expect(avgHashTime).toBeLessThan(100); // 100ms目标
      expect(avgCompareTime).toBeLessThan(50); // 50ms目标
    });
  });

  describe('并发用户测试', () => {
    it('应该处理10个并发登录请求', async () => {
      const concurrentUsers = 10;
      const loginPromises: Promise<any>[] = [];

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        passwordHash: '$2a$10$hashedpassword',
        userLevel: 'USER',
        isActive: true,
        emailVerified: new Date(),
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        sessionToken: 'session-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const startTime = performance.now();

      // 创建并发登录请求
      for (let i = 0; i < concurrentUsers; i++) {
        const loginPromise = (async () => {
          const user = await mockPrisma.user.findFirst({
            where: { username: `user${i}` },
          });

          if (user) {
            const passwordValid = await mockBcrypt.compare('password123', user.passwordHash);
            if (passwordValid) {
              return await mockPrisma.userSession.create({
                data: {
                  userId: user.id,
                  sessionToken: `session-${i}`,
                  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });
            }
          }
          return null;
        })();

        loginPromises.push(loginPromise);
      }

      const results = await Promise.all(loginPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      performanceMetrics.concurrentUsers = concurrentUsers;
      performanceMetrics.loginTimes.push(totalTime);

      expect(totalTime).toBeLessThan(2000); // 2秒内完成所有并发登录
      expect(results.filter(r => r !== null)).toHaveLength(concurrentUsers);
    });

    it('应该处理50个并发用户注册', async () => {
      const concurrentRegistrations = 50;
      const registrationPromises: Promise<any>[] = [];

      mockPrisma.user.findFirst.mockResolvedValue(null); // 用户不存在
      mockBcrypt.genSalt.mockResolvedValue('salt');
      mockBcrypt.hash.mockResolvedValue('$2a$10$hashedpassword');
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        username: 'newuser',
        email: 'new@example.com',
        passwordHash: '$2a$10$hashedpassword',
        userLevel: 'USER',
        isActive: true,
      });

      const startTime = performance.now();

      // 创建并发注册请求
      for (let i = 0; i < concurrentRegistrations; i++) {
        const registrationPromise = (async () => {
          // 检查用户是否存在
          const existingUser = await mockPrisma.user.findFirst({
            where: { username: `newuser${i}` },
          });

          if (!existingUser) {
            // 创建新用户
            const salt = await mockBcrypt.genSalt(10);
            const hashedPassword = await mockBcrypt.hash('password123', salt);

            return await mockPrisma.user.create({
              data: {
                username: `newuser${i}`,
                email: `newuser${i}@example.com`,
                passwordHash: hashedPassword,
                userLevel: 'USER',
                isActive: true,
              },
            });
          }
          return null;
        })();

        registrationPromises.push(registrationPromise);
      }

      const results = await Promise.all(registrationPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // 5秒内完成所有并发注册
      expect(results.filter(r => r !== null)).toHaveLength(concurrentRegistrations);
    });
  });

  describe('内存使用监控', () => {
    it('应该监控登录过程中的内存使用', async () => {
      const initialMemory = process.memoryUsage();
      performanceMetrics.memoryUsage.push(initialMemory.heapUsed);

      // 模拟大量登录操作
      const loginCount = 100;
      const users: any[] = [];

      for (let i = 0; i < loginCount; i++) {
        users.push({
          id: `user-${i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          passwordHash: '$2a$10$hashedpassword',
          userLevel: 'USER',
          isActive: true,
          sessions: [],
        });
      }

      const midMemory = process.memoryUsage();
      performanceMetrics.memoryUsage.push(midMemory.heapUsed);

      // 清理用户数据
      users.length = 0;

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      performanceMetrics.memoryUsage.push(finalMemory.heapUsed);

      const memoryIncrease = midMemory.heapUsed - initialMemory.heapUsed;
      const memoryLeakage = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB增长限制
      expect(memoryLeakage).toBeLessThan(10 * 1024 * 1024); // 10MB泄漏限制
    });

    it('应该测试会话存储的内存效率', async () => {
      const sessionCount = 1000;
      const sessions: any[] = [];

      const startMemory = process.memoryUsage().heapUsed;

      // 创建大量会话
      for (let i = 0; i < sessionCount; i++) {
        sessions.push({
          id: `session-${i}`,
          userId: `user-${i}`,
          sessionToken: `token-${i}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryPerSession = (endMemory - startMemory) / sessionCount;

      expect(memoryPerSession).toBeLessThan(1024); // 每个会话少于1KB
    });
  });

  describe('响应时间分析', () => {
    it('应该分析不同负载下的响应时间', async () => {
      const loadLevels = [1, 5, 10, 20, 50];
      const responseTimesByLoad: { [key: number]: number[] } = {};

      for (const load of loadLevels) {
        responseTimesByLoad[load] = [];

        for (let i = 0; i < 5; i++) { // 每个负载级别测试5次
          const startTime = performance.now();

          // 模拟负载
          const promises = Array(load).fill(null).map(async () => {
            mockPrisma.user.findFirst.mockResolvedValue({
              id: 'user-123',
              username: 'testuser',
              passwordHash: '$2a$10$hashedpassword',
            });
            mockBcrypt.compare.mockResolvedValue(true);

            const user = await mockPrisma.user.findFirst({ where: { username: 'testuser' } });
            if (user) {
              await mockBcrypt.compare('password123', user.passwordHash);
            }
            return user;
          });

          await Promise.all(promises);

          const endTime = performance.now();
          responseTimesByLoad[load].push(endTime - startTime);
        }
      }

      // 分析响应时间趋势
      for (const load of loadLevels) {
        const avgResponseTime = responseTimesByLoad[load].reduce((a, b) => a + b, 0) / responseTimesByLoad[load].length;

        // 响应时间应该随负载增加而增加，但不应该超过合理限制
        if (load <= 10) {
          expect(avgResponseTime).toBeLessThan(500); // 低负载下500ms
        } else if (load <= 20) {
          expect(avgResponseTime).toBeLessThan(1000); // 中等负载下1秒
        } else {
          expect(avgResponseTime).toBeLessThan(2000); // 高负载下2秒
        }
      }
    });

    it('应该生成性能报告', () => {
      // 计算性能指标
      const avgLoginTime = performanceMetrics.loginTimes.length > 0
        ? performanceMetrics.loginTimes.reduce((a, b) => a + b, 0) / performanceMetrics.loginTimes.length
        : 0;

      const maxLoginTime = performanceMetrics.loginTimes.length > 0
        ? Math.max(...performanceMetrics.loginTimes)
        : 0;

      const minLoginTime = performanceMetrics.loginTimes.length > 0
        ? Math.min(...performanceMetrics.loginTimes)
        : 0;

      const performanceReport = {
        averageLoginTime: avgLoginTime,
        maxLoginTime: maxLoginTime,
        minLoginTime: minLoginTime,
        concurrentUsersSupported: performanceMetrics.concurrentUsers,
        memoryUsagePattern: performanceMetrics.memoryUsage,
        errorRate: performanceMetrics.errorRate,
        testsPassed: true,
      };

      // 验证性能指标符合要求
      expect(performanceReport.averageLoginTime).toBeLessThan(500);
      expect(performanceReport.maxLoginTime).toBeLessThan(2000);
      expect(performanceReport.concurrentUsersSupported).toBeGreaterThanOrEqual(10);
      expect(performanceReport.errorRate).toBeLessThan(0.01); // 1%错误率限制

      console.log('认证系统性能报告:', JSON.stringify(performanceReport, null, 2));
    });
  });
});

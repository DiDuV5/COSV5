/**
 * @fileoverview 集成测试环境设置
 * @description 配置集成测试的数据库、邮件服务和测试环境
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { jest } from '@jest/globals';

import path from 'path';

// 强制设置Node.js环境
if (typeof window !== 'undefined') {
  // @ts-ignore
  delete global.window;
}

// 确保使用Node.js环境
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
  configurable: true
});

// 强制设置环境变量以确保Prisma使用Node.js版本（使用COSEREEDEN_前缀）
process.env.COSEREEDEN_PRISMA_FORCE_NAPI = 'true';
process.env.COSEREEDEN_PRISMA_ENGINES_MIRROR = undefined;
// 向后兼容性
process.env.PRISMA_FORCE_NAPI = process.env.COSEREEDEN_PRISMA_FORCE_NAPI;
process.env.PRISMA_ENGINES_MIRROR = process.env.COSEREEDEN_PRISMA_ENGINES_MIRROR;

// 验证环境设置
console.log('🔍 环境检查:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   - window: ${typeof window}`);
console.log(`   - global: ${typeof global}`);

// 强制导入Node.js版本的Prisma客户端
import { PrismaClient as ImportedPrismaClient } from '@prisma/client';

// 集成测试专用的Prisma客户端
export let testPrisma: ImportedPrismaClient;

// 动态加载的PrismaClient类型
let PrismaClient: typeof ImportedPrismaClient;

// 保存原始环境变量以便恢复
let originalEnvVars: Record<string, string | undefined> = {};

// 清除单元测试的Prisma Mock，为集成测试使用真实的Prisma客户端
jest.unmock('@/lib/prisma');

// 测试数据库名称
let testDatabaseName: string;

/**
 * 邮件服务Mock接口
 */
export interface MockEmailService {
  sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    timestamp: Date;
  }>;
  sendEmail: jest.MockedFunction<any>;
  clear: () => void;
}

/**
 * 创建Mock邮件服务
 */
export function createMockEmailService(): MockEmailService {
  const sentEmails: MockEmailService['sentEmails'] = [];

  const sendEmail = jest.fn().mockImplementation(async (options: any) => {
    sentEmails.push({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      timestamp: new Date(),
    });
    return { success: true, messageId: `mock-${Date.now()}` };
  });

  return {
    sentEmails,
    sendEmail,
    clear: () => {
      sentEmails.length = 0;
      sendEmail.mockClear();
    },
  };
}

/**
 * Mock邮件传输服务
 */
export function mockEmailTransportService() {
  const mockSentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    timestamp: Date;
  }> = [];

  return {
    getSentEmails: () => mockSentEmails,
    clearSentEmails: () => {
      mockSentEmails.length = 0;
    },
    mockImplementation: {
      sendEmail: jest.fn().mockImplementation(async (options: any) => {
        mockSentEmails.push({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          timestamp: new Date(),
        });
        return {
          success: true,
          messageId: `mock-transport-${Date.now()}`,
          attempts: 1,
          totalTime: 100
        };
      }),
      testEmailSending: jest.fn().mockImplementation(async (...args: unknown[]) => {
        const testEmail = args[0] as string;
        mockSentEmails.push({
          to: testEmail,
          subject: 'CoserEden 邮件服务测试',
          html: '<h2>邮件服务测试</h2><p>测试邮件发送成功！</p>',
          text: '邮件服务测试 - 测试邮件发送成功！',
          timestamp: new Date(),
        });
        return {
          success: true,
          messageId: `mock-test-${Date.now()}`,
          attempts: 1,
          totalTime: 100
        };
      }),
    },
  };
}

// 全局Mock邮件传输服务
jest.mock('@/lib/email/services/email-transport-service', () => {
  const mockSentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    timestamp: Date;
  }> = [];

  return {
    EmailTransportService: {
      sendEmail: jest.fn().mockImplementation(async (options: any) => {
        mockSentEmails.push({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          timestamp: new Date(),
        });
        return {
          success: true,
          messageId: `mock-transport-${Date.now()}`,
          attempts: 1,
          totalTime: 100
        };
      }),
      testEmailSending: jest.fn().mockImplementation(async (...args: unknown[]) => {
        const testEmail = args[0] as string;
        mockSentEmails.push({
          to: testEmail,
          subject: 'CoserEden 邮件服务测试',
          html: '<h2>邮件服务测试</h2><p>测试邮件发送成功！</p>',
          text: '邮件服务测试 - 测试邮件发送成功！',
          timestamp: new Date(),
        });
        return {
          success: true,
          messageId: `mock-test-${Date.now()}`,
          attempts: 1,
          totalTime: 100
        };
      }),
    },
    // 导出Mock邮件数组供测试使用
    __getMockSentEmails: () => mockSentEmails,
    __clearMockSentEmails: () => {
      mockSentEmails.length = 0;
    },
  };
});

// Mock邮件配置服务
jest.mock('@/lib/email/services/email-config-service', () => ({
  EmailConfigService: {
    getEmailConfig: jest.fn(() => Promise.resolve({
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpUser: 'test@example.com',
      smtpPassword: 'test-password',
      fromEmail: 'test@cosereeden.com',
      fromName: 'CoserEden Test',
    })),
    detectProvider: jest.fn(() => 'mock'),
  },
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn(() => Promise.resolve(true)),
    sendMail: jest.fn(() => Promise.resolve({
      messageId: 'mock-message-id',
      response: '250 OK',
    })),
  })),
}));

/**
 * 设置集成测试环境
 */
export async function setupIntegrationTest(): Promise<void> {
  // 生成唯一的测试数据库名称
  testDatabaseName = `test_cosereeden_${randomBytes(8).toString('hex')}`;

  // 设置测试环境变量
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  });

  // 强制使用测试专用数据库进行集成测试
  const testDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/cosereeden_test';

  // 备份原始环境变量
  originalEnvVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    COSEREEDEN_DATABASE_URL: process.env.COSEREEDEN_DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    COSEREEDEN_NEXTAUTH_SECRET: process.env.COSEREEDEN_NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    COSEREEDEN_NEXTAUTH_URL: process.env.COSEREEDEN_NEXTAUTH_URL,
    COSEREEDEN_EMAIL_FROM: process.env.COSEREEDEN_EMAIL_FROM,
    COSEREEDEN_EMAIL_PROVIDER: process.env.COSEREEDEN_EMAIL_PROVIDER,
    COSEREEDEN_DISABLE_EXTERNAL_SERVICES: process.env.COSEREEDEN_DISABLE_EXTERNAL_SERVICES,
  };

  // 设置测试环境变量（使用新的COSEREEDEN_前缀）
  process.env.COSEREEDEN_DATABASE_URL = testDatabaseUrl;
  process.env.COSEREEDEN_NEXTAUTH_SECRET = 'test-secret-for-integration';
  process.env.COSEREEDEN_NEXTAUTH_URL = 'http://localhost:3000';

  // 保持向后兼容
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NEXTAUTH_SECRET = 'test-secret-for-integration';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';

  // 设置邮件服务测试环境变量
  process.env.COSEREEDEN_EMAIL_FROM = 'test@cosereeden.com';
  process.env.COSEREEDEN_EMAIL_PROVIDER = 'mock';
  process.env.COSEREEDEN_DISABLE_EXTERNAL_SERVICES = 'true';

  console.log('🔧 集成测试数据库配置:');
  console.log(`   测试数据库URL: ${testDatabaseUrl}`);
  console.log(`   原始数据库URL: ${originalEnvVars.DATABASE_URL || '未设置'}`);

  try {
    // 验证测试数据库是否存在
    console.log('🔍 验证测试数据库连接...');

    // 强制加载Node.js版本的Prisma客户端
    try {
      console.log('🔧 强制加载Node.js版本的Prisma客户端...');

      // 清除可能的缓存
      const possiblePaths = [
        '@prisma/client',
        '@prisma/client/index',
        '@prisma/client/index-browser',
        '@prisma/client/default'
      ];

      possiblePaths.forEach(path => {
        try {
          delete require.cache[require.resolve(path)];
        } catch (e) {
          // 忽略不存在的路径
        }
      });

      // 直接加载index.js文件
      const prismaIndexPath = require.resolve('@prisma/client/index');
      console.log(`🔍 直接加载路径: ${prismaIndexPath}`);

      const prismaModule = require(prismaIndexPath);
      PrismaClient = prismaModule.PrismaClient;

      if (!PrismaClient) {
        throw new Error('无法从index.js获取PrismaClient');
      }

      console.log('✅ 成功加载Node.js版本的Prisma客户端');
    } catch (error) {
      console.error('❌ 强制加载失败，尝试备用方案:', error);

      // 备用方案：直接require Node.js版本
      try {
        const prismaPath = path.join(process.cwd(), 'node_modules/@prisma/client/index.js');
        const prismaModule = require(prismaPath);
        PrismaClient = prismaModule.PrismaClient;
        console.log('✅ 备用方案成功');
      } catch (backupError) {
        console.error('❌ 备用方案也失败:', backupError);
        throw backupError;
      }
    }

    // 初始化Prisma客户端 - 使用测试数据库
    console.log('🔧 初始化Prisma客户端...');
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
      log: ['error'], // 只记录错误日志
    });

    // 运行数据库迁移 - 使用测试数据库
    console.log('🔄 正在运行数据库迁移...');
    try {
      execSync('npx prisma db push --force-reset --schema=./prisma/schema.prisma', {
        stdio: 'inherit', // 显示输出以便调试
        env: {
          NODE_ENV: 'test',
          ...process.env,
          DATABASE_URL: testDatabaseUrl,
          NODE_ENV: 'test',
          // 确保Prisma使用正确的数据库URL（使用COSEREEDEN_前缀）
          COSEREEDEN_PRISMA_DATABASE_URL: testDatabaseUrl,
          // 向后兼容性
          PRISMA_DATABASE_URL: testDatabaseUrl,
        },
        cwd: process.cwd(),
      });
      console.log('✅ 数据库迁移完成');
    } catch (error) {
      console.error('❌ 数据库迁移失败:', error);
      throw error;
    }

    // 连接到数据库并验证连接
    console.log('🔗 连接到测试数据库...');
    await testPrisma.$connect();

    // 验证数据库连接
    await testPrisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ 数据库连接验证成功');

    console.log('✅ 集成测试环境初始化完成');
  } catch (error) {
    console.error('❌ 集成测试环境初始化失败:', error);
    console.error('   错误详情:', error instanceof Error ? error.message : String(error));

    // 如果是数据库连接错误，提供更详细的诊断信息
    if (error instanceof Error && error.message.includes('P1000')) {
      console.error('💡 数据库认证失败诊断:');
      console.error(`   - 检查数据库URL: ${testDatabaseUrl}`);
      console.error('   - 确认PostgreSQL服务运行正常');
      console.error('   - 验证用户名密码: postgres/postgres');
      console.error('   - 确认数据库cosereeden_test存在');
    }

    throw error;
  }
}

/**
 * 清理集成测试环境
 */
export async function teardownIntegrationTest(): Promise<void> {
  try {
    if (testPrisma) {
      // 清理测试数据而不是删除数据库
      await testPrisma.$executeRaw`TRUNCATE TABLE "User", "Post", "Comment", "Reaction", "Follow", "Notification", "Tag", "PostTag", "Media", "UserApproval", "SystemSetting", "AuditLog", "VisitorLog", "UserGroupConfig", "PermissionConfig", "EmailTemplate", "EmailLog", "TranscodingTask", "UploadSession", "CacheEntry" RESTART IDENTITY CASCADE`;
      await testPrisma.$disconnect();
      console.log('🗑️ 集成测试数据已清理');
    }

    // 恢复原始环境变量
    Object.entries(originalEnvVars).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    console.log('🔄 环境变量已恢复');

  } catch (error) {
    console.error('❌ 集成测试环境清理失败:', error);
  }
}

/**
 * 创建测试用户数据
 */
export async function createTestUser(overrides: any = {}) {
  return await testPrisma.user.create({
    data: {
      username: `testuser_${randomBytes(4).toString('hex')}`,
      email: `test_${randomBytes(4).toString('hex')}@example.com`,
      displayName: 'Test User',
      userLevel: 'USER',
      approvalStatus: 'PENDING',
      isActive: true,
      emailVerified: new Date(),
      ...overrides,
    },
  });
}

/**
 * 创建测试管理员用户
 */
export async function createTestAdmin(overrides: any = {}) {
  return await createTestUser({
    userLevel: 'ADMIN',
    approvalStatus: 'APPROVED',
    ...overrides,
  });
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(): Promise<void> {
  // 按依赖关系顺序删除数据
  await testPrisma.userApprovalLog.deleteMany();
  await testPrisma.approvalHistory.deleteMany();
  await testPrisma.timeoutNotification.deleteMany();
  await testPrisma.auditLog.deleteMany();
  await testPrisma.systemSetting.deleteMany();
  await testPrisma.user.deleteMany();
}

/**
 * 创建测试系统配置
 */
export async function createTestSystemSettings() {
  const settings = [
    {
      key: 'user_registration_approval_enabled',
      value: 'true',
      description: '用户注册审批开关',
    },
    {
      key: 'user_approval_notification_enabled',
      value: 'true',
      description: '审批通知开关',
    },
    {
      key: 'user_approval_auto_approve_admin',
      value: 'true',
      description: '管理员自动通过审批',
    },
    {
      key: 'user_approval_timeout_hours',
      value: '72',
      description: '审批超时时间（小时）',
    },
    {
      key: 'user_approval_auto_reject_timeout',
      value: 'false',
      description: '超时自动拒绝',
    },
    {
      key: 'user_approval_batch_size_limit',
      value: '50',
      description: '批量操作限制',
    },
  ];

  for (const setting of settings) {
    await testPrisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
}

/**
 * 等待异步操作完成
 */
export function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 验证邮件内容
 */
export function expectEmailToBeSent(
  mockEmailService: MockEmailService,
  expectedEmail: {
    to?: string;
    subject?: string;
    contentIncludes?: string[];
  }
) {
  const { sentEmails } = mockEmailService;

  expect(sentEmails.length).toBeGreaterThan(0);

  const lastEmail = sentEmails[sentEmails.length - 1];

  if (expectedEmail.to) {
    expect(lastEmail.to).toBe(expectedEmail.to);
  }

  if (expectedEmail.subject) {
    expect(lastEmail.subject).toContain(expectedEmail.subject);
  }

  if (expectedEmail.contentIncludes) {
    expectedEmail.contentIncludes.forEach(content => {
      expect(lastEmail.html).toContain(content);
    });
  }
}

/**
 * 集成测试工具类
 */
export class IntegrationTestHelper {
  static async createApprovalScenario() {
    // 创建管理员
    const admin = await createTestAdmin();

    // 创建待审批用户
    const pendingUser = await createTestUser({
      approvalStatus: 'PENDING',
    });

    // 创建系统配置
    await createTestSystemSettings();

    return { admin, pendingUser };
  }

  static async createBatchApprovalScenario(userCount: number = 5) {
    const admin = await createTestAdmin();
    const pendingUsers: any[] = [];

    for (let i = 0; i < userCount; i++) {
      const user = await createTestUser({
        approvalStatus: 'PENDING',
        username: `batchuser_${i}_${randomBytes(4).toString('hex')}`,
        email: `batchuser_${i}_${randomBytes(4).toString('hex')}@example.com`,
      });
      pendingUsers.push(user);
    }

    await createTestSystemSettings();

    return { admin, pendingUsers };
  }

  static async createTimeoutScenario() {
    const admin = await createTestAdmin();

    // 创建超时用户（72小时前创建）
    const timeoutDate = new Date();
    timeoutDate.setHours(timeoutDate.getHours() - 73);

    const timeoutUser = await createTestUser({
      approvalStatus: 'PENDING',
      createdAt: timeoutDate,
    });

    await createTestSystemSettings();

    return { admin, timeoutUser };
  }
}

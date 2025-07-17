/**
 * @fileoverview 用户注册邮箱释放机制测试
 * @description 测试邮件发送失败时的邮箱释放和重新注册功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

// @ts-nocheck - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { processUserRegistration, resendVerificationEmail } from '../user-registration';
import { EmailCleanupService } from '@/lib/cleanup/email-cleanup-service';

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  userCansAccount: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

// Mock 邮件发送服务
jest.mock('@/lib/email/services/email-verification-service', () => ({
  EmailVerificationService: {
    sendVerificationEmail: jest.fn(),
  },
}));

// Mock 系统设置
jest.mock('@/lib/settings/system-settings', () => ({
  isEmailVerificationEnabled: jest.fn().mockResolvedValue(true),
}));

describe('用户注册邮箱释放机制测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('邮件发送失败时的邮箱释放', () => {
    it('应该在邮件发送失败时将用户状态设置为FAILED', async () => {
      // 模拟事务
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.$transaction = mockTransaction;

      // 模拟用户不存在
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);

      // 模拟用户创建成功
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER',
        isVerified: false,
        canPublish: false,
        approvalStatus: 'APPROVED',
        createdAt: new Date(),
      };
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.userCansAccount.create = jest.fn().mockResolvedValue({});

      // 模拟邮件发送失败
      const { EmailVerificationService } = await import('@/lib/email/services/email-verification-service');
      EmailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({
        success: false,
        error: { type: 'SMTP_AUTH_FAILED' },
        userMessage: '邮件发送失败',
        shouldRetry: false,
        attempts: 1,
      });

      // 模拟用户状态更新
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser);

      const result = await processUserRegistration(mockPrisma, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.canRetryRegistration).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('您可以稍后重新使用此邮箱注册');

      // 验证用户状态被更新为FAILED
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          registrationStatus: 'FAILED',
          emailSendAttempts: 1,
          lastEmailSentAt: expect.any(Date),
        },
      });
    });

    it('应该在重新注册时清理之前的失败记录', async () => {
      // 模拟事务
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.$transaction = mockTransaction;

      // 模拟存在失败的注册记录
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.user.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

      // 模拟用户创建成功
      const mockUser = {
        id: 'user-456',
        username: 'testuser2',
        email: 'test@example.com',
        displayName: 'Test User 2',
        userLevel: 'USER',
        isVerified: false,
        canPublish: false,
        approvalStatus: 'APPROVED',
        createdAt: new Date(),
      };
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.userCansAccount.create = jest.fn().mockResolvedValue({});

      // 模拟邮件发送成功
      const { EmailVerificationService } = await import('@/lib/email/services/email-verification-service');
      EmailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({
        success: true,
        userMessage: '验证邮件已发送',
        attempts: 1,
      });

      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser);

      await processUserRegistration(mockPrisma, {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User 2',
      });

      // 验证清理了之前的失败记录
      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          registrationStatus: {
            in: ['PENDING_EMAIL', 'FAILED'],
          },
        },
      });
    });
  });

  describe('重新发送验证邮件功能', () => {
    it('应该允许为失败的注册重新发送验证邮件', async () => {
      // 模拟找到失败的用户记录
      const mockUser = {
        id: 'user-789',
        username: 'testuser3',
        email: 'test3@example.com',
        registrationStatus: 'FAILED',
        emailSendAttempts: 1,
        lastEmailSentAt: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前
      };
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      // 模拟邮件发送成功
      const { EmailVerificationService } = await import('@/lib/email/services/email-verification-service');
      EmailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({
        success: true,
        userMessage: '验证邮件已发送',
        attempts: 1,
      });

      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser);

      const result = await resendVerificationEmail(mockPrisma, 'test3@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('验证邮件已重新发送');

      // 验证用户状态被更新为COMPLETED
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-789' },
        data: {
          registrationStatus: 'COMPLETED',
          emailSendAttempts: 2,
          lastEmailSentAt: expect.any(Date),
        },
      });
    });

    it('应该限制重新发送的频率', async () => {
      // 模拟最近刚发送过邮件的用户
      const mockUser = {
        id: 'user-101',
        username: 'testuser4',
        email: 'test4@example.com',
        registrationStatus: 'FAILED',
        emailSendAttempts: 1,
        lastEmailSentAt: new Date(Date.now() - 2 * 60 * 1000), // 2分钟前
      };
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      await expect(
        resendVerificationEmail(mockPrisma, 'test4@example.com')
      ).rejects.toThrow('请等待');
    });

    it('应该限制重新发送的次数', async () => {
      // 模拟发送次数已达上限的用户
      const mockUser = {
        id: 'user-102',
        username: 'testuser5',
        email: 'test5@example.com',
        registrationStatus: 'FAILED',
        emailSendAttempts: 5,
        lastEmailSentAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      await expect(
        resendVerificationEmail(mockPrisma, 'test5@example.com')
      ).rejects.toThrow('发送次数已达上限');
    });
  });

  describe('邮箱清理服务', () => {
    it('应该清理过期的失败注册记录', async () => {
      const cleanupService = new EmailCleanupService(mockPrisma);

      // 模拟找到过期的失败记录
      mockPrisma.user.findMany = jest.fn()
        .mockResolvedValueOnce([
          { id: 'user-1', email: 'test1@example.com', username: 'user1', createdAt: new Date() },
          { id: 'user-2', email: 'test2@example.com', username: 'user2', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { id: 'user-3', email: 'test3@example.com', username: 'user3', createdAt: new Date() },
        ]);

      mockPrisma.user.deleteMany = jest.fn()
        .mockResolvedValueOnce({ count: 2 })
        .mockResolvedValueOnce({ count: 1 });

      const result = await cleanupService.performCleanup();

      expect(result.success).toBe(true);
      expect(result.details.totalDeleted).toBe(3);
      expect(result.details.failedRegistrationsDeleted).toBe(2);
      expect(result.details.unverifiedUsersDeleted).toBe(1);
    });

    it('应该检查邮箱是否可以重新注册', async () => {
      const cleanupService = new EmailCleanupService(mockPrisma);

      // 测试邮箱不存在的情况
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);
      let result = await cleanupService.canEmailReregister('new@example.com');
      expect(result.canReregister).toBe(true);

      // 测试邮箱已完成注册的情况
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue({
        id: 'user-1',
        registrationStatus: 'COMPLETED',
        isVerified: true,
        createdAt: new Date(),
        emailSendAttempts: 0,
      });
      result = await cleanupService.canEmailReregister('completed@example.com');
      expect(result.canReregister).toBe(false);
      expect(result.reason).toContain('已完成注册');

      // 测试邮箱有失败记录的情况
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue({
        id: 'user-2',
        registrationStatus: 'FAILED',
        isVerified: false,
        createdAt: new Date(),
        emailSendAttempts: 2,
      });
      result = await cleanupService.canEmailReregister('failed@example.com');
      expect(result.canReregister).toBe(true);
      expect(result.reason).toContain('未完成的注册记录');
    });

    it('应该手动清理指定邮箱的记录', async () => {
      const cleanupService = new EmailCleanupService(mockPrisma);

      mockPrisma.user.deleteMany = jest.fn().mockResolvedValue({ count: 2 });

      const result = await cleanupService.cleanupEmailRecords('cleanup@example.com');

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.message).toContain('成功清理邮箱');

      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          email: 'cleanup@example.com',
          registrationStatus: {
            in: ['PENDING_EMAIL', 'FAILED'],
          },
          isVerified: false,
        },
      });
    });
  });

  describe('邮箱唯一性约束', () => {
    it('应该允许同一邮箱在清理失败记录后重新注册', async () => {
      const email = 'reuse@example.com';

      // 模拟事务
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.$transaction = mockTransaction;

      // 第一次注册 - 邮件发送失败
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.user.deleteMany = jest.fn().mockResolvedValue({ count: 0 });

      const mockUser1 = {
        id: 'user-first',
        username: 'firstuser',
        email,
        displayName: 'First User',
        userLevel: 'USER',
        isVerified: false,
        canPublish: false,
        approvalStatus: 'APPROVED',
        createdAt: new Date(),
      };
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser1);
      mockPrisma.userCansAccount.create = jest.fn().mockResolvedValue({});

      // 模拟邮件发送失败
      const { EmailVerificationService } = await import('@/lib/email/services/email-verification-service');
      EmailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({
        success: false,
        error: { type: 'SMTP_AUTH_FAILED' },
        userMessage: '邮件发送失败',
        shouldRetry: false,
        attempts: 1,
      });

      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser1);

      const result1 = await processUserRegistration(mockPrisma, {
        username: 'firstuser',
        email,
        password: 'password123',
        displayName: 'First User',
      });

      expect(result1.canRetryRegistration).toBe(true);

      // 第二次注册 - 应该成功清理并重新注册
      jest.clearAllMocks();

      mockPrisma.$transaction = mockTransaction;
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.user.deleteMany = jest.fn().mockResolvedValue({ count: 1 }); // 清理了1条失败记录

      const mockUser2 = {
        id: 'user-second',
        username: 'seconduser',
        email,
        displayName: 'Second User',
        userLevel: 'USER',
        isVerified: false,
        canPublish: false,
        approvalStatus: 'APPROVED',
        createdAt: new Date(),
      };
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser2);
      mockPrisma.userCansAccount.create = jest.fn().mockResolvedValue({});

      // 模拟邮件发送成功
      EmailVerificationService.sendVerificationEmail = jest.fn().mockResolvedValue({
        success: true,
        userMessage: '验证邮件已发送',
        attempts: 1,
      });

      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser2);

      const result2 = await processUserRegistration(mockPrisma, {
        username: 'seconduser',
        email,
        password: 'password456',
        displayName: 'Second User',
      });

      expect(result2.success).toBe(true);
      expect(result2.emailSent).toBe(true);

      // 验证清理了之前的失败记录
      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          email,
          registrationStatus: {
            in: ['PENDING_EMAIL', 'FAILED'],
          },
        },
      });
    });
  });
});

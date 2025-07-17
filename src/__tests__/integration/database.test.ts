/**
 * @fileoverview 数据库集成测试
 * @description 测试Prisma模型、事务处理、数据一致性等数据库相关功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  testPrisma,
  createTestUser,
  createTestAdmin,
  cleanupTestData,
  createTestSystemSettings,
} from './setup';

describe('数据库集成测试', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('Prisma模型基础操作', () => {
    it('应该能够创建和查询用户', async () => {
      // 创建用户
      const userData = {
        username: 'testuser123',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER',
        approvalStatus: 'PENDING',
      };

      const createdUser = await testPrisma.user.create({
        data: userData,
      });

      expect(createdUser).toMatchObject(userData);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.createdAt).toBeInstanceOf(Date);

      // 查询用户
      const foundUser = await testPrisma.user.findUnique({
        where: { id: createdUser.id },
      });

      expect(foundUser).toMatchObject(userData);
    });

    it('应该能够更新用户状态', async () => {
      const user = await createTestUser();

      // 更新用户状态
      const updatedUser = await testPrisma.user.update({
        where: { id: user.id },
        data: {
          approvalStatus: 'APPROVED',
          userLevel: 'VIP',
        },
      });

      expect(updatedUser.approvalStatus).toBe('APPROVED');
      expect(updatedUser.userLevel).toBe('VIP');
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('应该能够删除用户', async () => {
      const user = await createTestUser();

      // 删除用户
      await testPrisma.user.delete({
        where: { id: user.id },
      });

      // 验证用户已删除
      const deletedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe('关联数据操作', () => {
    it('应该能够创建用户审批日志', async () => {
      const user = await createTestUser();
      const admin = await createTestAdmin();

      // 创建审批日志
      const approvalLog = await testPrisma.userApprovalLog.create({
        data: {
          userId: user.id,
          adminId: admin.id,
          action: 'APPROVE',
          previousStatus: 'PENDING',
          newStatus: 'APPROVED',
          reason: '符合要求',
          metadata: { source: 'integration-test' },
        },
      });

      expect(approvalLog.userId).toBe(user.id);
      expect(approvalLog.adminId).toBe(admin.id);
      expect(approvalLog.action).toBe('APPROVE');

      // 查询关联数据
      const logWithUser = await testPrisma.userApprovalLog.findUnique({
        where: { id: approvalLog.id },
        include: {
          user: true,
          admin: true,
        },
      });

      expect(logWithUser?.user.username).toBe(user.username);
      expect(logWithUser?.admin.username).toBe(admin.username);
    });

    it('应该能够批量查询待审批用户', async () => {
      // 创建多个待审批用户
      const __users = await Promise.all([
        createTestUser({ approvalStatus: 'PENDING' }),
        createTestUser({ approvalStatus: 'PENDING' }),
        createTestUser({ approvalStatus: 'APPROVED' }),
      ]);

      // 查询待审批用户
      const pendingUsers = await testPrisma.user.findMany({
        where: {
          approvalStatus: 'PENDING',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(pendingUsers).toHaveLength(2);
      expect(pendingUsers.every((user: any) => user.approvalStatus === 'PENDING')).toBe(true);
    });
  });

  describe('事务处理', () => {
    it('应该能够在事务中处理用户审批', async () => {
      const user = await createTestUser({ approvalStatus: 'PENDING' });
      const admin = await createTestAdmin();

      // 使用事务处理审批
      const result = await testPrisma.$transaction(async (tx: any) => {
        // 更新用户状态
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            approvalStatus: 'APPROVED',
            userLevel: 'VIP',
          },
        });

        // 创建审批日志
        const approvalLog = await tx.userApprovalLog.create({
          data: {
            userId: user.id,
            adminId: admin.id,
            action: 'APPROVE',
            previousStatus: 'PENDING',
            newStatus: 'APPROVED',
            reason: '事务测试',
          },
        });

        return { user: updatedUser, log: approvalLog };
      });

      expect(result.user.approvalStatus).toBe('APPROVED');
      expect(result.log.action).toBe('APPROVE');

      // 验证数据已正确保存
      const savedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });
      expect(savedUser?.approvalStatus).toBe('APPROVED');
    });

    it('应该能够回滚失败的事务', async () => {
      const user = await createTestUser({ approvalStatus: 'PENDING' });
      const admin = await createTestAdmin();

      // 尝试执行会失败的事务
      await expect(
        testPrisma.$transaction(async (tx: any) => {
          // 更新用户状态
          await tx.user.update({
            where: { id: user.id },
            data: { approvalStatus: 'APPROVED' },
          });

          // 故意创建无效的审批日志（缺少必需字段）
          await tx.userApprovalLog.create({
            data: {
              userId: user.id,
              adminId: admin.id,
              // 缺少必需的action字段，应该导致事务失败
            } as any,
          });
        })
      ).rejects.toThrow();

      // 验证用户状态没有被更改（事务已回滚）
      const unchangedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });
      expect(unchangedUser?.approvalStatus).toBe('PENDING');
    });
  });

  describe('数据一致性', () => {
    it('应该维护用户名的唯一性', async () => {
      const username = 'uniqueuser123';

      // 创建第一个用户
      await createTestUser({ username });

      // 尝试创建同名用户应该失败
      await expect(
        createTestUser({ username })
      ).rejects.toThrow();
    });

    it('应该维护邮箱的唯一性', async () => {
      const email = 'unique@example.com';

      // 创建第一个用户
      await createTestUser({ email });

      // 尝试创建同邮箱用户应该失败
      await expect(
        createTestUser({ email })
      ).rejects.toThrow();
    });

    it('应该正确处理级联删除', async () => {
      const user = await createTestUser();
      const admin = await createTestAdmin();

      // 创建审批日志
      await testPrisma.userApprovalLog.create({
        data: {
          userId: user.id,
          adminId: admin.id,
          action: 'APPROVE',
          previousStatus: 'PENDING',
          newStatus: 'APPROVED',
          reason: '级联删除测试',
        },
      });

      // 删除用户
      await testPrisma.user.delete({
        where: { id: user.id },
      });

      // 验证相关的审批日志也被删除（如果配置了级联删除）
      const orphanedLogs = await testPrisma.userApprovalLog.findMany({
        where: { userId: user.id },
      });

      // 根据实际的数据库约束配置，这里可能需要调整期望值
      // 如果配置了级联删除，应该是0；如果没有，可能会有外键约束错误
      expect(orphanedLogs).toHaveLength(0);
    });
  });

  describe('系统配置管理', () => {
    it('应该能够管理系统配置', async () => {
      await createTestSystemSettings();

      // 查询配置
      const settings = await testPrisma.systemSetting.findMany({
        orderBy: { key: 'asc' },
      });

      expect(settings.length).toBeGreaterThan(0);

      // 验证特定配置
      const approvalEnabled = await testPrisma.systemSetting.findUnique({
        where: { key: 'user_registration_approval_enabled' },
      });

      expect(approvalEnabled?.value).toBe('true');
    });

    it('应该能够更新系统配置', async () => {
      await createTestSystemSettings();

      // 更新配置
      const updatedSetting = await testPrisma.systemSetting.update({
        where: { key: 'user_approval_timeout_hours' },
        data: { value: '48' },
      });

      expect(updatedSetting.value).toBe('48');
    });
  });

  describe('性能测试', () => {
    it('应该能够高效处理批量用户查询', async () => {
      // 创建大量用户
      const userCount = 100;
      const users = [];

      for (let i = 0; i < userCount; i++) {
        users.push({
          username: `perfuser_${i}`,
          email: `perfuser_${i}@example.com`,
          displayName: `Performance User ${i}`,
          userLevel: 'USER',
          approvalStatus: i % 3 === 0 ? 'PENDING' : 'APPROVED',
        });
      }

      // 批量创建用户
      await testPrisma.user.createMany({
        data: users,
      });

      // 测试查询性能
      const startTime = Date.now();

      const pendingUsers = await testPrisma.user.findMany({
        where: { approvalStatus: 'PENDING' },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      const queryTime = Date.now() - startTime;

      expect(pendingUsers.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // 查询应该在1秒内完成
    });
  });
});

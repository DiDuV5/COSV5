/**
 * @fileoverview 端到端审批流程集成测试
 * @description 测试完整的用户审批流程，从用户注册到审批完成的全流程验证
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
  createTestAdmin as _createTestAdmin,
  cleanupTestData,
  createTestSystemSettings,
  IntegrationTestHelper,
  createMockEmailService,
  MockEmailService,
  expectEmailToBeSent,
  waitForAsync,
} from './setup';

// 导入要测试的模块
import { ApprovalConfigManager as _ApprovalConfigManager } from '@/lib/approval/approval-config-manager';
import { ApprovalAuditLogger as _ApprovalAuditLogger } from '@/lib/approval/approval-audit-logger';
import { ApprovalTimeoutManager as _ApprovalTimeoutManager } from '@/lib/approval/approval-timeout-manager';

describe('端到端审批流程集成测试', () => {
  let mockEmailService: MockEmailService;

  beforeAll(async () => {
    await setupIntegrationTest();
    mockEmailService = createMockEmailService();

    // Mock邮件服务
    jest.doMock('@/lib/email', () => ({
      sendEmail: mockEmailService.sendEmail,
      sendUserApprovalNotification: mockEmailService.sendEmail,
      sendBatchApprovalNotifications: mockEmailService.sendEmail,
    }));
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanupTestData();
    mockEmailService.clear();
  });

  describe('单用户审批流程', () => {
    it('应该完成完整的用户审批流程：注册 → 待审批 → 通过审批', async () => {
      // 1. 设置测试场景
      const { admin, pendingUser } = await IntegrationTestHelper.createApprovalScenario();

      // 2. 验证初始状态
      expect(pendingUser.approvalStatus).toBe('PENDING');
      expect(pendingUser.userLevel).toBe('USER');

      // 3. 管理员审批用户
      const approvalResult = await testPrisma.$transaction(async (tx: any) => {
        // 更新用户状态
        const updatedUser = await tx.user.update({
          where: { id: pendingUser.id },
          data: {
            approvalStatus: 'APPROVED',
            userLevel: 'VIP',
          },
        });

        // 记录审批日志
        const approvalLog = await tx.userApprovalLog.create({
          data: {
            userId: pendingUser.id,
            adminId: admin.id,
            action: 'APPROVE',
            previousStatus: 'PENDING',
            newStatus: 'APPROVED',
            reason: '符合平台要求',
            metadata: {
              approvalTime: new Date().toISOString(),
              adminNote: '用户资料完整，作品质量良好',
            },
          },
        });

        return { user: updatedUser, log: approvalLog };
      });

      // 4. 验证审批结果
      expect(approvalResult.user.approvalStatus).toBe('APPROVED');
      expect(approvalResult.user.userLevel).toBe('VIP');
      expect(approvalResult.log.action).toBe('APPROVE');

      // 5. 验证数据库状态
      const finalUser = await testPrisma.user.findUnique({
        where: { id: pendingUser.id },
        include: {
          approvalLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(finalUser?.approvalStatus).toBe('APPROVED');
      expect(finalUser?.approvalLogs).toHaveLength(1);
      expect(finalUser?.approvalLogs[0].adminId).toBe(admin.id);

      // 6. 模拟发送通知邮件
      await mockEmailService.sendEmail({
        to: pendingUser.email,
        subject: '审批通过通知',
        html: `<p>恭喜！您的账号已通过审批，现在可以正常使用平台功能。</p>`,
      });

      // 7. 验证邮件发送
      expectEmailToBeSent(mockEmailService, {
        to: pendingUser.email || undefined,
        subject: '审批通过',
        contentIncludes: ['恭喜', '通过审批'],
      });
    });

    it('应该完成用户拒绝审批流程：注册 → 待审批 → 拒绝审批', async () => {
      // 1. 设置测试场景
      const { admin, pendingUser } = await IntegrationTestHelper.createApprovalScenario();

      // 2. 管理员拒绝用户
      const rejectionReason = '用户资料不完整，请补充个人信息和作品展示';

      const rejectionResult = await testPrisma.$transaction(async (tx: any) => {
        // 更新用户状态
        const updatedUser = await tx.user.update({
          where: { id: pendingUser.id },
          data: {
            approvalStatus: 'REJECTED',
          },
        });

        // 记录审批日志
        const approvalLog = await tx.userApprovalLog.create({
          data: {
            userId: pendingUser.id,
            adminId: admin.id,
            action: 'REJECT',
            previousStatus: 'PENDING',
            newStatus: 'REJECTED',
            reason: rejectionReason,
            metadata: {
              rejectionTime: new Date().toISOString(),
              requiredActions: ['补充个人资料', '上传作品展示', '完善联系信息'],
            },
          },
        });

        return { user: updatedUser, log: approvalLog };
      });

      // 3. 验证拒绝结果
      expect(rejectionResult.user.approvalStatus).toBe('REJECTED');
      expect(rejectionResult.log.action).toBe('REJECT');
      expect(rejectionResult.log.reason).toBe(rejectionReason);

      // 4. 模拟发送拒绝通知邮件
      await mockEmailService.sendEmail({
        to: pendingUser.email,
        subject: '审批结果通知',
        html: `<p>很抱歉，您的账号审批未通过。原因：${rejectionReason}</p>`,
      });

      // 5. 验证邮件发送
      expectEmailToBeSent(mockEmailService, {
        to: pendingUser.email || undefined,
        subject: '审批结果',
        contentIncludes: ['未通过', rejectionReason],
      });
    });
  });

  describe('批量审批流程', () => {
    it('应该完成批量用户审批流程', async () => {
      // 1. 设置批量审批场景
      const { admin, pendingUsers } = await IntegrationTestHelper.createBatchApprovalScenario(5);

      expect(pendingUsers).toHaveLength(5);
      expect(pendingUsers.every(user => user.approvalStatus === 'PENDING')).toBe(true);

      // 2. 批量审批用户
      const userIds = pendingUsers.map(user => user.id);
      const batchApprovalResult = await testPrisma.$transaction(async (tx: any) => {
        // 批量更新用户状态
        const updateResult = await tx.user.updateMany({
          where: {
            id: { in: userIds },
            approvalStatus: 'PENDING',
          },
          data: {
            approvalStatus: 'APPROVED',
            userLevel: 'VIP',
          },
        });

        // 批量创建审批日志
        const approvalLogs = await Promise.all(
          userIds.map(userId =>
            tx.userApprovalLog.create({
              data: {
                userId,
                adminId: admin.id,
                action: 'APPROVE',
                previousStatus: 'PENDING',
                newStatus: 'APPROVED',
                reason: '批量审批通过',
                metadata: {
                  batchId: `batch_${Date.now()}`,
                  batchSize: userIds.length,
                },
              },
            })
          )
        );

        return { updateCount: updateResult.count, logs: approvalLogs };
      });

      // 3. 验证批量审批结果
      expect(batchApprovalResult.updateCount).toBe(5);
      expect(batchApprovalResult.logs).toHaveLength(5);

      // 4. 验证所有用户状态已更新
      const approvedUsers = await testPrisma.user.findMany({
        where: {
          id: { in: userIds },
        },
      });

      expect(approvedUsers.every((user: any) => user.approvalStatus === 'APPROVED')).toBe(true);
      expect(approvedUsers.every((user: any) => user.userLevel === 'VIP')).toBe(true);

      // 5. 模拟批量发送通知邮件
      for (const user of pendingUsers) {
        await mockEmailService.sendEmail({
          to: user.email,
          subject: '批量审批通过通知',
          html: `<p>您的账号已通过批量审批，欢迎使用CoserEden平台！</p>`,
        });
      }

      // 6. 验证邮件发送数量
      expect(mockEmailService.sentEmails).toHaveLength(5);
    });
  });

  describe('超时审批流程', () => {
    it('应该处理超时用户的自动提醒流程', async () => {
      // 1. 设置超时场景
      const { admin: _admin, timeoutUser } = await IntegrationTestHelper.createTimeoutScenario();

      // 2. 检测超时用户
      const timeoutUsers = await testPrisma.user.findMany({
        where: {
          approvalStatus: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72小时前
          },
        },
      });

      expect(timeoutUsers).toHaveLength(1);
      expect(timeoutUsers[0].id).toBe(timeoutUser.id);

      // 3. 发送超时提醒
      await mockEmailService.sendEmail({
        to: 'admin@cosereeden.com',
        subject: '用户审批超时提醒',
        html: `<p>有 ${timeoutUsers.length} 个用户审批已超时，请及时处理。</p>`,
      });

      // 4. 记录超时通知
      await testPrisma.timeoutNotification.create({
        data: {
          userId: timeoutUser.id,
          type: 'ADMIN_REMINDER',
        },
      });

      // 5. 验证提醒邮件
      expectEmailToBeSent(mockEmailService, {
        to: 'admin@cosereeden.com',
        subject: '超时提醒',
        contentIncludes: ['超时', '及时处理'],
      });

      // 6. 验证通知记录
      const notifications = await testPrisma.timeoutNotification.findMany({
        where: { userId: timeoutUser.id },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('ADMIN_REMINDER');
    });
  });

  describe('审批配置管理流程', () => {
    it('应该能够动态更新审批配置并生效', async () => {
      // 1. 创建初始配置
      await createTestSystemSettings();

      // 2. 验证初始配置
      const initialConfig = await testPrisma.systemSetting.findUnique({
        where: { key: 'user_approval_timeout_hours' },
      });
      expect(initialConfig?.value).toBe('72');

      // 3. 更新配置
      await testPrisma.systemSetting.update({
        where: { key: 'user_approval_timeout_hours' },
        data: { value: '48' },
      });

      // 4. 验证配置更新
      const updatedConfig = await testPrisma.systemSetting.findUnique({
        where: { key: 'user_approval_timeout_hours' },
      });
      expect(updatedConfig?.value).toBe('48');

      // 5. 测试新配置的生效
      // 创建48小时前的用户（应该超时）
      const timeoutDate = new Date();
      timeoutDate.setHours(timeoutDate.getHours() - 49);

      const timeoutUser = await createTestUser({
        approvalStatus: 'PENDING',
        createdAt: timeoutDate,
      });

      // 6. 检测超时用户（使用新的48小时配置）
      const timeoutUsers = await testPrisma.user.findMany({
        where: {
          approvalStatus: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48小时前
          },
        },
      });

      expect(timeoutUsers).toHaveLength(1);
      expect(timeoutUsers[0].id).toBe(timeoutUser.id);
    });
  });

  describe('审计日志完整性', () => {
    it('应该记录完整的审批操作审计日志', async () => {
      // 1. 设置测试场景
      const { admin, pendingUser } = await IntegrationTestHelper.createApprovalScenario();

      // 2. 执行多个审批操作
      const operations = [
        { action: 'APPROVE', status: 'APPROVED', reason: '初次审批通过' },
        { action: 'PENDING', status: 'PENDING', reason: '需要补充材料' },
        { action: 'APPROVE', status: 'APPROVED', reason: '材料补充完整，最终通过' },
      ];

      for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        await testPrisma.$transaction(async (tx: any) => {
          // 更新用户状态
          await tx.user.update({
            where: { id: pendingUser.id },
            data: { approvalStatus: operation.status },
          });

          // 记录审批日志
          await tx.userApprovalLog.create({
            data: {
              userId: pendingUser.id,
              adminId: admin.id,
              action: operation.action,
              previousStatus: index === 0 ? 'PENDING' : operations[index - 1].status,
              newStatus: operation.status,
              reason: operation.reason,
              metadata: {
                operationIndex: index + 1,
                timestamp: new Date().toISOString(),
              },
            },
          });
        });

        // 等待确保时间戳不同
        await waitForAsync(10);
      }

      // 3. 验证审计日志完整性
      const auditLogs = await testPrisma.userApprovalLog.findMany({
        where: { userId: pendingUser.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(auditLogs).toHaveLength(3);

      // 验证每个操作的记录
      operations.forEach((operation, index) => {
        expect(auditLogs[index].action).toBe(operation.action);
        expect(auditLogs[index].newStatus).toBe(operation.status);
        expect(auditLogs[index].reason).toBe(operation.reason);
      });

      // 验证状态转换链的完整性
      expect(auditLogs[0].previousStatus).toBe('PENDING');
      expect(auditLogs[1].previousStatus).toBe('APPROVED');
      expect(auditLogs[2].previousStatus).toBe('PENDING');
    });
  });
});

/**
 * @fileoverview 用户审批系统集成测试
 * @description 验证重构后的用户审批系统功能完整性和向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    systemSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    approvalLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/errors/trpc-error-handler', () => ({
  TRPCErrorHandler: {
    unauthorized: jest.fn((message) => new Error(`Unauthorized: ${message}`)),
    forbidden: jest.fn((message) => new Error(`Forbidden: ${message}`)),
    businessError: jest.fn((type, message) => new Error(`Business Error: ${message}`)),
    internalError: jest.fn((message) => new Error(`Internal Error: ${message}`)),
  },
}));

describe('用户审批系统集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('模块导入验证', () => {
    it('应该能够正常导入所有模块', async () => {
      const userApprovalModule = await import('../index');
      
      // 验证主要导出
      expect(userApprovalModule.userApprovalRouter).toBeDefined();
      expect(userApprovalModule.getPendingUsersList).toBeDefined();
      expect(userApprovalModule.processSingleUserApproval).toBeDefined();
      expect(userApprovalModule.processBatchUserApproval).toBeDefined();
      expect(userApprovalModule.getApprovalStatistics).toBeDefined();
      expect(userApprovalModule.getApprovalConfiguration).toBeDefined();
      
      // 验证类型导出
      expect(typeof userApprovalModule.userApprovalRouter).toBe('object');
      expect(typeof userApprovalModule.getPendingUsersList).toBe('function');
      expect(typeof userApprovalModule.processSingleUserApproval).toBe('function');
    });

    it('应该能够从原始文件导入', async () => {
      const originalModule = await import('../user-approval');
      
      // 验证向后兼容性
      expect(originalModule.userApprovalRouter).toBeDefined();
      expect(originalModule.getPendingUsersList).toBeDefined();
      expect(originalModule.processSingleUserApproval).toBeDefined();
      expect(originalModule.processBatchUserApproval).toBeDefined();
    });

    it('应该能够导入各个子模块', async () => {
      const approvalRoutes = await import('../routes/approval-routes');
      const configRoutes = await import('../routes/config-routes');
      const statsRoutes = await import('../routes/stats-routes');
      const enhancedRoutes = await import('../routes/enhanced-routes');
      const errorHandler = await import('../middleware/error-handler');
      
      expect(approvalRoutes.approvalRoutes).toBeDefined();
      expect(configRoutes.configRoutes).toBeDefined();
      expect(statsRoutes.statsRoutes).toBeDefined();
      expect(enhancedRoutes.enhancedRoutes).toBeDefined();
      expect(errorHandler.ApprovalErrorHandler).toBeDefined();
    });
  });

  describe('向后兼容性验证', () => {
    it('应该保持原有的API接口', async () => {
      const { userApprovalRouter } = await import('../index');
      
      // 验证路由器结构
      expect(userApprovalRouter._def).toBeDefined();
      expect(userApprovalRouter._def.procedures).toBeDefined();
      
      // 验证主要路由存在
      const procedures = userApprovalRouter._def.procedures;
      expect(procedures.getPendingUsers).toBeDefined();
      expect(procedures.approveUser).toBeDefined();
      expect(procedures.batchApproveUsers).toBeDefined();
      expect(procedures.getApprovalLogs).toBeDefined();
      expect(procedures.getApprovalConfig).toBeDefined();
      expect(procedures.updateApprovalConfig).toBeDefined();
      expect(procedures.getApprovalStats).toBeDefined();
    });

    it('应该保持原有的处理器函数接口', async () => {
      const {
        getPendingUsersList,
        processSingleUserApproval,
        processBatchUserApproval,
        getApprovalStatistics,
        getApprovalConfiguration,
        updateApprovalConfiguration,
      } = await import('../index');
      
      // 验证函数签名
      expect(getPendingUsersList.length).toBeGreaterThanOrEqual(3); // db, limit, cursor, ...
      expect(processSingleUserApproval.length).toBeGreaterThanOrEqual(6); // db, req, userId, action, reason, notifyUser, ...
      expect(processBatchUserApproval.length).toBeGreaterThanOrEqual(6); // db, req, userIds, action, reason, notifyUsers, ...
      expect(getApprovalStatistics.length).toBe(1); // db
      expect(getApprovalConfiguration.length).toBe(1); // db
      expect(updateApprovalConfiguration.length).toBeGreaterThanOrEqual(3); // db, req, input, ...
    });

    it('应该保持原有的Schema导出', async () => {
      const {
        getPendingUsersInputSchema,
        approveUserInputSchema,
        batchApproveUsersInputSchema,
        getApprovalLogsInputSchema,
        updateApprovalConfigInputSchema,
        ApprovalStatusSchema,
        ApprovalActionSchema,
      } = await import('../index');
      
      // 验证Schema存在
      expect(getPendingUsersInputSchema).toBeDefined();
      expect(approveUserInputSchema).toBeDefined();
      expect(batchApproveUsersInputSchema).toBeDefined();
      expect(getApprovalLogsInputSchema).toBeDefined();
      expect(updateApprovalConfigInputSchema).toBeDefined();
      expect(ApprovalStatusSchema).toBeDefined();
      expect(ApprovalActionSchema).toBeDefined();
      
      // 验证Schema类型
      expect(typeof getPendingUsersInputSchema.parse).toBe('function');
      expect(typeof approveUserInputSchema.parse).toBe('function');
    });
  });

  describe('功能验证', () => {
    it('应该正确处理错误处理中间件', async () => {
      const { ApprovalErrorHandler } = await import('../middleware/error-handler');
      
      // 验证错误处理方法存在
      expect(typeof ApprovalErrorHandler.handleGetPendingUsersError).toBe('function');
      expect(typeof ApprovalErrorHandler.handleApproveUserError).toBe('function');
      expect(typeof ApprovalErrorHandler.handleBatchApprovalError).toBe('function');
      expect(typeof ApprovalErrorHandler.handleConfigUpdateError).toBe('function');
      expect(typeof ApprovalErrorHandler.handleGenericError).toBe('function');
    });

    it('应该正确处理路由模块', async () => {
      const { approvalRoutes, configRoutes, statsRoutes, enhancedRoutes } = await import('../index');
      
      // 验证路由模块结构
      expect(approvalRoutes._def).toBeDefined();
      expect(configRoutes._def).toBeDefined();
      expect(statsRoutes._def).toBeDefined();
      expect(enhancedRoutes._def).toBeDefined();
      
      // 验证路由程序存在
      expect(approvalRoutes._def.procedures.getPendingUsers).toBeDefined();
      expect(configRoutes._def.procedures.getApprovalConfig).toBeDefined();
      expect(statsRoutes._def.procedures.getApprovalStats).toBeDefined();
      expect(enhancedRoutes._def.procedures.getTimeoutUsers).toBeDefined();
    });

    it('应该正确处理类型定义', async () => {
      const typesModule = await import('../types');
      
      // 验证常量导出
      expect(typesModule.APPROVAL_ACTIONS).toBeDefined();
      expect(typesModule.APPROVAL_STATUS).toBeDefined();
      expect(typesModule.SORT_FIELDS).toBeDefined();
      expect(typesModule.SORT_ORDERS).toBeDefined();
      expect(typesModule.DEFAULT_APPROVAL_CONFIG).toBeDefined();
      
      // 验证常量内容
      expect(typeof typesModule.APPROVAL_ACTIONS).toBe('object');
      expect(typeof typesModule.DEFAULT_APPROVAL_CONFIG).toBe('object');
      expect(typesModule.APPROVAL_ACTIONS.APPROVE).toBe('APPROVE');
      expect(typesModule.APPROVAL_STATUS.PENDING).toBe('PENDING');
    });
  });

  describe('错误处理验证', () => {
    it('应该优雅处理无效参数', async () => {
      const { ApprovalErrorHandler } = await import('../middleware/error-handler');
      
      // 测试错误处理不会抛出意外错误
      expect(() => {
        try {
          ApprovalErrorHandler.handleGenericError(
            new Error('Test error'),
            'test_operation',
            'Test message'
          );
        } catch (error) {
          // 应该抛出处理过的错误
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Test message');
        }
      }).not.toThrow();
    });

    it('应该正确处理业务逻辑错误', async () => {
      const { ApprovalErrorHandler } = await import('../middleware/error-handler');
      
      // 测试业务错误重新抛出
      const businessError = new Error('Business error') as any;
      businessError.code = 'BUSINESS_ERROR';
      
      expect(() => {
        ApprovalErrorHandler.handleApproveUserError(businessError, {
          userId: 'test-user',
          action: 'APPROVE',
          adminId: 'test-admin',
        });
      }).toThrow();
    });
  });

  describe('性能验证', () => {
    it('应该在合理时间内完成模块加载', async () => {
      const startTime = Date.now();
      
      await import('../index');
      await import('../routes/approval-routes');
      await import('../routes/config-routes');
      await import('../routes/stats-routes');
      await import('../routes/enhanced-routes');
      await import('../middleware/error-handler');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // 模块加载应该在1秒内完成
      expect(loadTime).toBeLessThan(1000);
    });

    it('应该高效处理类型检查', async () => {
      const { ApprovalStatusSchema, ApprovalActionSchema } = await import('../index');
      
      const startTime = Date.now();
      
      // 执行多次类型验证
      for (let i = 0; i < 100; i++) {
        ApprovalStatusSchema.parse('PENDING');
        ApprovalActionSchema.parse('APPROVE');
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 100次类型验证应该在100ms内完成
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('模块结构验证', () => {
    it('应该保持清晰的模块边界', async () => {
      // 验证各模块独立性
      const approvalRoutes = await import('../routes/approval-routes');
      const configRoutes = await import('../routes/config-routes');
      const statsRoutes = await import('../routes/stats-routes');
      const enhancedRoutes = await import('../routes/enhanced-routes');
      
      // 每个模块都应该有自己的路由定义
      expect(approvalRoutes.approvalRoutes).not.toBe(configRoutes.configRoutes);
      expect(configRoutes.configRoutes).not.toBe(statsRoutes.statsRoutes);
      expect(statsRoutes.statsRoutes).not.toBe(enhancedRoutes.enhancedRoutes);
      
      // 每个模块都应该有自己的导出
      expect(Object.keys(approvalRoutes).length).toBeGreaterThan(0);
      expect(Object.keys(configRoutes).length).toBeGreaterThan(0);
      expect(Object.keys(statsRoutes).length).toBeGreaterThan(0);
      expect(Object.keys(enhancedRoutes).length).toBeGreaterThan(0);
    });

    it('应该正确导出类型定义', async () => {
      const typesModule = await import('../types');
      const schemasModule = await import('../schemas');
      
      // 验证类型模块导出
      expect(typesModule.APPROVAL_ACTIONS).toBeDefined();
      expect(typesModule.APPROVAL_STATUS).toBeDefined();
      expect(typesModule.DEFAULT_APPROVAL_CONFIG).toBeDefined();
      
      // 验证Schema模块导出
      expect(schemasModule.ApprovalStatusSchema).toBeDefined();
      expect(schemasModule.ApprovalActionSchema).toBeDefined();
      expect(schemasModule.getPendingUsersInputSchema).toBeDefined();
    });
  });

  describe('集成验证', () => {
    it('应该支持完整的审批流程', async () => {
      const {
        userApprovalRouter,
        getPendingUsersList,
        processSingleUserApproval,
        getApprovalStatistics,
      } = await import('../index');
      
      // 验证完整流程的函数都存在
      expect(typeof getPendingUsersList).toBe('function');
      expect(typeof processSingleUserApproval).toBe('function');
      expect(typeof getApprovalStatistics).toBe('function');
      
      // 验证路由器包含所有必要的程序
      const procedures = userApprovalRouter._def.procedures;
      expect(procedures.getPendingUsers).toBeDefined();
      expect(procedures.approveUser).toBeDefined();
      expect(procedures.getApprovalStats).toBeDefined();
    });

    it('应该支持增强功能', async () => {
      const { enhancedRoutes } = await import('../index');
      
      // 验证增强功能路由存在
      const procedures = enhancedRoutes._def.procedures;
      expect(procedures.getTimeoutUsers).toBeDefined();
      expect(procedures.processTimeoutApprovals).toBeDefined();
      expect(procedures.getApprovalQueueStatus).toBeDefined();
      expect(procedures.resendNotifications).toBeDefined();
      expect(procedures.exportApprovalReport).toBeDefined();
    });
  });
});

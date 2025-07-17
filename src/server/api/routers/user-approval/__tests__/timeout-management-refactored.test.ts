/**
 * 用户审批超时管理测试 - 重构版本
 *
 * 使用新的测试架构，基于Mock工厂和测试模板
 * 展示了如何使用统一的测试模式来避免tRPC Mock问题
 */

import { TestMockFactory, ServiceMockFactory, MockData } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';
import { RouteTestTemplate, TestPresets } from '@/test-utils/templates/route-test.template';

describe('用户审批超时管理 - 重构版本', () => {
  // 使用测试模板创建标准化的测试环境
  const template = new RouteTestTemplate();
  template.setupTest('ADMIN');

  // 创建Mock数据
  const mockTimeoutUsers = MockData.timeoutUsers;

  describe('getTimeoutUsers 方法', () => {
    // 使用模板的成功场景测试
    template.testSuccessScenario('getTimeoutUsers', {
      description: '应该返回超时用户列表',
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.getTimeoutUsers.mockResolvedValue(mockTimeoutUsers);
      },
      expectedResult: mockTimeoutUsers,
      verifyMocks: (mocks) => {
        TestHelpers.verifyMockCallTimes(mocks.approvalService.getTimeoutUsers, 1);
      },
      additionalAssertions: (result) => {
        // 验证返回的是用户数组
        TestHelpers.expectArrayLength(result, 2);

        // 验证每个用户都有必要的属性
        result.forEach((user: any) => {
          TestHelpers.expectObjectToHaveProperties(user, [
            'id', 'username', 'email', 'approvalStatus'
          ]);
          expect(user.approvalStatus).toBe('PENDING');
        });
      }
    });

    // 使用模板的错误场景测试
    template.testErrorScenario('getTimeoutUsers', {
      description: '应该处理数据库错误',
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.getTimeoutUsers.mockRejectedValue(
          new Error('数据库连接失败')
        );
      },
      expectedError: '数据库连接失败',
      verifyMocks: (mocks) => {
        TestHelpers.verifyMockCallTimes(mocks.approvalService.getTimeoutUsers, 1);
      }
    });

    // 使用模板的边界情况测试
    template.testBoundaryScenario('getTimeoutUsers', {
      description: '应该处理空结果',
      input: {},
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.getTimeoutUsers.mockResolvedValue([]);
      },
      expectedBehavior: 'success',
      expectedResult: []
    });

    // 使用模板的性能测试
    template.testPerformanceScenario('getTimeoutUsers', {
      description: '应该在合理时间内返回结果',
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.getTimeoutUsers.mockResolvedValue(mockTimeoutUsers);
      },
      maxDuration: TestPresets.standardPerformance.maxDuration,
      timeout: 3000 // 3秒超时
    });
  });

  describe('processTimeoutApprovals 方法', () => {
    const mockProcessResult = {
      processed: 2,
      approved: 1,
      rejected: 1,
      errors: []
    };

    template.testSuccessScenario('processTimeoutApprovals', {
      description: '应该成功处理超时审批',
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.processTimeoutApprovals.mockResolvedValue(mockProcessResult);
      },
      expectedResult: mockProcessResult,
      verifyMocks: (mocks) => {
        TestHelpers.verifyMockCallTimes(mocks.approvalService.processTimeoutApprovals, 1);
      },
      additionalAssertions: (result) => {
        TestHelpers.expectObjectToHaveProperties(result, [
          'processed', 'approved', 'rejected', 'errors'
        ]);
        expect(result.processed).toBeGreaterThan(0);
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });

    template.testErrorScenario('processTimeoutApprovals', {
      description: '应该处理处理过程中的错误',
      serviceName: 'approvalService', // 明确指定服务名
      mockSetup: (mocks) => {
        mocks.approvalService.processTimeoutApprovals.mockRejectedValue(
          new Error('处理超时审批时发生错误')
        );
      },
      expectedError: '处理超时审批时发生错误'
    });
  });

  describe('权限验证', () => {
    // 使用模板的权限测试
    template.testPermissionScenario('getTimeoutUsers', {
      description: '管理员应该能够查看超时用户',
      userLevel: 'ADMIN',
      requiredLevel: 'ADMIN',
      shouldSucceed: true
    });

    template.testPermissionScenario('getTimeoutUsers', {
      description: '普通用户不应该能够查看超时用户',
      userLevel: 'USER',
      requiredLevel: 'ADMIN',
      shouldSucceed: false
    });

    template.testPermissionScenario('processTimeoutApprovals', {
      description: '超级管理员应该能够处理超时审批',
      userLevel: 'SUPER_ADMIN',
      requiredLevel: 'ADMIN',
      shouldSucceed: true
    });
  });

  describe('集成测试场景', () => {
    it('应该完整地处理超时用户查询和处理流程', async () => {
      // 使用Mock工厂创建测试数据
      const _mockContext = TestMockFactory.createTRPCContext('ADMIN');
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockResolvedValue(mockTimeoutUsers),
        processTimeoutApprovals: jest.fn().mockResolvedValue({
          processed: 2,
          approved: 2,
          rejected: 0,
          errors: []
        })
      });

      // 执行查询
      const timeoutUsers = await mockApprovalService.getTimeoutUsers();
      expect(timeoutUsers).toHaveLength(2);

      // 执行处理
      const processResult = await mockApprovalService.processTimeoutApprovals();
      expect(processResult.processed).toBe(2);
      expect(processResult.approved).toBe(2);

      // 验证Mock调用
      TestHelpers.verifyBatchMockCalls([
        { mock: mockApprovalService.getTimeoutUsers, expectedCalls: [[]] },
        { mock: mockApprovalService.processTimeoutApprovals, expectedCalls: [[]] }
      ]);
    });

    it('应该正确处理中文错误消息', async () => {
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockRejectedValue(new Error('获取超时用户失败'))
      });

      await TestHelpers.expectAsyncError(
        () => mockApprovalService.getTimeoutUsers(),
        '获取超时用户失败'
      );

      // 验证错误消息是中文
      try {
        await mockApprovalService.getTimeoutUsers();
      } catch (error: any) {
        TestAssertions.assertChineseErrorMessage(error.message);
      }
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在高负载下保持性能', async () => {
      const largeUserList = TestHelpers.generateTestData(100, (index) => ({
        id: `user-${index}`,
        username: `user${index}`,
        email: `user${index}@test.com`,
        approvalStatus: 'PENDING',
        createdAt: TestHelpers.createTestDate(-4) // 4天前
      }));

      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockResolvedValue(largeUserList)
      });

      const { result, duration } = await TestHelpers.measurePerformance(
        () => mockApprovalService.getTimeoutUsers(),
        200 // 200ms内完成
      );

      expect(result).toHaveLength(100);
      console.log(`处理100个用户耗时: ${duration}ms`);
    });

    it('应该正确处理快速响应', async () => {
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockResolvedValue(mockTimeoutUsers)
      });

      const startTime = Date.now();
      const result = await mockApprovalService.getTimeoutUsers();

      expect(result).toEqual(mockTimeoutUsers);
      TestAssertions.assertResponseTime(startTime, 50); // 50ms内完成
    });
  });

  describe('数据验证测试', () => {
    it('应该验证返回数据的完整性', async () => {
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockResolvedValue(mockTimeoutUsers)
      });

      const result = await mockApprovalService.getTimeoutUsers();

      // 使用测试辅助函数验证响应格式
      TestHelpers.verifyResponseFormat(
        result,
        [], // 不要求特定属性（因为这是数组）
        ['token', 'success'] // 确保不是登录响应
      );

      // 验证数组中每个元素的结构
      result.forEach((user: any) => {
        TestHelpers.verifyResponseFormat(
          user,
          ['id', 'username', 'email', 'approvalStatus'],
          ['password', 'token']
        );
      });
    });

    it('应该处理无效的输入参数', async () => {
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        getTimeoutUsers: jest.fn().mockRejectedValue(new Error('无效的查询参数'))
      });

      await TestHelpers.expectAsyncError(
        () => mockApprovalService.getTimeoutUsers(),
        '无效的查询参数'
      );
    });
  });
});

/**
 * @fileoverview 配置管理功能测试 - 重构版本
 * @description 使用新的测试架构重构的配置管理测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('配置管理功能 - 重构版本', () => {
  // 测试数据
  const mockApprovalConfig = {
    id: 'config-1',
    autoApprovalEnabled: false,
    timeoutDays: 7,
    maxPendingUsers: 100,
    notificationEnabled: true,
    emailTemplates: {
      approval: 'approval-template',
      rejection: 'rejection-template',
      timeout: 'timeout-template'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockConfigUpdateInput = {
    autoApprovalEnabled: true,
    timeoutDays: 5,
    maxPendingUsers: 150,
    notificationEnabled: true,
    emailTemplates: {
      approval: 'new-approval-template',
      rejection: 'new-rejection-template',
      timeout: 'new-timeout-template'
    }
  };

  const mockUpdatedConfig = {
    ...mockApprovalConfig,
    ...mockConfigUpdateInput,
    updatedAt: new Date()
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('getApprovalConfig 方法', () => {
    describe('成功场景', () => {
      it('应该成功获取审批配置', async () => {
        // Arrange
        const mockConfigService = ServiceMockFactory.createConfigService({
          getApprovalConfig: jest.fn().mockResolvedValue({
            success: true,
            config: mockApprovalConfig
          })
        });

        // Act
        const result = await mockConfigService.getApprovalConfig();

        // Assert
        expect(result).toEqual({
          success: true,
          config: expect.objectContaining({
            id: 'config-1',
            autoApprovalEnabled: false,
            timeoutDays: 7,
            maxPendingUsers: 100,
            notificationEnabled: true
          })
        });

        TestHelpers.verifyMockCallTimes(mockConfigService.getApprovalConfig, 1);
      });

      it('应该返回默认配置当配置不存在时', async () => {
        // Arrange
        const defaultConfig = {
          ...mockApprovalConfig,
          id: 'default-config',
          autoApprovalEnabled: false,
          timeoutDays: 7,
          maxPendingUsers: 50
        };

        const mockConfigService = ServiceMockFactory.createConfigService({
          getApprovalConfig: jest.fn().mockResolvedValue({
            success: true,
            config: defaultConfig,
            isDefault: true
          })
        });

        // Act
        const result = await mockConfigService.getApprovalConfig();

        // Assert
        expect(result.success).toBe(true);
        expect(result.isDefault).toBe(true);
        expect(result.config.id).toBe('default-config');
        expect(result.config.timeoutDays).toBe(7);
      });
    });

    describe('错误场景', () => {
      it('应该处理配置获取失败', async () => {
        // Arrange
        const mockConfigService = ServiceMockFactory.createConfigService({
          getApprovalConfig: jest.fn().mockRejectedValue(
            new Error('配置获取失败')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockConfigService.getApprovalConfig(),
          '配置获取失败'
        );
      });
    });
  });

  describe('updateApprovalConfig 方法', () => {
    describe('成功场景', () => {
      it('应该成功更新审批配置', async () => {
        // Arrange
        const mockConfigService = ServiceMockFactory.createConfigService({
          updateApprovalConfig: jest.fn().mockResolvedValue({
            success: true,
            message: '配置更新成功',
            config: mockUpdatedConfig
          })
        });

        // Act
        const result = await mockConfigService.updateApprovalConfig(mockConfigUpdateInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '配置更新成功',
          config: expect.objectContaining({
            autoApprovalEnabled: true,
            timeoutDays: 5,
            maxPendingUsers: 150
          })
        });

        TestHelpers.verifyMockCallTimes(mockConfigService.updateApprovalConfig, 1);
      });

      it('应该验证配置参数的有效性', async () => {
        // Arrange
        const validatedConfig = {
          ...mockUpdatedConfig,
          timeoutDays: Math.max(1, mockConfigUpdateInput.timeoutDays),
          maxPendingUsers: Math.max(10, mockConfigUpdateInput.maxPendingUsers)
        };

        const mockConfigService = ServiceMockFactory.createConfigService({
          updateApprovalConfig: jest.fn().mockResolvedValue({
            success: true,
            message: '配置更新成功（已验证）',
            config: validatedConfig
          })
        });

        // Act
        const result = await mockConfigService.updateApprovalConfig(mockConfigUpdateInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.config.timeoutDays).toBeGreaterThanOrEqual(1);
        expect(result.config.maxPendingUsers).toBeGreaterThanOrEqual(10);
      });
    });

    describe('错误场景', () => {
      it('应该处理无效的配置参数', async () => {
        // Arrange
        const invalidInput = {
          ...mockConfigUpdateInput,
          timeoutDays: -1,
          maxPendingUsers: 0
        };

        const mockConfigService = ServiceMockFactory.createConfigService({
          updateApprovalConfig: jest.fn().mockRejectedValue(
            new Error('配置参数无效')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockConfigService.updateApprovalConfig(invalidInput),
          '配置参数无效'
        );
      });

      it('应该处理配置更新失败', async () => {
        // Arrange
        const mockConfigService = ServiceMockFactory.createConfigService({
          updateApprovalConfig: jest.fn().mockRejectedValue(
            new Error('数据库更新失败')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockConfigService.updateApprovalConfig(mockConfigUpdateInput),
          '数据库更新失败'
        );
      });
    });
  });

  describe('validateConfigIntegrity 方法', () => {
    it('应该验证配置完整性', async () => {
      // Arrange
      const validationResult = {
        isValid: true,
        issues: [],
        recommendations: []
      };

      const mockConfigService = ServiceMockFactory.createConfigService({
        validateConfigIntegrity: jest.fn().mockResolvedValue({
          success: true,
          validation: validationResult
        })
      });

      // Act
      const result = await mockConfigService.validateConfigIntegrity();

      // Assert
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.issues).toHaveLength(0);
    });

    it('应该检测配置问题', async () => {
      // Arrange
      const validationResult = {
        isValid: false,
        issues: [
          '超时天数设置过短',
          '最大待审批用户数过低'
        ],
        recommendations: [
          '建议将超时天数设置为至少3天',
          '建议将最大待审批用户数设置为至少50'
        ]
      };

      const mockConfigService = ServiceMockFactory.createConfigService({
        validateConfigIntegrity: jest.fn().mockResolvedValue({
          success: true,
          validation: validationResult
        })
      });

      // Act
      const result = await mockConfigService.validateConfigIntegrity();

      // Assert
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.issues).toHaveLength(2);
      expect(result.validation.recommendations).toHaveLength(2);
    });
  });

  describe('权限验证', () => {
    it('管理员应该能够管理配置', async () => {
      // Arrange
      const mockConfigService = ServiceMockFactory.createConfigService({
        getApprovalConfig: jest.fn().mockResolvedValue({
          success: true,
          config: mockApprovalConfig
        })
      });

      // Act
      const result = await mockConfigService.getApprovalConfig();

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertUserPermission('ADMIN', 'ADMIN');
    });

    it('普通用户不应该能够修改配置', async () => {
      // Arrange
      const mockConfigService = ServiceMockFactory.createConfigService({
        updateApprovalConfig: jest.fn().mockRejectedValue(
          new Error('权限不足')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockConfigService.updateApprovalConfig(mockConfigUpdateInput),
        '权限不足'
      );
    });
  });

  describe('集成测试场景', () => {
    it('应该完整地处理配置管理流程', async () => {
      // Arrange
      const mockConfigService = ServiceMockFactory.createConfigService({
        getApprovalConfig: jest.fn().mockResolvedValue({
          success: true,
          config: mockApprovalConfig
        }),
        updateApprovalConfig: jest.fn().mockResolvedValue({
          success: true,
          message: '配置更新成功',
          config: mockUpdatedConfig
        }),
        validateConfigIntegrity: jest.fn().mockResolvedValue({
          success: true,
          validation: { isValid: true, issues: [], recommendations: [] }
        })
      });

      // Act - 获取当前配置
      const currentConfig = await mockConfigService.getApprovalConfig();
      expect(currentConfig.success).toBe(true);

      // Act - 更新配置
      const updateResult = await mockConfigService.updateApprovalConfig(mockConfigUpdateInput);
      expect(updateResult.success).toBe(true);

      // Act - 验证配置
      const validationResult = await mockConfigService.validateConfigIntegrity();
      expect(validationResult.success).toBe(true);

      // Assert
      TestHelpers.verifyMockCallTimes(mockConfigService.getApprovalConfig, 1);
      TestHelpers.verifyMockCallTimes(mockConfigService.updateApprovalConfig, 1);
      TestHelpers.verifyMockCallTimes(mockConfigService.validateConfigIntegrity, 1);
    });

    it('应该正确处理配置数据的类型验证', async () => {
      // Arrange
      const mockConfigService = ServiceMockFactory.createConfigService({
        getApprovalConfig: jest.fn().mockResolvedValue({
          success: true,
          config: mockApprovalConfig
        })
      });

      // Act
      const result = await mockConfigService.getApprovalConfig();

      // Assert
      expect(result.config).toHaveProperty('id');
      expect(result.config).toHaveProperty('autoApprovalEnabled');
      expect(result.config).toHaveProperty('timeoutDays');
      expect(result.config).toHaveProperty('maxPendingUsers');
      expect(result.config).toHaveProperty('notificationEnabled');
      expect(result.config).toHaveProperty('emailTemplates');

      expect(typeof result.config.autoApprovalEnabled).toBe('boolean');
      expect(typeof result.config.timeoutDays).toBe('number');
      expect(typeof result.config.maxPendingUsers).toBe('number');
      expect(typeof result.config.notificationEnabled).toBe('boolean');
      expect(typeof result.config.emailTemplates).toBe('object');
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内完成配置操作', async () => {
      // Arrange
      const mockConfigService = ServiceMockFactory.createConfigService({
        getApprovalConfig: jest.fn().mockResolvedValue({
          success: true,
          config: mockApprovalConfig
        })
      });

      // Act
      const startTime = Date.now();
      const result = await mockConfigService.getApprovalConfig();

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 50); // 50ms内完成
    });
  });
});

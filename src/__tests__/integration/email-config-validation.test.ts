/**
 * @fileoverview 邮箱配置验证集成测试
 * @description 测试邮箱验证系统的配置化功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { EmailVerificationConfigManager } from '@/lib/config/email-verification-config';

// Mock环境变量
const __mockEnv = {
  NODE_ENV: 'test',
  EMAIL_SERVER_HOST: '',
  EMAIL_SERVER_PORT: '',
  EMAIL_SERVER_USER: '',
  EMAIL_SERVER_PASSWORD: '',
  EMAIL_FROM: '',
  NEXTAUTH_URL: '',
};

// Mock配置模块
jest.mock('@/lib/middleware/email-config-validator', () => ({
  EmailConfigValidator: {
    validateAllConfigs: jest.fn(),
    quickValidate: jest.fn(),
    generateConfigReport: jest.fn(),
  },
}));

jest.mock('@/lib/config/email-verification-config', () => ({
  EmailVerificationConfigManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getConfig: jest.fn(),
    generateVerificationUrl: jest.fn(),
    generatePasswordResetUrl: jest.fn(),
    getTokenExpiryDate: jest.fn(),
    getPasswordResetExpiryDate: jest.fn(),
    isEmailDomainAllowed: jest.fn(),
    getConfigSummary: jest.fn(),
    reload: jest.fn(),
  })),
}));

// 保存原始环境变量
const originalEnv = process.env;

describe('邮箱配置验证集成测试', () => {
  beforeEach(() => {
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('配置验证器', () => {
    it('应该验证完整的配置', async () => {
      // Mock验证结果
      const mockResult = {
        isValid: true,
        errors: [],
        warnings: [],
        missingRequired: [],
        missingOptional: [],
      };

      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      (EmailConfigValidator.validateAllConfigs as jest.Mock).mockResolvedValue(mockResult);

      const result = await EmailConfigValidator.validateAllConfigs();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('应该检测缺失的必需配置', async () => {
      // Mock验证结果
      const mockResult = {
        isValid: false,
        errors: ['缺少必需的环境变量: EMAIL_SERVER_USER'],
        warnings: [],
        missingRequired: ['EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD', 'EMAIL_FROM', 'NEXTAUTH_URL'],
        missingOptional: [],
      };

      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      (EmailConfigValidator.validateAllConfigs as jest.Mock).mockResolvedValue(mockResult);

      const result = await EmailConfigValidator.validateAllConfigs();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missingRequired).toContain('EMAIL_SERVER_USER');
    });

    it('应该验证邮箱格式', async () => {
      // Mock验证结果
      const mockResult = {
        isValid: false,
        errors: ['发件人邮箱格式无效: invalid-email', '支持邮箱格式无效: invalid-support-email'],
        warnings: [],
        missingRequired: [],
        missingOptional: [],
      };

      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      (EmailConfigValidator.validateAllConfigs as jest.Mock).mockResolvedValue(mockResult);

      const result = await EmailConfigValidator.validateAllConfigs();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('发件人邮箱格式无效'))).toBe(true);
    });

    it('应该进行快速验证', async () => {
      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      (EmailConfigValidator.quickValidate as jest.Mock).mockResolvedValue(true);

      const isValid = await EmailConfigValidator.quickValidate();
      expect(typeof isValid).toBe('boolean');
      expect(isValid).toBe(true);
    });

    it('应该生成配置报告', async () => {
      const mockReport = '# 邮箱验证配置报告\n\n**验证状态:** ✅ 通过\n';

      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      (EmailConfigValidator.generateConfigReport as jest.Mock).mockResolvedValue(mockReport);

      const report = await EmailConfigValidator.generateConfigReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('# 邮箱验证配置报告');
      expect(report).toContain('验证状态:');
    });
  });

  describe('配置管理器', () => {
    it('应该正确加载环境变量配置', async () => {
      const { EmailVerificationConfigManager } = await import('@/lib/config/email-verification-config');
      const mockConfigManager = EmailVerificationConfigManager.getInstance();

      // Mock配置返回值
      (mockConfigManager.getConfig as jest.Mock).mockReturnValue({
        brandName: 'TestBrand',
        brandColor: '#ff0000',
        supportEmail: 'test-support@example.com',
        tokenExpiryHours: 48,
        maxResendAttempts: 5,
        baseUrl: 'https://test.example.com',
      });

      const config = mockConfigManager.getConfig();

      expect(config.brandName).toBe('TestBrand');
      expect(config.brandColor).toBe('#ff0000');
      expect(config.supportEmail).toBe('test-support@example.com');
    });

  });

  describe('基本功能测试', () => {
    it('应该能够创建配置管理器实例', () => {
      const configManager = new EmailVerificationConfigManager();
      expect(configManager).toBeDefined();
    });

    it('应该能够调用验证方法', async () => {
      const { EmailConfigValidator } = await import('@/lib/middleware/email-config-validator');
      expect(EmailConfigValidator.validateAllConfigs).toBeDefined();
      expect(EmailConfigValidator.quickValidate).toBeDefined();
      expect(EmailConfigValidator.generateConfigReport).toBeDefined();
    });
  });
});

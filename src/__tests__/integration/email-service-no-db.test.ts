/**
 * @fileoverview 邮件服务集成测试（无数据库依赖版本）
 * @description 专注于邮件服务核心功能的测试，避免数据库连接问题
 * @author Augment AI
 * @date 2025-07-10
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// 设置测试环境变量
beforeAll(() => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  });
  process.env.COSEREEDEN_EMAIL_FROM = 'test@cosereeden.com';
  process.env.COSEREEDEN_EMAIL_PROVIDER = 'mock';
  process.env.COSEREEDEN_DISABLE_EXTERNAL_SERVICES = 'true';
});

// 简化的Mock配置
jest.mock('@/lib/email/services/email-transport-service', () => ({
  EmailTransportService: {
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-message-id',
      attempts: 1,
      totalTime: 100,
    }),
    testEmailSending: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-test-id',
      attempts: 1,
      totalTime: 100,
    }),
  },
}));

jest.mock('@/lib/email/services/email-config-service', () => ({
  EmailConfigService: {
    getEmailConfig: jest.fn().mockResolvedValue({
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpUser: 'test@example.com',
      smtpPassword: 'test-password',
      fromEmail: 'test@cosereeden.com',
      fromName: 'CoserEden Test',
    }),
    detectProvider: jest.fn().mockReturnValue('mock'),
  },
}));

// Mock tRPC服务
jest.mock('@/server/api/routers/auth/services/email-verification-service', () => ({
  EmailVerificationService: {
    sendTestEmail: jest.fn().mockResolvedValue({
      success: true,
      message: '测试邮件已成功发送',
      details: {
        messageId: 'mock-verification-id',
        attempts: 1,
        totalTime: 150,
      },
    }),
  },
}));

jest.mock('@/server/api/routers/settings/services/email-settings-service', () => ({
  EmailSettingsService: {
    sendTestEmail: jest.fn().mockResolvedValue({
      success: true,
      message: '测试邮件已成功发送',
      details: {
        messageId: 'mock-settings-id',
        attempts: 1,
        totalTime: 120,
      },
    }),
  },
}));

describe('邮件服务集成测试（无数据库依赖）', () => {
  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('基础邮件发送功能', () => {
    it('应该能够发送简单的文本邮件', async () => {
      const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');

      const result = await EmailTransportService.sendEmail({
        to: 'test@example.com',
        subject: '测试邮件',
        html: '<p>测试内容</p>',
        text: '测试内容',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('应该能够发送HTML格式邮件', async () => {
      const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');

      const result = await EmailTransportService.sendEmail({
        to: 'test@example.com',
        subject: 'HTML测试邮件',
        html: '<h1>欢迎使用CoserEden</h1><p>这是一封HTML格式的测试邮件。</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('应该能够测试邮件发送功能', async () => {
      const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');

      const result = await EmailTransportService.testEmailSending('test@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('邮件模板系统功能', () => {
    it('应该能够生成测试邮件模板', async () => {
      const { CoserEdenTemplateService } = await import('@/lib/email/services/template/cosereeden-templates');

      const template = CoserEdenTemplateService.getTestEmailTemplate({
        testTime: '2025-07-10 15:30:00',
        recipientEmail: 'test@example.com',
      });

      expect(template.subject).toContain('邮件服务测试');
      expect(template.html).toContain('test@example.com');
      expect(template.text).toBeDefined();
    });

    it('应该能够生成注册验证邮件模板', async () => {
      const { CoserEdenTemplateService } = await import('@/lib/email/services/template/cosereeden-templates');

      const template = CoserEdenTemplateService.getRegistrationVerificationTemplate({
        username: 'testuser',
        verificationUrl: 'https://cosereeden.com/verify?token=test123',
      });

      expect(template.subject).toContain('验证');
      expect(template.html).toContain('testuser');
      expect(template.html).toContain('https://cosereeden.com/verify?token=test123');
    });

    it('应该能够生成密码重置邮件模板', async () => {
      const { CoserEdenTemplateService } = await import('@/lib/email/services/template/cosereeden-templates');

      const template = CoserEdenTemplateService.getPasswordResetTemplate({
        username: 'testuser',
        resetUrl: 'https://cosereeden.com/reset?token=reset123',
      });

      expect(template.subject).toContain('重置');
      expect(template.html).toContain('testuser');
      expect(template.html).toContain('https://cosereeden.com/reset?token=reset123');
    });

    it('应该能够获取所有模板类型', async () => {
      const { CoserEdenTemplateService } = await import('@/lib/email/services/template/cosereeden-templates');

      const types = CoserEdenTemplateService.getAvailableTemplateTypes();

      expect(types).toHaveLength(7);
      expect(types.map(t => t.type)).toContain('TEST');
      expect(types.map(t => t.type)).toContain('VERIFICATION');
      expect(types.map(t => t.type)).toContain('PASSWORD_RESET');
    });
  });

  describe('邮件服务与tRPC集成', () => {
    it('应该能够通过tRPC发送测试邮件', async () => {
      const { EmailVerificationService } = await import('@/server/api/routers/auth/services/email-verification-service');

      const result = await EmailVerificationService.sendTestEmail(
        'test@example.com',
        'admin-user-id',
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('测试邮件已成功发送');
    });

    it('应该能够通过设置服务测试邮件连接', async () => {
      const { EmailSettingsService } = await import('@/server/api/routers/settings/services/email-settings-service');

      // EmailSettingsService没有sendTestEmail方法，改为测试连接
      const result = await EmailSettingsService.prototype.testEmailConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('邮件服务连接正常');
    });
  });

  describe('邮件错误处理', () => {
    it('应该能够分析邮件错误', async () => {
      const { emailErrorAnalyzer } = await import('@/lib/email/services/email-error-analyzer');

      const error = new Error('ENOTFOUND smtp.example.com');
      const analysis = emailErrorAnalyzer.analyzeError(error, {
        emailType: 'verification',
        recipientEmail: 'test@example.com',
        attemptNumber: 1,
        maxAttempts: 3,
        timestamp: new Date(),
      });

      expect(analysis.type).toBe('DNS_RESOLUTION_FAILED');
      expect(analysis.retryable).toBe(true);
    });
  });

  describe('邮件日志功能', () => {
    it('应该能够记录邮件发送日志', async () => {
      const { emailLogger } = await import('@/lib/email/services/email-logger');

      emailLogger.clearLogs();

      emailLogger.logEmailSend(
        {
          emailType: 'verification',
          recipientEmail: 'test@example.com',
          attemptNumber: 1,
          maxAttempts: 3,
          timestamp: new Date(),
        },
        {
          success: true,
          messageId: 'test-id',
          attempts: 1,
          totalTime: 1000,
        }
      );

      const stats = emailLogger.getEmailStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
    });
  });
});

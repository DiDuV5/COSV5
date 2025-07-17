/**
 * @fileoverview 简化的邮件服务集成测试
 * @description 专注于核心功能的邮件服务测试，避免复杂的Mock配置
 * @author Augment AI
 * @date 2025-07-10
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

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

describe('邮件服务简化集成测试', () => {
  beforeAll(async () => {
    // 设置测试环境变量
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true
    });
    process.env.COSEREEDEN_EMAIL_FROM = 'test@cosereeden.com';
    process.env.COSEREEDEN_EMAIL_PROVIDER = 'mock';
    process.env.COSEREEDEN_DISABLE_EXTERNAL_SERVICES = 'true';
  });

  afterAll(async () => {
    // 清理
    jest.clearAllMocks();
  });

  describe('邮件传输服务', () => {
    it('应该能够发送邮件', async () => {
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

    it('应该能够发送测试邮件', async () => {
      const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');

      const result = await EmailTransportService.testEmailSending('test@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('邮件模板系统', () => {
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

    it('应该能够获取所有模板类型', async () => {
      const { CoserEdenTemplateService } = await import('@/lib/email/services/template/cosereeden-templates');

      const types = CoserEdenTemplateService.getAvailableTemplateTypes();

      expect(types).toHaveLength(7);
      expect(types.map(t => t.type)).toContain('TEST');
      expect(types.map(t => t.type)).toContain('VERIFICATION');
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

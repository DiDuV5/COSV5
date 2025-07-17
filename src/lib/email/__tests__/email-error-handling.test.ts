/**
 * @fileoverview 邮件错误处理测试
 * @description 测试邮件发送错误分析和处理机制
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { EmailErrorAnalyzerService } from '../services/email-error-analyzer';
import { EmailLoggerService } from '../services/email-logger';
import {
  EmailErrorType,
  EmailSendContext,
  EmailSendResult,
} from '../types/email-error-types';

describe('邮件错误处理', () => {
  let errorAnalyzer: EmailErrorAnalyzerService;
  let context: EmailSendContext;

  beforeEach(() => {
    errorAnalyzer = new EmailErrorAnalyzerService();
    context = {
      emailType: 'verification',
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      attemptNumber: 1,
      maxAttempts: 3,
      timestamp: new Date(),
    };
  });

  describe('错误分析器', () => {
    it('应该正确识别网络错误', () => {
      const networkError = new Error('ENOTFOUND smtp.gmail.com');
      const result = errorAnalyzer.analyzeError(networkError, context);

      expect(result.type).toBe(EmailErrorType.DNS_RESOLUTION_FAILED);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('邮件服务器地址解析失败');
    });

    it('应该正确识别SMTP认证错误', () => {
      const authError = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
      const result = errorAnalyzer.analyzeError(authError, context);

      expect(result.type).toBe(EmailErrorType.SMTP_AUTH_FAILED);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('邮件服务认证失败');
    });

    it('应该正确识别邮箱地址错误', () => {
      const emailError = new Error('Recipient address rejected: User not found');
      const result = errorAnalyzer.analyzeError(emailError, context);

      expect(result.type).toBe(EmailErrorType.EMAIL_REJECTED);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('邮件被收件方拒绝');
    });

    it('应该正确识别连接超时错误', () => {
      const timeoutError = new Error('Connection timeout');
      const result = errorAnalyzer.analyzeError(timeoutError, context);

      expect(result.type).toBe(EmailErrorType.CONNECTION_TIMEOUT);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('邮件服务连接超时');
    });

    it('应该正确识别限流错误', () => {
      const rateLimitError = new Error('Too many requests, rate limit exceeded');
      const result = errorAnalyzer.analyzeError(rateLimitError, context);

      expect(result.type).toBe(EmailErrorType.SMTP_RATE_LIMITED);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('邮件发送频率过高');
    });
  });

  describe('重试逻辑', () => {
    it('不可重试的错误应该返回false', () => {
      const authError = {
        type: EmailErrorType.SMTP_AUTH_FAILED,
        message: 'Auth failed',
        userMessage: 'Auth failed',
        recoveryActions: [],
        retryable: false,
      };

      const shouldRetry = errorAnalyzer.shouldRetry(authError, 1);
      expect(shouldRetry).toBe(false);
    });

    it('可重试的错误在达到最大次数后应该返回false', () => {
      const networkError = {
        type: EmailErrorType.NETWORK_ERROR,
        message: 'Network error',
        userMessage: 'Network error',
        recoveryActions: [],
        retryable: true,
      };

      const shouldRetry = errorAnalyzer.shouldRetry(networkError, 4);
      expect(shouldRetry).toBe(false);
    });

    it('可重试的错误在未达到最大次数时应该返回true', () => {
      const networkError = {
        type: EmailErrorType.NETWORK_ERROR,
        message: 'Network error',
        userMessage: 'Network error',
        recoveryActions: [],
        retryable: true,
      };

      const shouldRetry = errorAnalyzer.shouldRetry(networkError, 1);
      expect(shouldRetry).toBe(true);
    });
  });

  describe('重试延迟计算', () => {
    it('限流错误应该使用指数退避', () => {
      const rateLimitError = {
        type: EmailErrorType.SMTP_RATE_LIMITED,
        message: 'Rate limited',
        userMessage: 'Rate limited',
        recoveryActions: [],
        retryable: true,
      };

      const delay1 = errorAnalyzer.getRetryDelay(rateLimitError, 1);
      const delay2 = errorAnalyzer.getRetryDelay(rateLimitError, 2);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay1).toBe(4000); // 1000 * 4^1
      expect(delay2).toBe(16000); // 1000 * 4^2
    });

    it('网络错误应该使用线性增长', () => {
      const networkError = {
        type: EmailErrorType.NETWORK_ERROR,
        message: 'Network error',
        userMessage: 'Network error',
        recoveryActions: [],
        retryable: true,
      };

      const delay1 = errorAnalyzer.getRetryDelay(networkError, 1);
      const delay2 = errorAnalyzer.getRetryDelay(networkError, 2);

      expect(delay1).toBe(2000); // 1000 * (1 + 1)
      expect(delay2).toBe(3000); // 1000 * (2 + 1)
    });
  });

  describe('邮件日志服务', () => {
    beforeEach(() => {
      // 清理日志
      EmailLoggerService['logs'] = [];
    });

    it('应该正确记录成功的邮件发送', () => {
      const result: EmailSendResult = {
        success: true,
        messageId: 'test-message-id',
        attempts: 1,
        totalTime: 1500,
      };

      EmailLoggerService.logEmailSend(context, result);
      const logs = EmailLoggerService.getRecentLogs(1);

      expect(logs).toHaveLength(1);
      expect(logs[0].result.success).toBe(true);
      expect(logs[0].result.messageId).toBe('test-message-id');
      expect(logs[0].context.emailType).toBe('verification');
    });

    it('应该正确记录失败的邮件发送', () => {
      const result: EmailSendResult = {
        success: false,
        error: {
          type: EmailErrorType.SMTP_AUTH_FAILED,
          message: 'Auth failed',
          userMessage: 'Auth failed',
          recoveryActions: [],
          retryable: false,
        },
        attempts: 3,
        totalTime: 5000,
      };

      EmailLoggerService.logEmailSend(context, result);
      const failedLogs = EmailLoggerService.getFailedLogs(1);

      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].result.success).toBe(false);
      expect(failedLogs[0].result.error?.type).toBe(EmailErrorType.SMTP_AUTH_FAILED);
    });

    it('应该正确计算邮件发送统计', () => {
      // 添加一些测试数据
      const successResult: EmailSendResult = {
        success: true,
        messageId: 'success-1',
        attempts: 1,
        totalTime: 1000,
      };

      const failResult: EmailSendResult = {
        success: false,
        error: {
          type: EmailErrorType.NETWORK_ERROR,
          message: 'Network error',
          userMessage: 'Network error',
          recoveryActions: [],
          retryable: true,
        },
        attempts: 2,
        totalTime: 3000,
      };

      EmailLoggerService.logEmailSend(context, successResult);
      EmailLoggerService.logEmailSend(context, failResult);

      const stats = EmailLoggerService.getEmailStats();

      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe('50.00%');
      expect(stats.errorsByType[EmailErrorType.NETWORK_ERROR]).toBe(1);
    });

    it('应该正确获取特定邮箱的发送历史', () => {
      const email = 'specific@example.com';
      const specificContext = { ...context, recipientEmail: email };

      const result: EmailSendResult = {
        success: true,
        messageId: 'specific-message',
        attempts: 1,
        totalTime: 1200,
      };

      EmailLoggerService.logEmailSend(specificContext, result);
      EmailLoggerService.logEmailSend(context, result); // 不同邮箱

      const history = EmailLoggerService.getEmailHistory(email);

      expect(history).toHaveLength(1);
      expect(history[0].context.recipientEmail).toBe(email);
    });
  });

  describe('邮件健康检查', () => {
    beforeEach(() => {
      EmailLoggerService['logs'] = [];
    });

    it('没有日志时应该返回健康状态', () => {
      const health = EmailLoggerService.checkEmailHealth();

      expect(health.status).toBe('healthy');
      expect(health.message).toContain('邮件服务运行正常');
    });

    it('成功率低时应该返回警告状态', () => {
      // 添加大量失败日志
      for (let i = 0; i < 50; i++) {
        const failResult: EmailSendResult = {
          success: false,
          error: {
            type: EmailErrorType.NETWORK_ERROR,
            message: 'Network error',
            userMessage: 'Network error',
            recoveryActions: [],
            retryable: true,
          },
          attempts: 1,
          totalTime: 1000,
        };
        EmailLoggerService.logEmailSend(context, failResult);
      }

      // 添加少量成功日志
      for (let i = 0; i < 10; i++) {
        const successResult: EmailSendResult = {
          success: true,
          messageId: `success-${i}`,
          attempts: 1,
          totalTime: 1000,
        };
        EmailLoggerService.logEmailSend(context, successResult);
      }

      const health = EmailLoggerService.checkEmailHealth();

      expect(health.status).toBe('warning');
      expect(health.message).toContain('邮件发送成功率较低');
    });

    it('有严重错误时应该返回严重状态', () => {
      const criticalResult: EmailSendResult = {
        success: false,
        error: {
          type: EmailErrorType.SMTP_AUTH_FAILED,
          message: 'Auth failed',
          userMessage: 'Auth failed',
          recoveryActions: [],
          retryable: false,
        },
        attempts: 1,
        totalTime: 1000,
      };

      EmailLoggerService.logEmailSend(context, criticalResult);

      const health = EmailLoggerService.checkEmailHealth();

      expect(health.status).toBe('critical');
      expect(health.message).toContain('邮件服务存在严重配置问题');
    });
  });
});

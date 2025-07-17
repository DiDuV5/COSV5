/**
 * @fileoverview 管理员邮件监控API
 * @description 提供邮件发送状态监控和统计功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { emailLogger } from "@/lib/email/services/email-logger";

/**
 * 时间范围验证模式
 */
const timeRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).optional();

/**
 * 邮件监控路由
 */
export const emailMonitoringRouter = createTRPCRouter({
  /**
   * 获取邮件发送统计信息
   */
  getEmailStats: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ input }) => {
      try {
        const timeRange = input ? {
          start: new Date(input.start || Date.now() - 24 * 60 * 60 * 1000), // 默认24小时前
          end: new Date(input.end || Date.now()),
        } : undefined;

        const stats = emailLogger.getEmailStats(timeRange);

        return {
          success: true,
          data: stats,
          timeRange,
        };
      } catch (error) {
        console.error('获取邮件统计失败:', error);
        throw TRPCErrorHandler.internalError('获取邮件统计失败');
      }
    }),

  /**
   * 获取最近的邮件发送日志
   */
  getRecentLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      onlyFailed: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      try {
        const logs = input.onlyFailed
          ? emailLogger.getFailedLogs(input.limit)
          : emailLogger.getRecentLogs(input.limit);

        return {
          success: true,
          data: logs,
          count: logs.length,
        };
      } catch (error) {
        console.error('获取邮件日志失败:', error);
        throw TRPCErrorHandler.internalError('获取邮件日志失败');
      }
    }),

  /**
   * 获取特定邮箱的发送历史
   */
  getEmailHistory: adminProcedure
    .input(z.object({
      email: z.string().email(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const history = emailLogger.getEmailHistory(input.email, input.limit);

        return {
          success: true,
          data: history,
          email: input.email,
          count: history.length,
        };
      } catch (error) {
        console.error('获取邮箱历史失败:', error);
        throw TRPCErrorHandler.internalError('获取邮箱历史失败');
      }
    }),

  /**
   * 检查邮件服务健康状态
   */
  checkEmailHealth: adminProcedure
    .query(async () => {
      try {
        const health = emailLogger.checkEmailHealth();

        return {
          success: true,
          ...health,
        };
      } catch (error) {
        console.error('检查邮件健康状态失败:', error);
        throw TRPCErrorHandler.internalError('检查邮件健康状态失败');
      }
    }),

  /**
   * 清理旧日志
   */
  cleanupOldLogs: adminProcedure
    .input(z.object({
      olderThanDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      try {
        const removedCount = emailLogger.cleanupOldLogs(input.olderThanDays);

        return {
          success: true,
          message: `已清理 ${removedCount} 条超过 ${input.olderThanDays} 天的日志`,
          removedCount,
        };
      } catch (error) {
        console.error('清理日志失败:', error);
        throw TRPCErrorHandler.internalError('清理日志失败');
      }
    }),

  /**
   * 导出邮件日志
   */
  exportLogs: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ input }) => {
      try {
        const timeRange = input ? {
          start: new Date(input.start || Date.now() - 7 * 24 * 60 * 60 * 1000), // 默认7天前
          end: new Date(input.end || Date.now()),
        } : undefined;

        const exportData = emailLogger.exportLogs(timeRange);

        return {
          success: true,
          data: exportData,
          filename: `email_logs_${new Date().toISOString().split('T')[0]}.json`,
        };
      } catch (error) {
        console.error('导出日志失败:', error);
        throw TRPCErrorHandler.internalError('导出日志失败');
      }
    }),

  /**
   * 测试邮件发送（用于诊断）
   */
  testEmailSend: adminProcedure
    .input(z.object({
      testEmail: z.string().email(),
      emailType: z.enum(['verification', 'password_reset', 'welcome', 'notification']).default('notification'),
    }))
    .mutation(async ({ input }) => {
      try {
        // 验证邮箱服务配置
        const { EmailConfigService } = await import('@/lib/email/services/email-config-service');
        const config = await EmailConfigService.getEmailConfig();

        if (!config) {
          throw TRPCErrorHandler.businessError(
            'MISSING_CONFIG' as any,
            '邮箱服务配置未设置'
          );
        }

        // 发送测试邮件
        const { EmailService } = await import('@/lib/email');

        let result;
        switch (input.emailType) {
          case 'verification':
            // 生成测试验证URL
            const { generateVerificationUrl } = await import('@/lib/config/url-config');
            const testVerificationUrl = generateVerificationUrl('test-token-123');

            result = await EmailService.sendVerificationEmailDetailed(
              input.testEmail,
              'Test User',
              testVerificationUrl
            );
            break;
          case 'welcome':
            result = await EmailService.sendWelcomeEmail(
              input.testEmail,
              'Test User'
            );
            break;
          default:
            result = await EmailService.sendNotificationEmail(
              input.testEmail,
              'Test User',
              '邮件服务测试',
              '这是一封测试邮件，用于验证邮件服务是否正常工作。'
            );
        }

        return {
          success: typeof result === 'object' && result && 'success' in result ? result.success : !!result,
          message: typeof result === 'object' && result && 'success' in result && result.success
            ? '测试邮件发送成功'
            : (typeof result === 'object' && result && 'userMessage' in result ? result.userMessage : '测试邮件发送失败'),
          details: {
            messageId: typeof result === 'object' && result && 'messageId' in result ? result.messageId : undefined,
            attempts: typeof result === 'object' && result && 'attempts' in result ? result.attempts : undefined,
            totalTime: typeof result === 'object' && result && 'totalTime' in result ? result.totalTime : undefined,
            errorType: typeof result === 'object' && result && 'error' in result ? result.error?.type : undefined,
            shouldRetry: typeof result === 'object' && result && 'shouldRetry' in result ? result.shouldRetry : undefined,
          },
        };
      } catch (error) {
        console.error('测试邮件发送失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError('测试邮件发送失败');
      }
    }),

  /**
   * 获取邮件配置状态
   */
  getConfigStatus: adminProcedure
    .query(async () => {
      try {
        const { EmailConfigService } = await import('@/lib/email/services/email-config-service');
        const config = await EmailConfigService.getEmailConfig();

        if (!config) {
          return {
            success: false,
            configured: false,
            message: '邮箱服务未配置',
          };
        }

        // 检查必要的配置项
        const requiredFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpFromEmail'];
        const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

        if (missingFields.length > 0) {
          return {
            success: false,
            configured: false,
            message: `邮箱配置不完整，缺少: ${missingFields.join(', ')}`,
            missingFields,
          };
        }

        return {
          success: true,
          configured: true,
          message: '邮箱服务配置完整',
          provider: EmailConfigService.detectProvider(config),
          config: {
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            fromEmail: config.smtpFromEmail,
            fromName: config.smtpFromName,
          },
        };
      } catch (error) {
        console.error('获取邮件配置状态失败:', error);
        throw TRPCErrorHandler.internalError('获取邮件配置状态失败');
      }
    }),
});

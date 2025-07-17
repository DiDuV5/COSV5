/**
 * @fileoverview 邮箱配置验证管理路由
 * @description 提供邮箱配置验证和管理功能的tRPC路由
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { EmailConfigValidator } from "@/lib/middleware/email-config-validator";
import { emailVerificationConfig } from "@/lib/config/email-verification-config";

/**
 * 邮箱配置验证路由
 */
export const emailConfigValidationRouter = createTRPCRouter({
  /**
   * 验证所有邮箱配置
   */
  validateAllConfigs: adminProcedure
    .query(async () => {
      try {
        const result = await EmailConfigValidator.validateAllConfigs();

        console.log('📧 邮箱配置验证完成:', {
          isValid: result.isValid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
        });

        return result;
      } catch (error) {
        console.error('❌ 邮箱配置验证失败:', error);
        throw TRPCErrorHandler.internalError('邮箱配置验证失败');
      }
    }),

  /**
   * 快速验证关键配置
   */
  quickValidate: adminProcedure
    .query(async () => {
      try {
        const isValid = await EmailConfigValidator.quickValidate();

        return {
          isValid,
          message: isValid ? '关键配置验证通过' : '关键配置验证失败',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 快速配置验证失败:', error);
        throw TRPCErrorHandler.internalError('快速配置验证失败');
      }
    }),

  /**
   * 生成配置报告
   */
  generateConfigReport: adminProcedure
    .query(async () => {
      try {
        const report = await EmailConfigValidator.generateConfigReport();

        return {
          report,
          generatedAt: new Date().toISOString(),
          format: 'markdown',
        };
      } catch (error) {
        console.error('❌ 生成配置报告失败:', error);
        throw TRPCErrorHandler.internalError('生成配置报告失败');
      }
    }),

  /**
   * 获取当前配置摘要
   */
  getConfigSummary: adminProcedure
    .query(async () => {
      try {
        await emailVerificationConfig.initialize();
        const summary = emailVerificationConfig.getConfigSummary();

        return {
          ...summary,
          retrievedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 获取配置摘要失败:', error);
        throw TRPCErrorHandler.internalError('获取配置摘要失败');
      }
    }),

  /**
   * 测试邮箱验证URL生成
   */
  testUrlGeneration: adminProcedure
    .input(z.object({
      testToken: z.string().optional().default('test-token-123'),
    }))
    .query(async ({ input }) => {
      try {
        // 使用统一的URL生成器进行测试
        const { generateVerificationUrl, generatePasswordResetUrl } = await import('@/lib/config/url-config');

        const verificationUrl = generateVerificationUrl(input.testToken);
        const passwordResetUrl = generatePasswordResetUrl(input.testToken);

        return {
          verificationUrl,
          passwordResetUrl,
          testToken: input.testToken,
          generatedAt: new Date().toISOString(),
          urlGenerator: 'url-config.ts', // 标识使用的URL生成器
        };
      } catch (error) {
        console.error('❌ URL生成测试失败:', error);
        throw TRPCErrorHandler.internalError('URL生成测试失败');
      }
    }),

  /**
   * 验证邮箱域名白名单
   */
  validateEmailDomain: adminProcedure
    .input(z.object({
      email: z.string().email('请输入有效的邮箱地址'),
    }))
    .query(async ({ input }) => {
      try {
        await emailVerificationConfig.initialize();

        const isAllowed = emailVerificationConfig.isEmailDomainAllowed(input.email);
        const config = emailVerificationConfig.getConfig();

        return {
          email: input.email,
          isAllowed,
          domainWhitelistEnabled: config.enableDomainWhitelist,
          allowedDomains: config.allowedDomains || [],
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 邮箱域名验证失败:', error);
        throw TRPCErrorHandler.internalError('邮箱域名验证失败');
      }
    }),

  /**
   * 获取环境变量状态
   */
  getEnvironmentStatus: adminProcedure
    .query(async () => {
      try {
        const requiredVars = [
          'COSEREEDEN_SMTP_HOST',
          'COSEREEDEN_SMTP_PORT',
          'COSEREEDEN_SMTP_USER',
          'COSEREEDEN_SMTP_PASS',
          'COSEREEDEN_SMTP_FROM',
          'NEXTAUTH_URL',
        ];

        const optionalVars = [
          'NEXT_PUBLIC_APP_URL',
          'EMAIL_FROM_NAME',
          'EMAIL_REPLY_TO',
          'SUPPORT_EMAIL',
          'BRAND_NAME',
          'BRAND_COLOR',
          'WEBSITE_URL',
          'EMAIL_TOKEN_EXPIRY_HOURS',
          'PASSWORD_RESET_EXPIRY_HOURS',
          'MAX_RESEND_ATTEMPTS',
          'RESEND_COOLDOWN_MINUTES',
        ];

        const envStatus = {
          required: {} as Record<string, boolean>,
          optional: {} as Record<string, boolean>,
          missing: [] as string[],
          present: [] as string[],
        };

        // 检查必需变量
        for (const varName of requiredVars) {
          const isPresent = !!process.env[varName];
          envStatus.required[varName] = isPresent;

          if (isPresent) {
            envStatus.present.push(varName);
          } else {
            envStatus.missing.push(varName);
          }
        }

        // 检查可选变量
        for (const varName of optionalVars) {
          const isPresent = !!process.env[varName];
          envStatus.optional[varName] = isPresent;

          if (isPresent) {
            envStatus.present.push(varName);
          }
        }

        return {
          ...envStatus,
          totalRequired: requiredVars.length,
          totalOptional: optionalVars.length,
          requiredPresent: Object.values(envStatus.required).filter(Boolean).length,
          optionalPresent: Object.values(envStatus.optional).filter(Boolean).length,
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 获取环境变量状态失败:', error);
        throw TRPCErrorHandler.internalError('获取环境变量状态失败');
      }
    }),

  /**
   * 重新加载配置
   */
  reloadConfig: adminProcedure
    .mutation(async () => {
      try {
        // 重新加载配置
        emailVerificationConfig.reload();
        await emailVerificationConfig.initialize();

        // 验证新配置
        const validationResult = await EmailConfigValidator.quickValidate();

        return {
          success: true,
          configValid: validationResult,
          message: validationResult ? '配置重新加载成功' : '配置重新加载完成，但验证失败',
          reloadedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 重新加载配置失败:', error);
        throw TRPCErrorHandler.internalError('重新加载配置失败');
      }
    }),

  /**
   * 获取配置建议
   */
  getConfigRecommendations: adminProcedure
    .query(async () => {
      try {
        const config = emailVerificationConfig.getConfig();
        const recommendations: any[] = [];

        // 安全建议
        if (!config.requireHttps && process.env.NODE_ENV === 'production') {
          recommendations.push({
            type: 'security',
            priority: 'high',
            message: '生产环境建议启用HTTPS要求',
            action: '设置 REQUIRE_HTTPS=true',
          });
        }

        // 令牌过期时间建议
        if (config.tokenExpiryHours > 48) {
          recommendations.push({
            type: 'security',
            priority: 'medium',
            message: '邮箱验证令牌过期时间较长，可能存在安全风险',
            action: '考虑将 EMAIL_TOKEN_EXPIRY_HOURS 设置为24小时或更短',
          });
        }

        // 重发限制建议
        if (config.maxResendAttempts > 5) {
          recommendations.push({
            type: 'performance',
            priority: 'medium',
            message: '最大重发次数较高，可能被滥用',
            action: '考虑将 MAX_RESEND_ATTEMPTS 设置为3-5次',
          });
        }

        // 品牌配置建议
        if (!process.env.COSEREEDEN_LOGO_URL) {
          recommendations.push({
            type: 'branding',
            priority: 'low',
            message: '未设置品牌Logo，邮件模板将使用默认样式',
            action: '设置 LOGO_URL 以提升品牌形象',
          });
        }

        // 域名白名单建议
        if (!config.enableDomainWhitelist && process.env.NODE_ENV === 'production') {
          recommendations.push({
            type: 'security',
            priority: 'low',
            message: '未启用邮箱域名白名单，可能收到垃圾注册',
            action: '考虑启用 ENABLE_DOMAIN_WHITELIST 并配置 ALLOWED_EMAIL_DOMAINS',
          });
        }

        return {
          recommendations,
          totalCount: recommendations.length,
          highPriority: recommendations.filter(r => r.priority === 'high').length,
          mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
          lowPriority: recommendations.filter(r => r.priority === 'low').length,
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ 获取配置建议失败:', error);
        throw TRPCErrorHandler.internalError('获取配置建议失败');
      }
    }),
});

export default emailConfigValidationRouter;

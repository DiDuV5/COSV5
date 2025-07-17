/**
 * @fileoverview 邮箱验证tRPC路由
 * @description 处理邮箱验证和令牌管理
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 * @since 1.0.0
 */

import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

// 导入重构后的模块
import {
  EmailVerificationInput,
  SendVerificationEmailInput,
  EmailVerificationOutput,
  TokenCheckOutput,
  BasicSuccessOutput,
  CleanupOutput,
  VerificationStatusOutput,
  EmailConfigCheckOutput,
  TestEmailInput
} from './schemas/email-verification-schemas';

import {
  validateAdminPermission,
  checkEmailConfigCompleteness
} from './validators/email-verification-validators';

import { EmailSecurityManager } from './security/email-security-manager';
import { EmailVerificationService } from './services/email-verification-service';

/**
 * 邮箱验证路由
 * 迁移自: /api/auth/verify-email
 */
export const emailVerificationRouter = createTRPCRouter({
  /**
   * 验证邮箱
   * 迁移自: GET /api/auth/verify-email?token=xxx
   */
  verify: publicProcedure
    .input(EmailVerificationInput)
    .output(EmailVerificationOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        const { token } = input;
        return await EmailVerificationService.verifyEmailToken(token, ctx);
      } catch (error) {
        console.error('邮箱验证失败:', error);
        throw error;
      }
    }),

  /**
   * 检查验证令牌状态
   */
  checkToken: publicProcedure
    .input(EmailVerificationInput)
    .output(TokenCheckOutput)
    .query(async ({ input, ctx }) => {
      try {
        const { token } = input;
        return await EmailVerificationService.checkTokenStatus(token, ctx);
      } catch (error) {
        console.error('令牌状态检查失败:', error);
        throw error;
      }
    }),

  /**
   * 重新发送验证邮件
   */
  resendVerification: authProcedure
    .input(SendVerificationEmailInput.optional())
    .output(BasicSuccessOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        const email = input?.email || ctx.session.user.email;

        if (!email) {
          throw TRPCErrorHandler.validationError('邮箱地址不能为空');
        }

        return await EmailVerificationService.resendVerificationEmail(email, ctx);
      } catch (error) {
        console.error('重新发送验证邮件失败:', error);
        throw error;
      }
    }),

  /**
   * 清理过期的验证令牌
   */
  cleanupExpiredTokens: authProcedure
    .output(CleanupOutput)
    .mutation(async ({ ctx }) => {
      try {
        return await EmailVerificationService.cleanupExpiredTokens(ctx);
      } catch (error) {
        console.error('清理过期令牌失败:', error);
        throw error;
      }
    }),

  /**
   * 获取用户的验证状态
   */
  getVerificationStatus: authProcedure
    .output(VerificationStatusOutput)
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        return await EmailVerificationService.getVerificationStatus(userId, ctx);
      } catch (error) {
        console.error('获取验证状态失败:', error);
        throw error;
      }
    }),

  /**
   * 检查邮箱服务配置状态（管理员）
   */
  checkEmailConfig: authProcedure
    .output(EmailConfigCheckOutput)
    .query(async ({ ctx }) => {
      try {
        // 检查用户权限
        const userLevel = ctx.user.userLevel;
        validateAdminPermission(userLevel);

        // 记录管理员配置访问
        await EmailSecurityManager.logAdminConfigAccess(
          ctx.user.id,
          userLevel,
          'CHECK_EMAIL_CONFIG'
        );

        // 检查配置完整性
        const configCheck = checkEmailConfigCompleteness();

        return {
          configured: configCheck.configured,
          missingVars: configCheck.missingVars,
        };
      } catch (error) {
        console.error('检查邮箱配置失败:', error);
        throw error;
      }
    }),

  /**
   * 发送测试邮件（管理员）
   */
  sendTestEmail: authProcedure
    .input(TestEmailInput)
    .output(BasicSuccessOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        // 检查用户权限
        const userLevel = ctx.user.userLevel;
        validateAdminPermission(userLevel);

        const { testEmail } = input;

        // 记录管理员操作
        await EmailSecurityManager.logAdminConfigAccess(
          ctx.user.id,
          userLevel,
          'SEND_TEST_EMAIL'
        );

        return await EmailVerificationService.sendTestEmail(
          testEmail,
          ctx.user.id,
          ctx
        );
      } catch (error) {
        console.error('发送测试邮件失败:', error);
        throw error;
      }
    }),
});

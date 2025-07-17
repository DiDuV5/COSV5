/**
 * @fileoverview 邮箱验证核心服务
 * @description 处理邮箱验证的核心业务逻辑
 * @author Augment AI
 * @date 2025-07-03
 */

import * as crypto from 'crypto';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { getTokenExpiryDate } from '@/lib/config/email-verification-config';
import { EmailSecurityManager, SecurityEventType } from '../security/email-security-manager';
import {
  validateTokenSecurity,
  validateTokenExpiry,
  validateUserStatus,
  checkRateLimit,
  validateEmailConfig
} from '../validators/email-verification-validators';

/**
 * 邮箱验证服务类
 */
export class EmailVerificationService {

  /**
   * 验证邮箱令牌
   */
  static async verifyEmailToken(token: string, ctx: any): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    // 1. 安全检查：验证令牌格式和强度
    validateTokenSecurity(token);

    // 2. 检测重放攻击
    const isReplayAttack = await EmailSecurityManager.detectReplayAttack(token, ctx);
    if (isReplayAttack) {
      throw TRPCErrorHandler.businessError(
        'REPLAY_ATTACK_DETECTED' as any,
        '检测到重放攻击，令牌已失效',
        { context: { token } }
      );
    }

    // 3. 使用事务确保原子性，防止重放攻击
    const result = await ctx.db.$transaction(async (tx: any) => {
      // 🔍 数据库查询日志
      console.log('🔍 数据库Token查询:', {
        token,
        tokenLength: token.length,
        tokenFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)
      });

      // 查找并删除验证令牌（原子操作）
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      // 💾 数据库查询结果日志
      console.log('💾 数据库查询结果:', {
        found: !!verificationToken,
        token,
        storedToken: verificationToken?.token,
        identifier: verificationToken?.identifier,
        expires: verificationToken?.expires,
        tokenMatch: verificationToken ? token === verificationToken.token : false
      });

      if (!verificationToken) {
        console.error('❌ Token在数据库中未找到:', { token });
        await EmailSecurityManager.logInvalidToken(token);
        throw TRPCErrorHandler.businessError(
          'INVALID_TOKEN' as any,
          '验证令牌无效或已被使用',
          { context: { token } }
        );
      }

      // 检查令牌是否过期
      if (verificationToken.expires < new Date()) {
        await EmailSecurityManager.logExpiredToken(
          token,
          verificationToken.identifier,
          verificationToken.expires
        );
        throw TRPCErrorHandler.businessError(
          'TOKEN_EXPIRED' as any,
          '验证令牌已过期，请重新申请验证邮件',
          {
            context: {
              token,
              expiresAt: verificationToken.expires,
              email: verificationToken.identifier
            }
          }
        );
      }

      // 查找用户 - 使用findFirst因为email不是唯一字段
      const user = await tx.user.findFirst({
        where: {
          email: verificationToken.identifier,
          registrationStatus: 'COMPLETED'
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          username: true,
          displayName: true,
        },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound('用户不存在');
      }

      // 检查用户状态
      validateUserStatus(user);

      // 更新用户邮箱验证状态
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          username: true,
          displayName: true,
        },
      });

      // 删除验证令牌（防止重复使用）
      try {
        await tx.verificationToken.delete({
          where: { token },
        });
      } catch (deleteError) {
        // 如果令牌已经被删除，不影响验证结果
        console.log('⚠️ 验证令牌删除失败（可能已被删除）:', deleteError);
      }

      // 记录成功验证事件
      await EmailSecurityManager.logSuccessfulVerification(
        user.id,
        user.email,
        token
      );

      return {
        success: true,
        message: '邮箱验证成功！',
        user: updatedUser,
      };
    });

    return result;
  }

  /**
   * 检查令牌状态
   */
  static async checkTokenStatus(token: string, ctx: any): Promise<{
    valid: boolean;
    expired: boolean;
    email?: string;
    expiresAt?: Date;
  }> {
    // 查找验证令牌
    const verificationToken = await ctx.db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return {
        valid: false,
        expired: false,
      };
    }

    const isExpired = verificationToken.expires < new Date();

    return {
      valid: !isExpired,
      expired: isExpired,
      email: verificationToken.identifier,
      expiresAt: verificationToken.expires,
    };
  }

  /**
   * 重新发送验证邮件
   */
  static async resendVerificationEmail(
    email: string,
    ctx: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // 验证邮箱服务配置
    await validateEmailConfig();

    // 速率限制检查
    await checkRateLimit(email, ctx);

    // 查找用户 - 使用findFirst因为email不是唯一字段
    const user = await ctx.db.user.findFirst({
      where: {
        email,
        registrationStatus: 'COMPLETED'
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        username: true,
      },
    });

    if (!user) {
      throw TRPCErrorHandler.notFound('用户不存在');
    }

    if (user.emailVerified) {
      throw TRPCErrorHandler.businessError(
        'EMAIL_ALREADY_VERIFIED' as any,
        '邮箱已经验证过了',
        { context: { email } }
      );
    }

    // 生成新的验证令牌（使用UUID格式）
    const token = crypto.randomUUID();
    const expires = getTokenExpiryDate();

    // 删除旧的验证令牌
    await ctx.db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // 创建新的验证令牌
    await ctx.db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // 生成验证URL（使用统一的URL生成器）
    const { generateVerificationUrl } = await import('@/lib/config/url-config');
    const verificationUrl = generateVerificationUrl(token);

    // 发送验证邮件（使用EmailService而不是直接使用TransportService）
    const { EmailService } = await import('@/lib/email');
    const emailResult = await EmailService.sendVerificationEmailDetailed(
      email,
      user.username,
      verificationUrl
    );

    if (!emailResult.success) {
      throw TRPCErrorHandler.internalError(
        emailResult.userMessage || '验证邮件发送失败，请稍后重试'
      );
    }

    // 记录邮件发送事件
    await EmailSecurityManager.logVerificationEmailSent(
      email,
      token,
      user.id
    );

    return {
      success: true,
      message: '验证邮件已重新发送，请检查您的邮箱',
    };
  }

  /**
   * 清理过期的验证令牌
   */
  static async cleanupExpiredTokens(ctx: any): Promise<{
    cleaned: number;
  }> {
    const result = await ctx.db.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    return {
      cleaned: result.count,
    };
  }

  /**
   * 获取用户验证状态
   */
  static async getVerificationStatus(userId: string, ctx: any): Promise<{
    emailVerified: boolean;
    verifiedAt: Date | null;
    pendingVerification: boolean;
    pendingEmail?: string;
  }> {
    // 获取用户信息
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw TRPCErrorHandler.notFound('用户不存在');
    }

    // 检查是否有待验证的令牌
    const pendingToken = await ctx.db.verificationToken.findFirst({
      where: {
        identifier: user.email,
        expires: {
          gt: new Date(),
        },
      },
    });

    return {
      emailVerified: !!user.emailVerified,
      verifiedAt: user.emailVerified,
      pendingVerification: !!pendingToken,
      pendingEmail: pendingToken ? user.email : undefined,
    };
  }

  /**
   * 发送测试邮件
   */
  static async sendTestEmail(
    testEmail: string,
    adminUserId: string,
    ctx: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // 验证邮箱服务配置
    await validateEmailConfig();

    try {
      // 发送测试邮件
      const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');
      const emailSent = await EmailTransportService.sendEmail({
        to: testEmail,
        subject: '邮箱服务测试',
        html: '<p>这是一封测试邮件，如果您收到此邮件，说明邮箱服务配置正确。</p>',
        text: '这是一封测试邮件，如果您收到此邮件，说明邮箱服务配置正确。'
      });

      // 记录测试邮件发送事件
      await EmailSecurityManager.logTestEmailSent(
        adminUserId,
        testEmail,
        !!emailSent
      );

      if (emailSent) {
        return {
          success: true,
          message: `测试邮件已成功发送到 ${testEmail}`,
        };
      } else {
        return {
          success: false,
          message: '测试邮件发送失败，请检查邮箱服务配置',
        };
      }
    } catch (error) {
      // 记录失败事件
      await EmailSecurityManager.logTestEmailSent(
        adminUserId,
        testEmail,
        false
      );

      throw TRPCErrorHandler.internalError(
        `测试邮件发送失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
}

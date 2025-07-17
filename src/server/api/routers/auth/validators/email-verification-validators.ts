/**
 * @fileoverview 邮箱验证相关的验证器函数
 * @description 提供邮箱验证过程中的各种验证逻辑
 * @author Augment AI
 * @date 2025-07-03
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { emailVerificationConfig } from '@/lib/config/email-verification-config';

/**
 * 邮箱验证配置验证
 */
export async function validateEmailConfig(): Promise<void> {
  try {
    await emailVerificationConfig.initialize();

    const requiredEnvVars = [
      'COSEREEDEN_SMTP_HOST',
      'COSEREEDEN_SMTP_PORT',
      'COSEREEDEN_SMTP_USER',
      'COSEREEDEN_SMTP_PASS',
      'COSEREEDEN_SMTP_FROM'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw TRPCErrorHandler.internalError(
        `邮箱服务配置不完整，缺少环境变量: ${missingVars.join(', ')}`
      );
    }
  } catch (error) {
    console.error('邮箱验证配置验证失败:', error);
    throw error;
  }
}

/**
 * 验证令牌安全检查
 */
export function validateTokenSecurity(token: string): void {
  // 检查基本格式
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw TRPCErrorHandler.validationError('令牌不能为空');
  }

  const trimmedToken = token.trim();

  // 支持两种令牌格式：
  // 1. UUID v4 格式（36字符，包含连字符）
  // 2. Hex 格式（64字符，纯十六进制）

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexRegex = /^[0-9a-f]{64}$/i;

  const isValidUUID = uuidRegex.test(trimmedToken);
  const isValidHex = hexRegex.test(trimmedToken);

  if (!isValidUUID && !isValidHex) {
    throw TRPCErrorHandler.validationError('无效的令牌格式');
  }

  // 检查令牌长度
  if (trimmedToken.length !== 36 && trimmedToken.length !== 64) {
    throw TRPCErrorHandler.validationError('令牌长度不正确');
  }
}

/**
 * 速率限制检查
 */
export async function checkRateLimit(email: string, ctx: any): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // 检查一小时内发送的验证邮件数量
  const recentTokens = await ctx.db.verificationToken.count({
    where: {
      identifier: email,
      expires: {
        gte: oneHourAgo,
      },
    },
  });

  // 限制每小时最多发送3封验证邮件
  if (recentTokens >= 3) {
    throw TRPCErrorHandler.businessError(
      'RATE_LIMIT_EXCEEDED' as any,
      '发送验证邮件过于频繁，请稍后再试',
      {
        context: {
          email,
          recentTokens,
          timeWindow: '1小时',
          maxAttempts: 3
        }
      }
    );
  }

  // 检查最近5分钟内的发送次数
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const veryRecentTokens = await ctx.db.verificationToken.count({
    where: {
      identifier: email,
      expires: {
        gte: fiveMinutesAgo,
      },
    },
  });

  // 限制5分钟内最多发送1封
  if (veryRecentTokens >= 1) {
    throw TRPCErrorHandler.businessError(
      'RATE_LIMIT_EXCEEDED' as any,
      '请等待5分钟后再重新发送验证邮件',
      {
        context: {
          email,
          recentTokens: veryRecentTokens,
          timeWindow: '5分钟',
          maxAttempts: 1
        }
      }
    );
  }
}

/**
 * 验证用户权限
 */
export function validateAdminPermission(userLevel: string): void {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userLevel)) {
    throw TRPCErrorHandler.forbidden('需要管理员权限');
  }
}

/**
 * 验证邮箱格式
 */
export function validateEmailFormat(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw TRPCErrorHandler.validationError('邮箱格式不正确');
  }
}

/**
 * 检查邮箱是否已被使用
 */
export async function checkEmailAvailability(email: string, ctx: any, excludeUserId?: string): Promise<void> {
  const existingUser = await ctx.db.user.findUnique({
    where: { email },
    select: { id: true, email: true }
  });

  if (existingUser && existingUser.id !== excludeUserId) {
    throw TRPCErrorHandler.businessError(
      'EMAIL_ALREADY_EXISTS' as any,
      '该邮箱地址已被其他用户使用',
      {
        context: {
          email,
          existingUserId: existingUser.id
        }
      }
    );
  }
}

/**
 * 验证令牌是否过期
 */
export function validateTokenExpiry(expiresAt: Date): void {
  if (expiresAt < new Date()) {
    throw TRPCErrorHandler.businessError(
      'TOKEN_EXPIRED' as any,
      '验证令牌已过期，请重新申请',
      {
        context: {
          expiresAt,
          currentTime: new Date()
        }
      }
    );
  }
}

/**
 * 验证用户状态
 */
export function validateUserStatus(user: any): void {
  if (!user) {
    throw TRPCErrorHandler.notFound('用户不存在');
  }

  if (user.emailVerified) {
    throw TRPCErrorHandler.businessError(
      'EMAIL_ALREADY_VERIFIED' as any,
      '邮箱已经验证过了',
      {
        context: {
          userId: user.id,
          email: user.email,
          verifiedAt: user.emailVerified
        }
      }
    );
  }
}

/**
 * 检查邮箱配置完整性
 */
export function checkEmailConfigCompleteness(): {
  configured: boolean;
  missingVars: string[];
} {
  const requiredEnvVars = [
    'COSEREEDEN_SMTP_HOST',
    'COSEREEDEN_SMTP_PORT',
    'COSEREEDEN_SMTP_USER',
    'COSEREEDEN_SMTP_PASS',
    'COSEREEDEN_SMTP_FROM'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  return {
    configured: missingVars.length === 0,
    missingVars
  };
}

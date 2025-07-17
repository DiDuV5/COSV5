/**
 * @fileoverview 密码管理模块
 * @description 处理密码重置、修改等相关逻辑
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { z } from "zod";
import { authProcedure } from "@/server/api/trpc";
import { turnstileProcedures } from "@/lib/security/turnstile-middleware";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * 忘记密码输入验证模式
 */
export const forgotPasswordInputSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  turnstileToken: z.string().optional(),
});

/**
 * 重置密码输入验证模式
 */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "重置令牌不能为空"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(100, "密码最多100个字符"),
  turnstileToken: z.string().optional(),
});

/**
 * 修改密码输入验证模式
 */
export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "当前密码不能为空"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(100, "密码最多100个字符"),
});

/**
 * 基础响应类型
 */
export interface BasicResponse {
  success: boolean;
  message: string;
}

/**
 * 处理忘记密码逻辑
 */
export async function processForgotPassword(
  prisma: PrismaClient,
  input: z.infer<typeof forgotPasswordInputSchema>
): Promise<BasicResponse> {
  // 查找用户
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      registrationStatus: 'COMPLETED'
    },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerified: true,
      isActive: true,
    },
  });

  // 为了安全，即使用户不存在也返回成功消息
  if (!user) {
    return {
      success: true,
      message: "如果该邮箱已注册，您将收到密码重置邮件",
    };
  }

  // 检查用户状态
  if (!user.isActive) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.ACCOUNT_DISABLED,
      "账户已被禁用，无法重置密码"
    );
  }

  if (!user.emailVerified) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.EMAIL_NOT_VERIFIED,
      "请先验证邮箱后再重置密码"
    );
  }

  // 生成重置令牌
  const resetToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

  // 删除旧的重置令牌
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: `password_reset:${input.email}`,
    },
  });

  // 创建新的重置令牌
  await prisma.verificationToken.create({
    data: {
      identifier: `password_reset:${input.email}`,
      token: resetToken,
      expires,
    },
  });

  // 发送重置邮件
  const { EmailTransportService } = await import('@/lib/email/services/email-transport-service');
  const resetUrl = `${process.env.COSEREEDEN_NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  const emailSent = await EmailTransportService.sendEmail({
    to: input.email,
    subject: 'CoserEden - 密码重置',
    html: `
      <h2>密码重置请求</h2>
      <p>您好 ${user.username}，</p>
      <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
      <p><a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">重置密码</a></p>
      <p>此链接将在1小时后过期。</p>
      <p>如果您没有请求重置密码，请忽略此邮件。</p>
    `,
    text: `您好 ${user.username}，请访问以下链接重置您的密码：${resetUrl} (此链接将在1小时后过期)`
  });

  if (!emailSent) {
    throw TRPCErrorHandler.internalError('密码重置邮件发送失败，请稍后重试');
  }

  return {
    success: true,
    message: "密码重置邮件已发送，请检查您的邮箱",
  };
}

/**
 * 处理重置密码逻辑
 */
export async function processResetPassword(
  prisma: PrismaClient,
  input: z.infer<typeof resetPasswordInputSchema>
): Promise<BasicResponse> {
  // 查找重置令牌
  const resetToken = await prisma.verificationToken.findUnique({
    where: { token: input.token },
  });

  if (!resetToken) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_TOKEN,
      "重置令牌无效或已被使用"
    );
  }

  // 检查令牌是否过期
  if (resetToken.expires < new Date()) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.TOKEN_EXPIRED,
      "重置令牌已过期，请重新申请密码重置"
    );
  }

  // 检查是否为密码重置令牌
  if (!resetToken.identifier.startsWith('password_reset:')) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_TOKEN,
      "无效的重置令牌类型"
    );
  }

  // 提取邮箱地址
  const email = resetToken.identifier.replace('password_reset:', '');

  // 查找用户
  const user = await prisma.user.findFirst({
    where: {
      email,
      registrationStatus: 'COMPLETED'
    },
    select: {
      id: true,
      email: true,
      username: true,
      isActive: true,
    },
  });

  if (!user) {
    throw TRPCErrorHandler.notFound("用户不存在");
  }

  if (!user.isActive) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.ACCOUNT_DISABLED,
      "账户已被禁用，无法重置密码"
    );
  }

  // 使用事务更新密码并删除令牌
  await prisma.$transaction(async (tx: any) => {
    // 更新密码
    const hashedPassword = await bcrypt.hash(input.newPassword, 12);
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // 删除重置令牌
    await tx.verificationToken.delete({
      where: { token: input.token },
    });

    // 删除该用户的所有其他重置令牌
    await tx.verificationToken.deleteMany({
      where: {
        identifier: `password_reset:${email}`,
      },
    });
  });

  return {
    success: true,
    message: "密码重置成功，请使用新密码登录",
  };
}

/**
 * 处理修改密码逻辑
 */
export async function processChangePassword(
  prisma: PrismaClient,
  userId: string,
  input: z.infer<typeof changePasswordInputSchema>
): Promise<BasicResponse> {
  // 验证当前密码
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.RESOURCE_NOT_FOUND,
      "用户不存在"
    );
  }

  const isValidPassword = await bcrypt.compare(input.currentPassword, user.passwordHash || '');
  if (!isValidPassword) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_CREDENTIALS,
      "当前密码错误"
    );
  }

  // 更新密码
  const hashedPassword = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  return { success: true, message: "密码修改成功" };
}

/**
 * 忘记密码路由定义
 */
export const forgotPasswordProcedure = turnstileProcedures.passwordReset
  .input(forgotPasswordInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await processForgotPassword(ctx.prisma, input);
    } catch (error) {
      console.error("密码重置失败:", {
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "密码重置过程中发生错误，请稍后重试"
      );
    }
  });

/**
 * 重置密码路由定义
 */
export const resetPasswordProcedure = turnstileProcedures.passwordReset
  .input(resetPasswordInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await processResetPassword(ctx.prisma, input);
    } catch (error) {
      console.error("重置密码失败:", {
        token: input.token.substring(0, 8) + "...", // 只记录部分token用于调试
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "重置密码过程中发生错误，请稍后重试"
      );
    }
  });

/**
 * 修改密码路由定义
 */
export const changePasswordProcedure = authProcedure
  .input(changePasswordInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await processChangePassword(ctx.prisma, ctx.session.user.id, input);
    } catch (error) {
      // 结构化日志记录
      console.error("修改密码失败:", {
        userId: ctx.session.user.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // 如果是已知的业务错误，直接抛出
      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      // 未知错误统一处理
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "修改密码失败，请稍后重试"
      );
    }
  });

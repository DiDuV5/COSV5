/**
 * @fileoverview 用户登录模块
 * @description 处理用户登录相关逻辑
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { UserLevel } from "@/types/user-level";
import * as bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import type { PrismaClient } from "@prisma/client";
import { createTurnstileMiddleware } from "@/lib/security/turnstile-middleware";
import { isEmailVerificationEnabled } from "./validation-helpers";

/**
 * 登录输入验证模式
 */
export const loginInputSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

/**
 * 带Turnstile验证的登录输入验证模式
 */
export const loginWithTurnstileInputSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
  turnstileToken: z.string().optional(),
});

/**
 * 登录响应类型
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    userLevel: string;
    emailVerified: Date | null;
    isActive: boolean;
    isVerified: boolean;
    canPublish: boolean;
    approvalStatus: string;
    avatarUrl?: string | null;
  };
  token: string;
}

/**
 * 处理用户登录逻辑
 */
export async function processUserLogin(
  prisma: PrismaClient,
  input: z.infer<typeof loginInputSchema>
): Promise<LoginResponse> {
  // 查找用户
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: input.username },
        { email: input.username },
      ],
    },
  });

  if (!user) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_CREDENTIALS,
      "用户名或密码错误"
    );
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash || '');
  if (!isValidPassword) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_CREDENTIALS,
      "用户名或密码错误"
    );
  }

  // 检查用户状态
  // 只有在启用邮箱验证功能时才检查邮箱验证状态
  const emailVerificationEnabled = await isEmailVerificationEnabled(prisma);
  if (emailVerificationEnabled && !user.emailVerified) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.EMAIL_NOT_VERIFIED,
      "请先验证邮箱后再登录"
    );
  }

  if (!user.isActive) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.ACCOUNT_DISABLED,
      "账户已被禁用，请联系管理员"
    );
  }

  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 生成JWT（与NextAuth.js保持一致的字段映射）
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      userLevel: user.userLevel as UserLevel,
      isVerified: user.isVerified,
      canPublish: user.canPublish || false,
      approvalStatus: user.approvalStatus || 'PENDING',
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.COSEREEDEN_NEXTAUTH_SECRET!,
  });

  return {
    success: true,
    message: "登录成功",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      userLevel: user.userLevel,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      isVerified: user.isVerified,
      canPublish: user.canPublish,
      approvalStatus: user.approvalStatus,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
}

/**
 * 登录路由定义（不带Turnstile验证）
 */
export const loginProcedure = publicProcedure
  .input(loginInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await processUserLogin(ctx.prisma, input);
    } catch (error) {
      // 结构化日志记录
      console.error("用户登录失败:", {
        username: input.username,
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
        "登录过程中发生错误，请稍后重试"
      );
    }
  });

/**
 * 带Turnstile验证的登录路由定义
 */
export const loginWithTurnstileProcedure = publicProcedure
  .use(createTurnstileMiddleware('USER_LOGIN'))
  .input(loginWithTurnstileInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      // 提取基本登录信息（排除turnstileToken）
      const { turnstileToken, ...loginInput } = input;
      return await processUserLogin(ctx.prisma, loginInput);
    } catch (error) {
      // 结构化日志记录
      console.error("用户登录失败（带Turnstile验证）:", {
        username: input.username,
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
        "登录过程中发生错误，请稍后重试"
      );
    }
  });

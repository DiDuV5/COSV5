/**
 * @fileoverview 认证路由器 - 重构版本
 * @description 集成所有认证相关的tRPC路由
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { turnstileProcedures } from "@/lib/security/turnstile-middleware";

// 导入模块化组件
import {
  registerInputSchema,
  checkUsernameInputSchema,
  checkEmailInputSchema,
  updateProfileInputSchema,
} from "./auth/types";

import {
  processUserRegistration,
  getUserProfile,
  getUserSessionInfo,
  updateUserProfile,
  loginProcedure,
  loginWithTurnstileProcedure,
  forgotPasswordProcedure,
  resetPasswordProcedure,
  changePasswordProcedure
} from "./auth/index";

import {
  validateUsernameAvailability,
  validateEmailAvailability,
} from "./auth/validation-helpers";

import {
  resendVerificationEmail,
} from "./auth/user-registration";

/**
 * 认证相关路由
 */
export const authRouter = createTRPCRouter({
  /**
   * 用户登录（不带Turnstile验证）
   */
  login: loginProcedure,

  /**
   * 用户登录（带Turnstile验证）
   */
  loginWithTurnstile: loginWithTurnstileProcedure,

  /**
   * 用户注册
   */
  register: turnstileProcedures.userRegister
    .input(registerInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await processUserRegistration(ctx.prisma, input);
      } catch (error) {
        // 结构化日志记录
        console.error("用户注册失败:", {
          username: input.username,
          email: input.email,
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
          "注册过程中发生错误，请稍后重试"
        );
      }
    }),

  /**
   * 检查用户名可用性
   */
  checkUsername: publicProcedure
    .input(checkUsernameInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await validateUsernameAvailability(ctx.prisma, input.username);
      } catch (error) {
        // 结构化日志记录
        console.error("检查用户名可用性失败:", {
          username: input.username,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INTERNAL_ERROR,
          "检查用户名可用性失败，请稍后重试"
        );
      }
    }),

  /**
   * 检查邮箱可用性
   */
  checkEmail: publicProcedure
    .input(checkEmailInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await validateEmailAvailability(ctx.prisma, input.email);
      } catch (error) {
        // 结构化日志记录
        console.error("检查邮箱可用性失败:", {
          email: input.email,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INTERNAL_ERROR,
          "检查邮箱可用性失败，请稍后重试"
        );
      }
    }),

  /**
   * 重新发送验证邮件
   */
  resendVerificationEmail: publicProcedure
    .input(z.object({
      email: z.string().email("请输入有效的邮箱地址"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resendVerificationEmail(ctx.prisma, input.email);
      } catch (error) {
        // 结构化日志记录
        console.error("重新发送验证邮件失败:", {
          email: input.email,
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
          "发送验证邮件失败，请稍后重试"
        );
      }
    }),

  /**
   * 忘记密码 - 发送重置邮件
   */
  forgotPassword: forgotPasswordProcedure,

  /**
   * 重置密码
   */
  resetPassword: resetPasswordProcedure,

  /**
   *   //   .input(confirmTelegramRegisterInputSchema)
  //   .mutation(async ({ ctx, input }) => {
  //     try {
  //       return await processTelegramRegisterConfirm(ctx.prisma, input);
  //     } catch (error) {
  //       console.error("Telegram注册确认失败:", error);
  //       throw error;
  //     }
  //   }),

  /**
   * 获取当前用户信息
   */
  me: authProcedure
    .query(async ({ ctx }) => {
      try {
        return await getUserProfile(ctx.prisma, ctx.session.user.id);
      } catch (error) {
        // 结构化日志记录
        console.error("获取用户信息失败:", {
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
          "获取用户信息失败，请稍后重试"
        );
      }
    }),

  /**
   * 获取用户会话信息（兼容旧版本）
   */
  getSession: authProcedure
    .query(async ({ ctx }) => {
      try {
        return await getUserSessionInfo(ctx.prisma, ctx.session.user.id);
      } catch (error) {
        // 结构化日志记录
        console.error("获取用户会话信息失败:", {
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
          "获取会话信息失败，请稍后重试"
        );
      }
    }),

  /**
   * 更新用户资料
   */
  updateProfile: authProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserProfile(ctx.prisma, ctx.session.user.id, input);
      } catch (error) {
        // 结构化日志记录
        console.error("更新用户资料失败:", {
          userId: ctx.session.user.id,
          updateFields: Object.keys(input),
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
          "更新用户资料失败，请稍后重试"
        );
      }
    }),

  /**
   * 修改密码
   */
  changePassword: changePasswordProcedure,

  // 兼容性方法：检查用户名可用性（别名）
  checkUsernameAvailability: publicProcedure
    .input(checkUsernameInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await validateUsernameAvailability(ctx.prisma, input.username);
      } catch (error) {
        // 结构化日志记录
        console.error("检查用户名可用性失败(兼容性方法):", {
          username: input.username,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INTERNAL_ERROR,
          "检查用户名可用性失败，请稍后重试"
        );
      }
    }),

  // 兼容性方法：获取当前用户（别名）
  getCurrentUser: authProcedure
    .query(async ({ ctx }) => {
      try {
        return await getUserProfile(ctx.prisma, ctx.session.user.id);
      } catch (error) {
        // 结构化日志记录
        console.error("获取当前用户信息失败(兼容性方法):", {
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
          "获取用户信息失败，请稍后重试"
        );
      }
    }),
});

/**
 * @fileoverview 系统设置相关的tRPC路由（重构版）
 * @description 处理系统设置管理，包括注册登录方式、邮箱配置等，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { z } from "zod";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, adminProcedure, publicProcedure } from "@/server/api/trpc";

// 导入重构后的服务
import {
  settingsBaseService,
  authSettingsService,
  emailSettingsService,
  // SETTING_CATEGORIES,
  type SettingItem
} from "./settings/services";

export const settingsRouter = createTRPCRouter({
  /**
   * 获取所有系统设置（重构版 - 使用基础服务）
   */
  getAllSettings: adminProcedure
    .input(z.object({
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const baseService = settingsBaseService(ctx.db);
      return await baseService.getAllSettings(input.category);
    }),

  /**
   * 获取认证相关设置（重构版 - 使用认证服务）
   */
  getAuthSettings: adminProcedure.query(async ({ ctx }) => {
    const authService = authSettingsService(ctx.db);
    return await authService.getAuthSettings();
  }),

  /**
   * 获取邮箱设置（重构版 - 使用邮箱服务）
   */
  getEmailSettings: adminProcedure.query(async ({ ctx }) => {
    const emailService = emailSettingsService(ctx.db);
    return await emailService.getEmailSettings();
  }),

  /**
   * 更新系统设置（重构版 - 使用基础服务）
   */
  updateSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.any(),
      description: z.string().optional(),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const baseService = settingsBaseService(ctx.db);

      // 验证设置值
      if (!baseService.validateSettingValue(input.key, input.value)) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          '设置值格式不正确'
        );
      }

      return await baseService.updateSetting(input as SettingItem);
    }),

  /**
   * 更新认证设置（重构版 - 使用认证服务）
   */
  updateAuthSettings: adminProcedure
    .input(z.object({
      enableEmailVerification: z.boolean().optional(),
      usernameMinLength: z.number().min(1).max(20).optional(),
      passwordMinLength: z.number().min(1).max(50).optional(),
      passwordRequireUppercase: z.boolean().optional(),
      passwordRequireLowercase: z.boolean().optional(),
      passwordRequireNumbers: z.boolean().optional(),
      passwordRequireSymbols: z.boolean().optional(),
      loginPageNotice: z.string().optional(),
      registerPageNotice: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const authService = authSettingsService(ctx.db);
      return await authService.updateAuthSettings(input);
    }),

  /**
   * 更新邮箱设置（重构版 - 使用邮箱服务）
   */
  updateEmailSettings: adminProcedure
    .input(z.object({
      smtpHost: z.string().optional(),
      smtpPort: z.number().min(1).max(65535).optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpFromName: z.string().optional(),
      smtpFromEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const emailService = emailSettingsService(ctx.db);
      return await emailService.updateEmailSettings(input);
    }),

  /**
   * 测试邮箱连接（重构版 - 使用邮箱服务）
   */
  testEmailConnection: adminProcedure
    .input(z.object({
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpFromName: z.string().optional(),
      smtpFromEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const emailService = emailSettingsService(ctx.db);

      // 如果提供了测试设置，使用测试设置；否则使用当前设置
      const testSettings = Object.keys(input || {}).length > 0 ? {
        smtpHost: input?.smtpHost || "",
        smtpPort: input?.smtpPort || 587,
        smtpUser: input?.smtpUser || "",
        smtpPassword: input?.smtpPassword || "",
        smtpFromName: input?.smtpFromName || "Test",
        smtpFromEmail: input?.smtpFromEmail || "",
      } : undefined;

      return await emailService.testEmailConnection(testSettings);
    }),

  /**
   * 发送测试邮件
   */
  sendTestEmail: adminProcedure
    .input(z.object({
      to: z.string().email("请输入有效的邮箱地址"),
      subject: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const emailService = emailSettingsService(ctx.db);

      return await emailService.sendTestEmail({
        to: input.to,
        subject: input.subject || "CoserEden 邮箱配置测试",
        content: input.content || "这是一封测试邮件，用于验证 CoserEden 邮箱配置是否正确。如果您收到此邮件，说明邮箱配置成功！",
      });
    }),



  /**
   * 获取公开设置（重构版 - 使用基础服务）
   */
  getPublicSettings: publicProcedure.query(async ({ ctx }) => {
    const baseService = settingsBaseService(ctx.db);
    return await baseService.getPublicSettings();
  }),

  /**
   * 重置设置为默认值（重构版 - 使用基础服务）
   */
  resetSetting: adminProcedure
    .input(z.object({
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const baseService = settingsBaseService(ctx.db);
      return await baseService.resetSetting(input.key);
    }),

  /**
   * 重置认证设置（重构版 - 使用认证服务）
   */
  resetAuthSettings: adminProcedure.mutation(async ({ ctx }) => {
    const authService = authSettingsService(ctx.db);
    return await authService.resetAuthSettings();
  }),

  /**
   * 重置邮箱设置（重构版 - 使用邮箱服务）
   */
  resetEmailSettings: adminProcedure.mutation(async ({ ctx }) => {
    const emailService = emailSettingsService(ctx.db);
    return await emailService.resetEmailSettings();
  }),

  /**
   * 验证密码复杂度（新增 - 使用认证服务）
   */
  validatePassword: publicProcedure
    .input(z.object({
      password: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const authService = authSettingsService(ctx.db);
      return await authService.validatePasswordComplexity(input.password);
    }),

  /**
   * 验证用户名长度（新增 - 使用认证服务）
   */
  validateUsername: publicProcedure
    .input(z.object({
      username: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const authService = authSettingsService(ctx.db);
      return await authService.validateUsernameLength(input.username);
    }),

  /**
   * 获取邮箱设置状态（新增 - 使用邮箱服务）
   */
  getEmailSettingsStatus: adminProcedure.query(async ({ ctx }) => {
    const emailService = emailSettingsService(ctx.db);
    return await emailService.getEmailSettingsStatus();
  }),

  /**
   * 删除设置（新增 - 使用基础服务）
   */
  deleteSetting: adminProcedure
    .input(z.object({
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const baseService = settingsBaseService(ctx.db);
      await baseService.deleteSetting(input.key);
      return { success: true, message: '设置已删除' };
    }),
});

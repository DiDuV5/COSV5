/**
 * @fileoverview 用户审批配置路由模块
 * @description 处理审批配置相关的路由逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { createTRPCRouter, adminProcedure, publicProcedure } from "@/server/api/trpc";
import { updateApprovalConfigInputSchema } from "../schemas";
import { getApprovalConfiguration, updateApprovalConfiguration } from '../config-handler';
import { ApprovalConfigManager } from '@/lib/approval/approval-config-manager';
import { ApprovalErrorHandler } from '../middleware/error-handler';
import { z } from 'zod';

/**
 * 配置管理路由
 */
export const configRoutes = createTRPCRouter({
  /**
   * 获取审核配置（公开访问，用于显示审核状态）
   */
  getApprovalConfig: publicProcedure
    .query(async ({ ctx }) => {
      try {
        return await getApprovalConfiguration(ctx.db);
      } catch (error) {
        ApprovalErrorHandler.handleGenericError(
          error,
          'getApprovalConfig',
          '获取审核配置失败'
        );
      }
    }),

  /**
   * 更新审核配置（管理员）
   */
  updateApprovalConfig: adminProcedure
    .input(updateApprovalConfigInputSchema)
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;

      try {
        return await updateApprovalConfiguration(ctx.db, null, input, adminId);
      } catch (error) {
        ApprovalErrorHandler.handleGenericError(
          error,
          'updateApprovalConfig',
          '更新审核配置失败'
        );
      }
    }),

  /**
   * 获取增强的审批配置
   */
  getEnhancedConfig: adminProcedure
    .output(z.object({
      config: z.object({
        registrationApprovalEnabled: z.boolean(),
        notificationEnabled: z.boolean(),
        autoApproveAdmin: z.boolean(),
        timeoutHours: z.number(),
        autoRejectTimeout: z.boolean(),
        batchSizeLimit: z.number(),
      }),
      integrity: z.object({
        valid: z.boolean(),
        missingKeys: z.array(z.string()),
        invalidValues: z.array(z.string()),
      }),
    }))
    .query(async ({ ctx: _ctx }) => {
      try {
        const [config, integrity] = await Promise.all([
          ApprovalConfigManager.getConfig(),
          ApprovalConfigManager.validateConfigIntegrity(),
        ]);

        return { config, integrity };
      } catch (error) {
        console.error('获取增强审批配置失败:', error);
        ApprovalErrorHandler.handleGenericError(
          error,
          'getEnhancedConfig',
          '获取增强审批配置失败'
        );
      }
    }),

  /**
   * 更新增强的审批配置
   */
  updateEnhancedConfig: adminProcedure
    .input(z.object({
      registrationApprovalEnabled: z.boolean().optional(),
      notificationEnabled: z.boolean().optional(),
      autoApproveAdmin: z.boolean().optional(),
      timeoutHours: z.number().min(1).max(168).optional(),
      autoRejectTimeout: z.boolean().optional(),
      batchSizeLimit: z.number().min(1).max(100).optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ApprovalConfigManager.updateConfig(input, ctx.user.id);
      } catch (error: unknown) {
        ApprovalErrorHandler.handleConfigUpdateError(error, {
          configInput: input,
          adminId: ctx.user.id,
          operation: 'updateEnhancedConfig'
        });
      }
    }),

  /**
   * 初始化缺失的配置
   */
  initializeMissingConfigs: adminProcedure
    .output(z.object({
      success: z.boolean(),
      initialized: z.array(z.string()),
    }))
    .mutation(async ({ ctx: _ctx }) => {
      try {
        return await ApprovalConfigManager.initializeMissingConfigs();
      } catch (error) {
        console.error('初始化配置失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        ApprovalErrorHandler.handleGenericError(
          error,
          'initializeMissingConfigs',
          '初始化配置失败'
        );
      }
    }),
});

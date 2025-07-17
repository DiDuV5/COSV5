/**
 * @fileoverview Turnstile管理API路由
 * @description 提供Turnstile功能管理和统计的API端点
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { turnstileFeatureManager } from "@/lib/security/turnstile-server-config";
import { turnstileValidator } from "@/lib/security/turnstile-validator";
import {
  TURNSTILE_FEATURES,
  type TurnstileFeatureId,
  type TurnstileAdminConfig,
  type TurnstileStats
} from "@/types/turnstile";

/**
 * Turnstile管理路由
 */
export const turnstileRouter = createTRPCRouter({
  /**
   * 获取所有功能状态（公开API，游客也可访问）
   */
  getFeatureStates: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const states = await turnstileFeatureManager.getAllFeatureStates();

        // 构建详细的功能配置信息
        const features: Record<TurnstileFeatureId, TurnstileAdminConfig> = {} as any;

        for (const [featureId, featureConfig] of Object.entries(TURNSTILE_FEATURES)) {
          features[featureId as TurnstileFeatureId] = {
            id: featureId,
            name: featureConfig.name,
            description: featureConfig.description,
            enabled: states[featureId as TurnstileFeatureId] || false,
            path: featureConfig.path,
            apiEndpoint: featureConfig.apiEndpoint,
            priority: featureConfig.priority,
            updatedAt: new Date(),
            updatedBy: ctx.session?.user?.id || 'system',
          };
        }

        return {
          features,
          globalEnabled: process.env.COSEREEDEN_TURNSTILE_ENABLED !== 'false',
          totalFeatures: Object.keys(TURNSTILE_FEATURES).length,
          enabledCount: Object.values(states).filter(Boolean).length,
        };
      } catch (error) {
        console.error('获取Turnstile功能状态失败:', error);
        throw TRPCErrorHandler.internalError('获取功能状态失败');
      }
    }),

  /**
   * 启用功能
   */
  enableFeature: adminProcedure
    .input(z.object({
      featureId: z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await turnstileFeatureManager.enableFeature(input.featureId, ctx.session.user.id);

        return {
          success: true,
          message: `功能 ${TURNSTILE_FEATURES[input.featureId].name} 已启用`,
          featureId: input.featureId,
          enabled: true,
        };
      } catch (error) {
        console.error(`启用Turnstile功能失败: ${input.featureId}`, error);
        throw TRPCErrorHandler.internalError('启用功能失败');
      }
    }),

  /**
   * 禁用功能
   */
  disableFeature: adminProcedure
    .input(z.object({
      featureId: z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await turnstileFeatureManager.disableFeature(input.featureId, ctx.session.user.id);

        return {
          success: true,
          message: `功能 ${TURNSTILE_FEATURES[input.featureId].name} 已禁用`,
          featureId: input.featureId,
          enabled: false,
        };
      } catch (error) {
        console.error(`禁用Turnstile功能失败: ${input.featureId}`, error);
        throw TRPCErrorHandler.internalError('禁用功能失败');
      }
    }),

  /**
   * 批量更新功能状态
   */
  updateFeatureStates: adminProcedure
    .input(z.object({
      updates: z.record(
        z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]),
        z.boolean()
      ),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await turnstileFeatureManager.updateFeatureStates(
          input.updates as Partial<Record<TurnstileFeatureId, boolean>>,
          ctx.session.user.id
        );

        const updatedCount = Object.keys(input.updates).length;
        const enabledCount = Object.values(input.updates).filter(Boolean).length;

        return {
          success: true,
          message: `已更新 ${updatedCount} 个功能状态（${enabledCount} 个启用，${updatedCount - enabledCount} 个禁用）`,
          updatedFeatures: input.updates,
        };
      } catch (error) {
        console.error('批量更新Turnstile功能状态失败:', error);
        throw TRPCErrorHandler.internalError('批量更新功能状态失败');
      }
    }),

  /**
   * 获取验证统计数据
   */
  getStats: adminProcedure
    .input(z.object({
      featureId: z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]).optional(),
      timeRange: z.enum(['today', 'week', 'month', 'all']).default('all'),
    }))
    .query(async ({ input }) => {
      try {
        // TODO: 从数据库获取真实的统计数据
        // 这里返回模拟数据，实际应该从数据库查询
        const mockStats: TurnstileStats = {
          featureId: input.featureId || 'all',
          totalVerifications: 1234,
          successfulVerifications: 1215,
          failedVerifications: 19,
          successRate: 98.5,
          todayVerifications: 156,
          weekVerifications: 892,
          monthVerifications: 3456,
          lastVerification: new Date(),
        };

        return mockStats;
      } catch (error) {
        console.error('获取Turnstile统计数据失败:', error);
        throw TRPCErrorHandler.internalError('获取统计数据失败');
      }
    }),

  /**
   * 获取验证日志
   */
  getLogs: adminProcedure
    .input(z.object({
      featureId: z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      success: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      try {
        // TODO: 从数据库获取真实的日志数据
        // 这里返回模拟数据，实际应该从数据库查询
        const mockLogs = Array.from({ length: input.limit }, (_, i) => ({
          id: `log-${i + input.offset}`,
          featureId: input.featureId || 'user_register',
          userId: i % 3 === 0 ? `user-${i}` : undefined,
          ipAddress: `192.168.1.${100 + (i % 50)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          success: input.success !== undefined ? input.success : Math.random() > 0.1,
          errorMessage: Math.random() > 0.9 ? '验证超时' : undefined,
          timestamp: new Date(Date.now() - i * 60000),
          responseTime: Math.floor(Math.random() * 500) + 50,
        }));

        return {
          logs: mockLogs,
          total: 1000, // 模拟总数
          hasMore: input.offset + input.limit < 1000,
        };
      } catch (error) {
        console.error('获取Turnstile验证日志失败:', error);
        throw TRPCErrorHandler.internalError('获取验证日志失败');
      }
    }),

  /**
   * 系统健康检查
   */
  healthCheck: adminProcedure
    .query(async () => {
      try {
        const healthResult = await turnstileValidator.healthCheck();

        return {
          ...healthResult,
          timestamp: new Date(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          globalEnabled: process.env.COSEREEDEN_TURNSTILE_ENABLED !== 'false',
        };
      } catch (error) {
        console.error('Turnstile健康检查失败:', error);
        throw TRPCErrorHandler.internalError('健康检查失败');
      }
    }),

  /**
   * 获取配置信息
   */
  getConfig: adminProcedure
    .query(async () => {
      try {
        const config = {
          siteKey: process.env.COSEREEDEN_TURNSTILE_SITE_KEY || '',
          enabled: process.env.COSEREEDEN_TURNSTILE_ENABLED !== 'false',
          verifyEndpoint: process.env.COSEREEDEN_TURNSTILE_VERIFY_ENDPOINT || 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          features: TURNSTILE_FEATURES,
        };

        // 隐藏敏感信息
        return {
          ...config,
          siteKey: config.siteKey ? config.siteKey.substring(0, 10) + '...' : '未配置',
          secretKey: '***隐藏***',
        };
      } catch (error) {
        console.error('获取Turnstile配置失败:', error);
        throw TRPCErrorHandler.internalError('获取配置失败');
      }
    }),

  /**
   * 测试验证功能
   */
  testVerification: adminProcedure
    .input(z.object({
      featureId: z.enum(Object.keys(TURNSTILE_FEATURES) as [TurnstileFeatureId, ...TurnstileFeatureId[]]),
      testToken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // 使用测试token进行验证
        const testToken = input.testToken || 'test-token-for-admin-testing';
        const result = await turnstileValidator.validateToken(
          testToken,
          '127.0.0.1',
          input.featureId
        );

        return {
          success: result.success,
          message: result.success ? '验证功能正常' : `验证失败: ${result.errorMessage}`,
          details: {
            responseTime: result.responseTime,
            errorCode: result.errorCode,
            timestamp: result.timestamp,
          },
        };
      } catch (error) {
        console.error(`测试Turnstile验证失败: ${input.featureId}`, error);
        throw TRPCErrorHandler.internalError('测试验证失败');
      }
    }),

  /**
   * 启用所有功能
   */
  enableAllFeatures: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log(`🔓 管理员 ${ctx.session.user.username} (${ctx.session.user.id}) 请求批量启用所有Turnstile功能`);

        const result = await turnstileFeatureManager.enableAllFeatures(ctx.session.user.id);

        if (result.success) {
          console.log(`✅ 批量启用成功: ${result.enabledCount}/${result.totalCount} 个功能已启用`);
          return {
            success: true,
            message: `成功启用 ${result.enabledCount} 个Turnstile功能`,
            data: {
              enabledCount: result.enabledCount,
              totalCount: result.totalCount,
              errors: result.errors
            }
          };
        } else {
          console.warn(`⚠️ 批量启用部分失败: ${result.errors.length} 个错误`);
          return {
            success: false,
            message: `批量启用部分失败，成功 ${result.enabledCount}/${result.totalCount} 个功能`,
            data: {
              enabledCount: result.enabledCount,
              totalCount: result.totalCount,
              errors: result.errors
            }
          };
        }
      } catch (error) {
        console.error('批量启用Turnstile功能失败:', error);
        throw TRPCErrorHandler.internalError('批量启用功能失败，请检查系统日志');
      }
    }),

  /**
   * 禁用所有功能
   */
  disableAllFeatures: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log(`🔒 管理员 ${ctx.session.user.username} (${ctx.session.user.id}) 请求批量禁用所有Turnstile功能`);

        const result = await turnstileFeatureManager.disableAllFeatures(ctx.session.user.id);

        if (result.success) {
          console.log(`✅ 批量禁用成功: ${result.disabledCount}/${result.totalCount} 个功能已禁用`);
          return {
            success: true,
            message: `成功禁用 ${result.disabledCount} 个Turnstile功能`,
            data: {
              disabledCount: result.disabledCount,
              totalCount: result.totalCount,
              errors: result.errors
            }
          };
        } else {
          console.warn(`⚠️ 批量禁用部分失败: ${result.errors.length} 个错误`);
          return {
            success: false,
            message: `批量禁用部分失败，成功 ${result.disabledCount}/${result.totalCount} 个功能`,
            data: {
              disabledCount: result.disabledCount,
              totalCount: result.totalCount,
              errors: result.errors
            }
          };
        }
      } catch (error) {
        console.error('批量禁用Turnstile功能失败:', error);
        throw TRPCErrorHandler.internalError('批量禁用功能失败，请检查系统日志');
      }
    }),
});

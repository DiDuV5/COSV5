/**
 * @fileoverview 罐头系统配置路由
 * @description 处理管理员配置管理功能
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  getConfigSchema,
  updateConfigSchema,
  batchUpdateConfigsSchema,
  resetConfigSchema,
  getConfigHistorySchema,
  rollbackConfigSchema,
} from "./schemas/cans-input-schemas";
import { DEFAULT_CONFIGS } from "./utils/cans-utils";

export const cansConfigRouter = createTRPCRouter({
  /**
   * 获取系统配置（管理员）
   */
  getConfig: adminProcedure
    .input(getConfigSchema)
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel: input.userLevel },
      });

      if (!config) {
        // 返回默认配置
        const defaultConfig = DEFAULT_CONFIGS[input.userLevel as keyof typeof DEFAULT_CONFIGS];
        if (!defaultConfig) {
          throw TRPCErrorHandler.notFound(`用户等级 ${input.userLevel} 的配置不存在`);
        }

        return {
          userLevel: input.userLevel,
          ...defaultConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return config;
    }),

  /**
   * 获取所有配置（管理员）
   */
  getAllConfigs: adminProcedure.query(async ({ ctx }) => {
    const configs = await ctx.db.cansSystemConfig.findMany({
      orderBy: { userLevel: 'asc' },
    });

    // 确保所有用户等级都有配置
    const userLevels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
    const configMap = configs.reduce((acc: any, config: any) => {
      acc[config.userLevel] = config;
      return acc;
    }, {} as Record<string, any>);

    const allConfigs = userLevels.map(level => {
      if (configMap[level]) {
        return configMap[level];
      }

      // 返回默认配置
      const defaultConfig = DEFAULT_CONFIGS[level as keyof typeof DEFAULT_CONFIGS];
      return {
        userLevel: level,
        ...defaultConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    return allConfigs;
  }),

  /**
   * 更新配置（管理员）
   */
  updateConfig: adminProcedure
    .input(updateConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { userLevel, reason, ...configData } = input;
      const adminId = ctx.session.user.id;

      // 获取当前配置用于记录历史
      const currentConfig = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel },
      });

      // 更新或创建配置
      const updatedConfig = await ctx.db.cansSystemConfig.upsert({
        where: { userLevel },
        update: configData,
        create: {
          userLevel,
          ...configData,
        },
      });

      // 记录配置历史
      await ctx.db.cansConfigHistory.create({
        data: {
          userLevel,
          newConfig: JSON.stringify(updatedConfig),
          oldConfig: currentConfig ? JSON.stringify(currentConfig) : '{}',
          changedBy: adminId,
          reason: reason || '管理员更新配置',
          changeType: currentConfig ? 'UPDATE' : 'CREATE',
        },
      });

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE_CANS_CONFIG',
          message: `更新 ${userLevel} 等级的罐头系统配置${reason ? ` - ${reason}` : ''}`,
          resource: 'CANS_CONFIG',
          resourceId: updatedConfig.id,
          details: JSON.stringify({
            userLevel,
            changes: configData,
            reason,
          }),
        },
      });

      return {
        success: true,
        message: `${userLevel} 等级配置更新成功`,
        config: updatedConfig,
      };
    }),

  /**
   * 批量更新配置（管理员）
   */
  batchUpdateConfigs: adminProcedure
    .input(batchUpdateConfigsSchema)
    .mutation(async ({ ctx, input }) => {
      const { configs, reason } = input;
      const adminId = ctx.session.user.id;

      const results: any[] = [];
      const errors: any[] = [];

      for (const configData of configs) {
        try {
          const { userLevel, ...updateData } = configData;

          // 获取当前配置
          const currentConfig = await ctx.db.cansSystemConfig.findUnique({
            where: { userLevel },
          });

          // 更新配置
          const updatedConfig = await ctx.db.cansSystemConfig.upsert({
            where: { userLevel },
            update: updateData,
            create: {
              userLevel,
              ...updateData,
            },
          });

          // 记录配置历史
          await ctx.db.cansConfigHistory.create({
            data: {
              userLevel,
              newConfig: JSON.stringify(updatedConfig),
              oldConfig: currentConfig ? JSON.stringify(currentConfig) : '{}',
              changedBy: adminId,
              reason: reason || '批量更新配置',
              changeType: currentConfig ? 'UPDATE' : 'CREATE',
            },
          });

          results.push(updatedConfig);
        } catch (error) {
          errors.push({
            userLevel: configData.userLevel,
            error: error instanceof Error ? error.message : '更新失败',
          });
        }
      }

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'BATCH_UPDATE_CANS_CONFIG',
          message: `批量更新罐头系统配置 (成功: ${results.length}, 失败: ${errors.length})${reason ? ` - ${reason}` : ''}`,
          resource: 'CANS_CONFIG',
          details: JSON.stringify({
            successCount: results.length,
            errorCount: errors.length,
            errors,
            reason,
          }),
        },
      });

      return {
        success: true,
        message: `批量更新完成，成功 ${results.length} 个，失败 ${errors.length} 个`,
        results,
        errors,
      };
    }),

  /**
   * 重置配置为默认值（管理员）
   */
  resetConfig: adminProcedure
    .input(resetConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { userLevel } = input;
      const adminId = ctx.session.user.id;

      const defaultConfig = DEFAULT_CONFIGS[userLevel as keyof typeof DEFAULT_CONFIGS];
      if (!defaultConfig) {
        throw TRPCErrorHandler.validationError(`用户等级 ${userLevel} 没有默认配置`);
      }

      // 获取当前配置
      const currentConfig = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel },
      });

      // 重置为默认配置
      const resetConfig = await ctx.db.cansSystemConfig.upsert({
        where: { userLevel },
        update: defaultConfig,
        create: {
          userLevel,
          ...defaultConfig,
        },
      });

      // 记录配置历史
      await ctx.db.cansConfigHistory.create({
        data: {
          userLevel,
          newConfig: JSON.stringify(resetConfig),
          oldConfig: currentConfig ? JSON.stringify(currentConfig) : '{}',
          changedBy: adminId,
          reason: '重置为默认配置',
          changeType: 'RESET',
        },
      });

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'RESET_CANS_CONFIG',
          message: `重置 ${userLevel} 等级的罐头系统配置为默认值`,
          resource: 'CANS_CONFIG',
          resourceId: resetConfig.id,
          details: JSON.stringify({
            userLevel,
            defaultConfig,
          }),
        },
      });

      return {
        success: true,
        message: `${userLevel} 等级配置已重置为默认值`,
        config: resetConfig,
      };
    }),

  /**
   * 获取配置历史（管理员）
   */
  getConfigHistory: adminProcedure
    .input(getConfigHistorySchema)
    .query(async ({ ctx, input }) => {
      const { userLevel, limit, cursor } = input;

      const where: any = {};
      if (userLevel) {
        where.userLevel = userLevel;
      }
      if (cursor) {
        where.id = { lt: cursor };
      }

      const history = await ctx.db.cansConfigHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          changedByUser: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (history.length > limit) {
        const nextItem = history.pop();
        nextCursor = nextItem!.id;
      }

      return {
        history,
        nextCursor,
      };
    }),

  /**
   * 回滚配置（管理员）
   */
  rollbackConfig: adminProcedure
    .input(rollbackConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { historyId, reason } = input;
      const adminId = ctx.session.user.id;

      // 获取历史记录
      const historyRecord = await ctx.db.cansConfigHistory.findUnique({
        where: { id: historyId },
      });

      if (!historyRecord) {
        throw TRPCErrorHandler.notFound("配置历史记录不存在");
      }

      if (!historyRecord.oldConfig) {
        throw TRPCErrorHandler.validationError("该记录没有可回滚的配置数据");
      }

      // 解析配置数据
      const configToRestore = JSON.parse(historyRecord.oldConfig);
      const { userLevel, id, createdAt, updatedAt, ...configData } = configToRestore;

      // 获取当前配置
      const currentConfig = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel: historyRecord.userLevel },
      });

      // 回滚配置
      const rolledBackConfig = await ctx.db.cansSystemConfig.update({
        where: { userLevel: historyRecord.userLevel },
        data: configData,
      });

      // 记录配置历史
      await ctx.db.cansConfigHistory.create({
        data: {
          userLevel: historyRecord.userLevel,
          newConfig: JSON.stringify(rolledBackConfig),
          oldConfig: currentConfig ? JSON.stringify(currentConfig) : '{}',
          changedBy: adminId,
          reason: reason || `回滚到历史记录 ${historyId}`,
          changeType: 'ROLLBACK',
        },
      });

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'ROLLBACK_CANS_CONFIG',
          message: `回滚 ${historyRecord.userLevel} 等级的罐头系统配置${reason ? ` - ${reason}` : ''}`,
          resource: 'CANS_CONFIG',
          resourceId: rolledBackConfig.id,
          details: JSON.stringify({
            userLevel: historyRecord.userLevel,
            historyId,
            reason,
          }),
        },
      });

      return {
        success: true,
        message: `${historyRecord.userLevel} 等级配置回滚成功`,
        config: rolledBackConfig,
      };
    }),
});

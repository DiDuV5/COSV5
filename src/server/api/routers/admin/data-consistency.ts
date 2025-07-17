/**
 * @fileoverview 管理员数据一致性检查路由
 * @description 提供数据一致性检查和修复功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { DataConsistencyChecker } from '@/lib/database/data-consistency-checker';

/**
 * 数据一致性检查输入Schema
 */
const checkConsistencyInputSchema = z.object({
  /** 检查类型 */
  checkType: z.enum(['all', 'counts', 'email', 'orphaned']).default('all'),
  /** 是否自动修复 */
  autoFix: z.boolean().default(false),
  /** 限制检查的记录数 */
  limit: z.number().min(1).max(1000).default(100),
});

/**
 * 修复数据一致性输入Schema
 */
const fixConsistencyInputSchema = z.object({
  /** 修复类型 */
  fixType: z.enum(['counts', 'email', 'all']).default('counts'),
  /** 是否强制修复 */
  force: z.boolean().default(false),
});

/**
 * 数据一致性管理路由
 */
export const dataConsistencyRouter = createTRPCRouter({
  /**
   * 检查数据一致性
   */
  checkConsistency: adminProcedure
    .input(checkConsistencyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const checker = new DataConsistencyChecker(ctx.db);

        // 记录操作日志
        await ctx.db.auditLog.create({
          data: {
            action: 'DATA_CONSISTENCY_CHECK',
            userId: ctx.session.user.id,
            message: `管理员 ${ctx.session.user.username} 执行数据一致性检查`,
            level: 'INFO',
            ipAddress: ctx.req?.ip || 'unknown',
            userAgent: ctx.req?.headers['user-agent'] || 'unknown',
            metadata: {
              checkType: input.checkType,
              autoFix: input.autoFix,
              limit: input.limit,
            },
          },
        });

        // 执行一致性检查
        const result = await checker.checkAllConsistency();

        // 如果启用自动修复且存在问题
        if (input.autoFix && !result.isConsistent) {
          const fixResult = await checker.autoFixCountMismatches();

          // 记录修复结果
          await ctx.db.auditLog.create({
            data: {
              action: 'DATA_CONSISTENCY_AUTO_FIX',
              userId: ctx.session.user.id,
              message: `自动修复了 ${fixResult.fixed} 个数据一致性问题`,
              level: fixResult.errors.length > 0 ? 'WARN' : 'INFO',
              metadata: {
                fixedCount: fixResult.fixed,
                errors: fixResult.errors,
              },
            },
          });

          return {
            ...result,
            autoFixResult: fixResult,
          };
        }

        return result;
      } catch (error) {
        // 记录错误日志
        await ctx.db.auditLog.create({
          data: {
            action: 'DATA_CONSISTENCY_CHECK_ERROR',
            userId: ctx.session.user.id,
            message: `数据一致性检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
            level: 'ERROR',
            metadata: {
              error: error instanceof Error ? error.stack : String(error),
            },
          },
        });

        throw TRPCErrorHandler.internalError(
          '数据一致性检查失败'
        );
      }
    }),

  /**
   * 修复数据一致性问题
   */
  fixConsistency: adminProcedure
    .input(fixConsistencyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const checker = new DataConsistencyChecker(ctx.db);

        // 记录操作日志
        await ctx.db.auditLog.create({
          data: {
            action: 'DATA_CONSISTENCY_FIX_START',
            userId: ctx.session.user.id,
            message: `管理员 ${ctx.session.user.username} 开始修复数据一致性问题`,
            level: 'INFO',
            metadata: {
              fixType: input.fixType,
              force: input.force,
            },
          },
        });

        const fixResult = { fixed: 0, errors: [] as string[] };

        if (input.fixType === 'counts' || input.fixType === 'all') {
          // 修复计数不一致问题
          const countFixResult = await checker.autoFixCountMismatches();
          fixResult.fixed += countFixResult.fixed;
          fixResult.errors.push(...countFixResult.errors);
        }

        if (input.fixType === 'email' || input.fixType === 'all') {
          // 修复邮箱验证状态不一致
          const emailFixed = await ctx.db.user.updateMany({
            where: {
              isVerified: true,
              OR: [
                { email: null },
                { email: '' },
              ],
            },
            data: {
              isVerified: false,
              updatedAt: new Date(),
            },
          });
          fixResult.fixed += emailFixed.count;
        }

        // 记录修复完成日志
        await ctx.db.auditLog.create({
          data: {
            action: 'DATA_CONSISTENCY_FIX_COMPLETE',
            userId: ctx.session.user.id,
            message: `数据一致性修复完成，共修复 ${fixResult.fixed} 个问题`,
            level: fixResult.errors.length > 0 ? 'WARN' : 'INFO',
            metadata: {
              fixedCount: fixResult.fixed,
              errors: fixResult.errors,
              fixType: input.fixType,
            },
          },
        });

        return {
          success: true,
          fixed: fixResult.fixed,
          errors: fixResult.errors,
          message: `成功修复 ${fixResult.fixed} 个数据一致性问题`,
        };
      } catch (error) {
        // 记录错误日志
        await ctx.db.auditLog.create({
          data: {
            action: 'DATA_CONSISTENCY_FIX_ERROR',
            userId: ctx.session.user.id,
            message: `数据一致性修复失败: ${error instanceof Error ? error.message : '未知错误'}`,
            level: 'ERROR',
            metadata: {
              error: error instanceof Error ? error.stack : String(error),
              fixType: input.fixType,
            },
          },
        });

        throw TRPCErrorHandler.internalError(
          '数据一致性修复失败'
        );
      }
    }),

  /**
   * 获取数据一致性统计
   */
  getConsistencyStats: adminProcedure.query(async ({ ctx }) => {
    try {
      // 获取基础统计信息
      const [
        totalUsers,
        totalPosts,
        totalComments,
        totalLikes,
        totalFollows,
      ] = await Promise.all([
        ctx.db.user.count(),
        ctx.db.post.count(),
        ctx.db.comment.count({ where: { isDeleted: false } }),
        ctx.db.like.count(),
        ctx.db.follow.count(),
      ]);

      // 检查最近的一致性检查记录
      const lastCheck = await ctx.db.auditLog.findFirst({
        where: {
          action: {
            in: ['DATA_CONSISTENCY_CHECK', 'DATA_CONSISTENCY_FIX_COMPLETE'],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          action: true,
          message: true,
          metadata: true,
        },
      });

      return {
        stats: {
          totalUsers,
          totalPosts,
          totalComments,
          totalLikes,
          totalFollows,
        },
        lastCheck: lastCheck ? {
          date: lastCheck.createdAt,
          action: lastCheck.action,
          message: lastCheck.message,
          metadata: lastCheck.metadata,
        } : null,
        recommendations: [
          '建议每周执行一次数据一致性检查',
          '发现问题时及时修复以保证数据质量',
          '监控触发器是否正常工作',
          '定期备份数据库以防意外',
        ],
      };
    } catch (error) {
      throw TRPCErrorHandler.internalError(
        '获取数据一致性统计失败'
      );
    }
  }),

  /**
   * 验证数据库触发器状态
   */
  checkTriggerStatus: adminProcedure.query(async ({ ctx }) => {
    try {
      // 检查触发器是否存在
      const triggers = await ctx.db.$queryRaw<any[]>`
        SELECT
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE '%update%count%'
        ORDER BY trigger_name;
      `;

      const expectedTriggers = [
        'trigger_update_user_posts_count',
        'trigger_update_user_follow_count',
        'trigger_update_like_count',
        'trigger_update_comment_count',
      ];

      const existingTriggers = triggers.map((t: any) => t.trigger_name);
      const missingTriggers = expectedTriggers.filter(
        name => !existingTriggers.includes(name)
      );

      return {
        triggers,
        status: missingTriggers.length === 0 ? 'healthy' : 'incomplete',
        missingTriggers,
        recommendations: missingTriggers.length > 0
          ? [`缺少触发器: ${missingTriggers.join(', ')}，建议运行数据一致性修复脚本`]
          : ['所有数据一致性触发器都已正确配置'],
      };
    } catch (error) {
      throw TRPCErrorHandler.internalError(
        '检查触发器状态失败'
      );
    }
  }),
});

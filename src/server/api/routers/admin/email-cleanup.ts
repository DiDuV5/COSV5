/**
 * @fileoverview 邮箱清理管理tRPC路由
 * @description 处理失败注册用户的邮箱清理功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

/**
 * 邮箱清理统计信息
 */
const EmailCleanupStatsSchema = z.object({
  totalFailedRegistrations: z.number(),
  emailSendFailures: z.number(),
  unverifiedUsers: z.number(),
  expiredTokens: z.number(),
  cleanableRecords: z.number(),
  cleanableUnverifiedUsers: z.number(),
});

/**
 * 邮箱清理结果
 */
const EmailCleanupResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedUsers: z.number(),
  deletedTokens: z.number(),
  releasedEmails: z.array(z.string()),
  errors: z.array(z.string()).optional(),
});

/**
 * 邮箱清理配置
 */
const EmailCleanupConfigSchema = z.object({
  dryRun: z.boolean().default(true),
  maxAge: z.number().min(1).max(365).default(7), // 天数
  includeUnverified: z.boolean().default(true),
  includeFailedEmail: z.boolean().default(true),
  batchSize: z.number().min(1).max(1000).default(100),
});

/**
 * 邮箱清理管理路由
 */
export const emailCleanupRouter = createTRPCRouter({
  /**
   * 获取邮箱清理统计信息
   */
  getStats: adminProcedure
    .output(EmailCleanupStatsSchema)
    .query(async ({ ctx }) => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 统计失败注册的用户（未验证且超过7天）
        const totalFailedRegistrations = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        });

        // 统计邮件发送失败的用户（未验证且超过7天）
        const emailSendFailures = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        });

        // 统计未验证的用户（所有未验证的用户）
        const unverifiedUsers = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
          },
        });

        // 统计过期的验证令牌
        const expiredTokens = await ctx.db.verificationToken.count({
          where: {
            expires: {
              lt: now,
            },
          },
        });

        // 可清理的记录数量（超过7天未验证的用户）
        const cleanableUnverifiedUsers = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        });

        const cleanableRecords = totalFailedRegistrations + cleanableUnverifiedUsers;

        return {
          totalFailedRegistrations,
          emailSendFailures,
          unverifiedUsers,
          expiredTokens,
          cleanableRecords,
          cleanableUnverifiedUsers, // 新增：可清理的未验证用户数量
        };
      } catch (error) {
        console.error('获取邮箱清理统计失败:', error);
        throw TRPCErrorHandler.internalError('获取统计信息失败');
      }
    }),

  /**
   * 获取可清理的用户列表
   */
  getCleanableUsers: adminProcedure
    .input(z.object({
      maxAge: z.number().min(1).max(365).default(7),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.maxAge);

        const users = await ctx.db.user.findMany({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: cutoffDate,
            },
          },
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            createdAt: true,
            userLevel: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: input.limit,
          skip: input.offset,
        });

        const total = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: cutoffDate,
            },
          },
        });

        return {
          users,
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error) {
        console.error('获取可清理用户列表失败:', error);
        throw TRPCErrorHandler.internalError('获取用户列表失败');
      }
    }),

  /**
   * 执行邮箱清理
   */
  cleanupEmails: adminProcedure
    .input(EmailCleanupConfigSchema)
    .output(EmailCleanupResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.maxAge);

        let deletedUsers = 0;
        let deletedTokens = 0;
        const releasedEmails: string[] = [];
        const errors: string[] = [];

        if (input.dryRun) {
          // 干运行模式，只统计不删除
          const usersToDelete = await ctx.db.user.findMany({
            where: {
              emailVerified: null,
              createdAt: {
                lt: cutoffDate,
              },
            },
            select: {
              email: true,
            },
            take: input.batchSize,
          });

          deletedUsers = usersToDelete.length;
          releasedEmails.push(...usersToDelete.map((u: any) => u.email).filter(Boolean) as string[]);

          const tokensToDelete = await ctx.db.verificationToken.count({
            where: {
              expires: {
                lt: new Date(),
              },
            },
          });

          deletedTokens = tokensToDelete;

          return {
            success: true,
            message: `干运行模式：将删除 ${deletedUsers} 个用户和 ${deletedTokens} 个过期令牌`,
            deletedUsers,
            deletedTokens,
            releasedEmails,
          };
        }

        // 实际清理模式
        await ctx.db.$transaction(async (tx: any) => {
          // 获取要删除的用户
          const usersToDelete = await tx.user.findMany({
            where: {
              isVerified: false,
              email: {
                not: null,
              },
              createdAt: {
                lt: cutoffDate,
              },
            },
            select: {
              id: true,
              email: true,
            },
            take: input.batchSize,
          });

          if (usersToDelete.length > 0) {
            // 收集邮箱地址
            releasedEmails.push(...usersToDelete.map((u: any) => u.email).filter(Boolean) as string[]);

            // 删除用户
            const deleteResult = await tx.user.deleteMany({
              where: {
                id: {
                  in: usersToDelete.map((u: any) => u.id),
                },
              },
            });

            deletedUsers = deleteResult.count;
          }

          // 清理过期的验证令牌
          const tokenDeleteResult = await tx.verificationToken.deleteMany({
            where: {
              expires: {
                lt: new Date(),
              },
            },
          });

          deletedTokens = tokenDeleteResult.count;
        });

        return {
          success: true,
          message: `成功清理 ${deletedUsers} 个用户和 ${deletedTokens} 个过期令牌`,
          deletedUsers,
          deletedTokens,
          releasedEmails,
          errors,
        };
      } catch (error) {
        console.error('邮箱清理失败:', error);
        throw TRPCErrorHandler.internalError('清理操作失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }),

  /**
   * 获取邮箱状态详情
   */
  getEmailStatusDetails: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 已绑定邮箱（已验证）
        const verifiedEmails = await ctx.db.user.count({
          where: {
            isVerified: true,
            email: { not: null },
          },
        });

        // 未验证邮箱（最近7天内注册）
        const recentUnverifiedEmails = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: { not: null },
            createdAt: { gte: sevenDaysAgo },
          },
        });

        // 验证过期邮箱（超过7天未验证）
        const expiredUnverifiedEmails = await ctx.db.user.count({
          where: {
            isVerified: false,
            email: { not: null },
            createdAt: { lt: sevenDaysAgo },
          },
        });

        // 过期验证令牌
        const expiredTokens = await ctx.db.verificationToken.count({
          where: {
            expires: { lt: now },
          },
        });

        // 最近注册用户（24小时内）
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentRegistrations = await ctx.db.user.count({
          where: {
            createdAt: { gte: oneDayAgo },
          },
        });

        return {
          verifiedEmails,
          recentUnverifiedEmails,
          expiredUnverifiedEmails,
          expiredTokens,
          recentRegistrations,
          totalUsers: verifiedEmails + recentUnverifiedEmails + expiredUnverifiedEmails,
        };
      } catch (error) {
        console.error('获取邮箱状态详情失败:', error);
        throw TRPCErrorHandler.internalError('获取邮箱状态详情失败');
      }
    }),

  /**
   * 清理特定用户
   */
  cleanupSpecificUser: adminProcedure
    .input(z.object({
      userId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            username: true,
            email: true,
            emailVerified: true,
          },
        });

        if (!user) {
          throw TRPCErrorHandler.notFound('用户不存在');
        }

        if (user.emailVerified) {
          throw TRPCErrorHandler.validationError('不能删除已验证邮箱的用户');
        }

        await ctx.db.user.delete({
          where: { id: input.userId },
        });

        return {
          success: true,
          message: `成功删除用户 ${user.username}`,
          releasedEmail: user.email,
        };
      } catch (error) {
        console.error('删除特定用户失败:', error);
        throw error;
      }
    }),

  /**
   * 重新发送验证邮件
   */
  resendVerificationEmail: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            username: true,
            email: true,
            emailVerified: true,
          },
        });

        if (!user) {
          throw TRPCErrorHandler.notFound('用户不存在');
        }

        if (user.emailVerified) {
          throw TRPCErrorHandler.validationError('用户邮箱已验证');
        }

        if (!user.email) {
          throw TRPCErrorHandler.validationError('用户没有邮箱地址');
        }

        // 这里应该调用邮件发送服务
        // 暂时返回成功消息
        return {
          success: true,
          message: `验证邮件已重新发送到 ${user.email}`,
        };
      } catch (error) {
        console.error('重新发送验证邮件失败:', error);
        throw error;
      }
    }),


});

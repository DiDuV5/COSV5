/**
 * @fileoverview 管理员审计日志路由
 * @description 处理操作日志管理和查询功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { getAuditLogsSchema } from "./admin-input-schemas";

export const adminAuditLogsRouter = createTRPCRouter({
  /**
   * 获取审计日志列表（管理员）
   */
  getAuditLogs: adminProcedure
    .input(getAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, userId, action, resource } = input;

      // 构建查询条件
      const where: any = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = { contains: action };
      }

      if (resource) {
        where.resource = resource;
      }

      if (cursor) {
        where.id = { lt: cursor };
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        logs,
        nextCursor,
      };
    }),

  /**
   * 获取审计日志统计
   */
  getAuditLogStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      logsLast30Days,
      logsLast7Days,
      logsLast24Hours,
    ] = await Promise.all([
      ctx.db.auditLog.count(),
      ctx.db.auditLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.auditLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.auditLog.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
    ]);

    // 获取操作类型统计
    const actionStats = await ctx.db.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 获取资源类型统计
    const resourceStats = await ctx.db.auditLog.groupBy({
      by: ['resource'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 获取最活跃的管理员
    const activeAdmins = await ctx.db.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // 获取管理员详细信息
    const adminIds = activeAdmins.map((admin: any) => admin.userId);
    const adminDetails = await ctx.db.user.findMany({
      where: { id: { in: adminIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        userLevel: true,
      },
    });

    const activeAdminsWithDetails = activeAdmins.map((admin: any) => {
      const details = adminDetails.find((detail: any) => detail.id === admin.userId);
      return {
        ...admin,
        user: details,
      };
    });

    // 获取每日日志数量
    const dailyLogs = await ctx.db.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    // 处理每日数据
    const dailyData: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
    }

    dailyLogs.forEach((log: any) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (dailyData.hasOwnProperty(dateKey)) {
        dailyData[dateKey] = log._count.id;
      }
    });

    return {
      overview: {
        totalLogs,
        logsLast30Days,
        logsLast7Days,
        logsLast24Hours,
      },
      actionStats: actionStats.map((stat: any) => ({
        action: stat.action,
        count: stat._count.id,
      })),
      resourceStats: resourceStats.map((stat: any) => ({
        resource: stat.resource,
        count: stat._count.id,
      })),
      activeAdmins: activeAdminsWithDetails,
      dailyLogs: dailyData,
      trends: {
        avgDailyLogs: Math.round(logsLast30Days / 30),
        peakDay: Object.entries(dailyData).reduce((max, [date, count]) =>
          count > max.count ? { date, count } : max, { date: '', count: 0 }),
      },
    };
  }),

  /**
   * 获取特定资源的审计日志
   */
  getResourceAuditLogs: adminProcedure
    .input(getAuditLogsSchema.extend({
      resourceId: getAuditLogsSchema.shape.resource.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, resource, resourceId } = input;

      const where: any = {};

      if (resource) {
        where.resource = resource;
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (cursor) {
        where.id = { lt: cursor };
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        logs,
        nextCursor,
      };
    }),

  /**
   * 获取用户操作历史
   */
  getUserActionHistory: adminProcedure
    .input(getAuditLogsSchema.pick({ userId: true, limit: true, cursor: true }))
    .query(async ({ ctx, input }) => {
      const { userId, limit, cursor } = input;

      if (!userId) {
        return {
          logs: [],
          nextCursor: undefined,
          user: null,
        };
      }

      // 获取用户信息
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          userLevel: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        return {
          logs: [],
          nextCursor: undefined,
          user: null,
        };
      }

      const where: any = { userId };

      if (cursor) {
        where.id = { lt: cursor };
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem!.id;
      }

      // 统计用户操作
      const actionSummary = await ctx.db.auditLog.groupBy({
        by: ['action'],
        where: { userId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return {
        logs,
        nextCursor,
        user,
        actionSummary: actionSummary.map((stat: any) => ({
          action: stat.action,
          count: stat._count.id,
        })),
      };
    }),

  /**
   * 获取安全事件日志
   */
  getSecurityEvents: adminProcedure
    .input(getAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // 定义安全相关的操作
      const securityActions = [
        'LOGIN_FAILED',
        'PASSWORD_RESET',
        'ACCOUNT_LOCKED',
        'PERMISSION_DENIED',
        'SUSPICIOUS_ACTIVITY',
        'DELETE_USER',
        'UPDATE_USER_LEVEL',
        'ADMIN_LOGIN',
      ];

      const where: any = {
        action: { in: securityActions },
      };

      if (cursor) {
        where.id = { lt: cursor };
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem!.id;
      }

      // 获取安全事件统计
      const securityStats = await ctx.db.auditLog.groupBy({
        by: ['action'],
        where: {
          action: { in: securityActions },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return {
        logs,
        nextCursor,
        securityStats: securityStats.map((stat: any) => ({
          action: stat.action,
          count: stat._count.id,
        })),
      };
    }),
});

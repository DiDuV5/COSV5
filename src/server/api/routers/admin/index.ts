/**
 * @fileoverview 管理员路由组合文件
 * @description 组合所有管理员子路由，提供统一的管理员API接口
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { getUsersSchema, createUsersBatchSchema, batchUpdateUserLevelSchema, getUserByIdSchema, createUserSchema, updateUserSchema, deleteUserSchema } from "./admin-input-schemas";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { adminSettingsRouter } from "./admin-settings";
import { adminUserManagementRouter } from "./admin-user-management";
import { adminUserPermissionsRouter } from "./admin-user-permissions";
import { adminContentModerationRouter } from "./admin-content-moderation";
import { adminAnalyticsRouter } from "./admin-analytics";
import { adminVisitorAnalyticsRouter } from "./admin-visitor-analytics";
import { adminAuditLogsRouter } from "./admin-audit-logs";
import { emailMonitoringRouter } from "./email-monitoring";
import { emailCleanupRouter } from "./email-cleanup";
import { emailTemplateRouter } from "./email-template-router";
import { dataConsistencyRouter } from "./data-consistency";
import { performanceRouter } from "./performance-router";
import { layeredCacheRouter } from "./layered-cache";


export const adminRouter = createTRPCRouter({
  // 系统设置
  settings: adminSettingsRouter,

  // 用户管理
  userManagement: adminUserManagementRouter,

  // 用户权限管理
  userPermissions: adminUserPermissionsRouter,

  // 内容审核
  contentModeration: adminContentModerationRouter,

  // 统计分析
  analytics: adminAnalyticsRouter,

  // 访客统计
  visitorAnalytics: adminVisitorAnalyticsRouter,

  // 审计日志
  auditLogs: adminAuditLogsRouter,

  // 邮件监控
  emailMonitoring: emailMonitoringRouter,

  // 邮箱清理
  emailCleanup: emailCleanupRouter,

  // 邮件模板
  emailTemplate: emailTemplateRouter,

  // 数据一致性管理
  dataConsistency: dataConsistencyRouter,

  // 性能监控
  performance: performanceRouter,

  // 三级缓存管理
  layeredCache: layeredCacheRouter,

  // 兼容性方法：直接暴露常用的统计方法
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.post.count({ where: { isPublic: true, publishedAt: { not: null } } }),
      ctx.db.comment.count(),
      ctx.db.user.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      totalPosts,
      totalComments,
      pendingComments: 0, // Comment模型暂时没有status字段
      activeUsers,
    };
  }),

  // 兼容性方法：获取用户列表
  getUsers: adminProcedure
    .input(getUsersSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, userLevel, isActive, isVerified, sortBy, sortOrder } = input;

      // 构建查询条件
      const where: any = {};

      if (search) {
        where.OR = [
          { username: { contains: search } },
          { displayName: { contains: search } },
          { email: { contains: search } },
        ];
      }

      if (userLevel) {
        where.userLevel = userLevel;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (isVerified !== undefined) {
        where.isVerified = isVerified;
      }

      // 构建排序条件
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // 执行查询
      const users = await ctx.db.user.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where,
        orderBy,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          userLevel: true,
          isActive: true,
          isVerified: true,
          approvalStatus: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      // 处理分页
      let nextCursor: string | undefined = undefined;
      if (users.length > limit) {
        const nextItem = users.pop();
        nextCursor = nextItem!.id;
      }

      return {
        users,
        nextCursor,
      };
    }),

  // 兼容性方法：批量创建用户
  createUsersBatch: adminProcedure
    .input(createUsersBatchSchema)
    .mutation(async ({ ctx, input }) => {
      // 直接调用用户管理路由的方法
      return await adminUserManagementRouter.createCaller(ctx as any).createUsersBatch(input);
    }),

  // 兼容性方法：批量更新用户等级
  batchUpdateUserLevel: adminProcedure
    .input(batchUpdateUserLevelSchema)
    .mutation(async ({ ctx, input }) => {
      // 直接调用用户权限管理路由的方法
      return await adminUserPermissionsRouter.createCaller(ctx as any).batchUpdateUserLevel(input);
    }),

  // 兼容性方法：获取用户详情
  getUserById: adminProcedure
    .input(getUserByIdSchema)
    .query(async ({ ctx, input }) => {
      return await adminUserManagementRouter.createCaller(ctx as any).getUserById(input);
    }),

  // 兼容性方法：创建用户
  createUser: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      return await adminUserManagementRouter.createCaller(ctx as any).createUser(input);
    }),

  // 兼容性方法：更新用户
  updateUser: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      return await adminUserManagementRouter.createCaller(ctx as any).updateUser(input);
    }),

  // 兼容性方法：删除用户
  deleteUser: adminProcedure
    .input(deleteUserSchema)
    .mutation(async ({ ctx, input }) => {
      return await adminUserManagementRouter.createCaller(ctx as any).deleteUser(input);
    }),

  // 兼容性方法：获取设置
  getSettings: adminProcedure
    .query(async ({ ctx }) => {
      return await adminSettingsRouter.createCaller(ctx as any).getSettings({});
    }),

  // 兼容性方法：上传设置相关
  getUploadSettings: adminProcedure
    .query(async ({ ctx }) => {
      return await adminSettingsRouter.createCaller(ctx as any).getUploadSettings({ category: 'all' });
    }),

  updateUploadSettings: adminProcedure
    .input(z.object({
      storageProvider: z.enum(['local', 'cloudflare-r2', 's3']).optional(),
      enableDeduplication: z.boolean().optional(),
      imageQuality: z.number().min(1).max(100).optional(),
      maxFileSize: z.number().min(1).optional(),
      allowedTypes: z.array(z.string()).optional(),
      enableThumbnails: z.boolean().optional(),
      maxFilesPerPost: z.number().min(1).max(50).optional(),
      cdnUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await adminSettingsRouter.createCaller(ctx as any).updateUploadSettings(input);
    }),

  getUploadStats: adminProcedure
    .input(z.object({
      timeRange: z.enum(['day', 'week', 'month']).default('week'),
      fileType: z.enum(['image', 'video', 'all']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      return await adminSettingsRouter.createCaller(ctx as any).getUploadStats(input);
    }),

  cleanupUnusedHashes: adminProcedure
    .mutation(async ({ ctx }) => {
      return await adminSettingsRouter.createCaller(ctx as any).cleanupUnusedHashes();
    }),

  // 兼容性方法：访客统计相关
  getVisitorStats: adminProcedure
    .input(z.object({
      timeRange: z.enum(['day', 'week', 'month']).default('week'),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await adminVisitorAnalyticsRouter.createCaller(ctx as any).getVisitorStats(input);
    }),

  getRegistrationStats: adminProcedure
    .input(z.object({
      timeRange: z.enum(['day', 'week', 'month']).default('week'),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await adminVisitorAnalyticsRouter.createCaller(ctx as any).getRegistrationStats(input);
    }),

  getPageStats: adminProcedure
    .input(z.object({
      timeRange: z.enum(['day', 'week', 'month']).default('week'),
    }))
    .query(async ({ ctx, input }) => {
      return await adminVisitorAnalyticsRouter.createCaller(ctx as any).getPageStats(input);
    }),

  getTrendData: adminProcedure
    .input(z.object({
      timeRange: z.enum(['day', 'week', 'month']).default('week'),
    }))
    .query(async ({ ctx, input }) => {
      return await adminVisitorAnalyticsRouter.createCaller(ctx as any).getTrendData(input);
    }),

  // 重置用户密码
  resetUserPassword: adminProcedure
    .input(z.object({
      userId: z.string(),
      newPassword: z.string().min(6, "密码至少6位"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, newPassword } = input;

      // 检查用户是否存在
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });

      TRPCErrorHandler.requireResource(user, "用户", userId);

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 更新密码
      await ctx.db.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: "RESET_PASSWORD",
          level: "INFO",
          message: `管理员重置了用户 ${user!.username} 的密码`,
          resource: "USER",
          resourceId: userId,
          details: JSON.stringify({ targetUser: user!.username }),
        },
      });

      return {
        success: true,
        message: "密码重置成功",
      };
    }),

  // 获取审核历史
  getApprovalHistory: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(['APPROVED', 'REJECTED', 'ALL']).default('ALL'),
      sortBy: z.enum(['createdAt', 'username']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { search, status, sortBy, sortOrder, dateFrom, dateTo, limit } = input;

      // 构建查询条件
      const where: any = {};

      if (search) {
        where.OR = [
          { username: { contains: search } },
          { displayName: { contains: search } },
        ];
      }

      if (status !== 'ALL') {
        where.approvalStatus = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // 只查询已审核的用户
      where.approvalStatus = { in: ['APPROVED', 'REJECTED'] };

      const users = await ctx.db.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        select: {
          id: true,
          username: true,
          displayName: true,
          approvalStatus: true,
          createdAt: true,
          // 审核相关字段需要根据实际数据库schema调整
        },
      });

      return {
        users,
        nextCursor: null, // 简化实现，不支持分页
      };
    }),
});

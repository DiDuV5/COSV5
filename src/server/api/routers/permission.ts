/**
 * @fileoverview 权限管理相关的tRPC路由（重构版）
 * @description 处理用户权限配置、权限检查等功能，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { z } from "zod";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import {
  createTRPCRouter,
  publicProcedure,
  authProcedure,
  adminProcedure,
} from "@/server/api/trpc";

// 导入重构后的服务
import {
  permissionConfigService,
  permissionCheckService,
  type PermissionAction,
} from "./permission/services";

export const permissionRouter = createTRPCRouter({
  /**
   * 获取所有权限配置（重构版 - 使用配置服务）
   */
  getAllConfigs: adminProcedure.query(async ({ ctx }) => {
    try {
      const configService = permissionConfigService(ctx.db);
      return await configService.getAllConfigs();
    } catch (error: unknown) {
      // 如果已经是TRPCError，直接重新抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      throw TRPCErrorHandler.businessError(
        'INTERNAL_SERVER_ERROR' as any,
        '获取权限配置列表失败，请稍后重试',
        {
          context: {
            error: errorMessage,
            adminId: ctx.session.user.id,
            operation: 'getAllConfigs',
            timestamp: new Date().toISOString()
          },
          recoveryActions: [
            '刷新页面重试',
            '检查管理员权限',
            '联系技术支持'
          ]
        }
      );
    }
  }),

  /**
   * 获取特定用户等级的权限配置（重构版 - 使用配置服务）
   */
  getConfigByLevel: publicProcedure
    .input(z.object({ userLevel: z.string() }))
    .query(async ({ ctx, input }) => {
      const configService = permissionConfigService(ctx.db);
      return await configService.getConfigByLevel(input.userLevel);
    }),

  /**
   * 获取用户的权限配置（重构版 - 使用配置服务）
   */
  getUserPermissions: authProcedure.query(async ({ ctx }) => {
    const configService = permissionConfigService(ctx.db);
    return await configService.getUserPermissions(ctx.session.user.id);
  }),

  /**
   * 更新权限配置（重构版 - 使用配置服务）
   */
  updateConfig: adminProcedure
    .input(z.object({
      userLevel: z.string(),
      mediaAccessPercentage: z.number().min(0).max(100).optional(),
      canPlayVideos: z.boolean().optional(),
      canViewRestrictedPreview: z.boolean().optional(),
      canDownloadImages: z.boolean().optional(),
      canPublishMoments: z.boolean().optional(),
      canPublishPosts: z.boolean().optional(),
      dailyMomentsLimit: z.number().min(0).optional(),
      dailyPostsLimit: z.number().min(0).optional(),
      canUploadImages: z.boolean().optional(),
      canUploadVideos: z.boolean().optional(),
      maxImagesPerUpload: z.number().min(0).optional(),
      maxVideosPerUpload: z.number().min(0).optional(),
      momentMinLength: z.number().min(1).optional(),
      momentMaxLength: z.number().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const configService = permissionConfigService(ctx.db);
      return await configService.updateConfig(input, ctx.session.user.id);
    }),

  /**
   * 批量更新用户组权限配置（重构版 - 使用配置服务）
   */
  batchUpdateUserGroupPermissions: adminProcedure
    .input(z.object({
      updates: z.array(z.object({
        userLevel: z.string(),
        mediaAccessPercentage: z.number().min(0).max(100).optional(),
        canPlayVideos: z.boolean().optional(),
        canViewRestrictedPreview: z.boolean().optional(),
        canDownloadImages: z.boolean().optional(),
      })),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const configService = permissionConfigService(ctx.db);
      return await configService.batchUpdateUserGroupPermissions(input, ctx.session.user.id);
    }),

  /**
   * 获取媒体权限配置概览（重构版 - 使用配置服务）
   */
  getMediaPermissionOverview: adminProcedure.query(async ({ ctx }) => {
    const configService = permissionConfigService(ctx.db);
    const [configs, stats] = await Promise.all([
      configService.getAllConfigs(),
      configService.getConfigStats(),
    ]);

    const mediaConfigs = configs.map(config => ({
      userLevel: config.userLevel,
      mediaAccessPercentage: config.mediaAccessPercentage,
      canPlayVideos: config.canPlayVideos,
      canViewRestrictedPreview: config.canViewRestrictedPreview,
      canDownloadImages: config.canDownloadImages,
    }));

    return {
      configs: mediaConfigs,
      userStats: stats.usersByLevel,
    };
  }),

  /**
   * 检查用户权限（重构版 - 使用检查服务）
   */
  checkPermission: authProcedure
    .input(z.object({
      action: z.enum([
        'PUBLISH_MOMENT', 'PUBLISH_POST', 'UPLOAD_IMAGE', 'UPLOAD_VIDEO',
        'VIEW_POSTS', 'VIEW_PROFILES', 'VIEW_COMMENTS', 'PLAY_VIDEOS',
        'DOWNLOAD_IMAGES', 'SEARCH_CONTENT', 'VIEW_TAGS', 'LIKE_POSTS',
        'COMMENT', 'FOLLOW', 'SHARE'
      ] as const),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const checkService = permissionCheckService(ctx.db);
      const userId = input.userId || ctx.session.user.id;
      return await checkService.checkPermission(userId, input.action as PermissionAction);
    }),

  /**
   * 检查用户今日发布限制（重构版 - 使用检查服务）
   */
  checkDailyLimit: authProcedure
    .input(z.object({
      contentType: z.enum(['MOMENT', 'POST']),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const checkService = permissionCheckService(ctx.db);
      const userId = input.userId || ctx.session.user.id;
      return await checkService.checkDailyLimit(userId, input.contentType);
    }),

  /**
   * 检查媒体访问权限（新增 - 使用检查服务）
   */
  checkMediaAccess: authProcedure
    .input(z.object({
      mediaId: z.string(),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const checkService = permissionCheckService(ctx.db);
      const userId = input.userId || ctx.session.user.id;
      return await checkService.checkMediaAccess(userId, input.mediaId);
    }),

  /**
   * 批量检查权限（新增 - 使用检查服务）
   */
  batchCheckPermissions: authProcedure
    .input(z.object({
      actions: z.array(z.enum([
        'PUBLISH_MOMENT', 'PUBLISH_POST', 'UPLOAD_IMAGE', 'UPLOAD_VIDEO',
        'VIEW_POSTS', 'VIEW_PROFILES', 'VIEW_COMMENTS', 'PLAY_VIDEOS',
        'DOWNLOAD_IMAGES', 'SEARCH_CONTENT', 'VIEW_TAGS', 'LIKE_POSTS',
        'COMMENT', 'FOLLOW', 'SHARE'
      ] as const)),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const checkService = permissionCheckService(ctx.db);
      const userId = input.userId || ctx.session.user.id;
      return await checkService.batchCheckPermissions(userId, input.actions as PermissionAction[]);
    }),

  /**
   * 检查上传权限和限制（新增 - 使用检查服务）
   */
  checkUploadPermission: authProcedure
    .input(z.object({
      mediaType: z.enum(['IMAGE', 'VIDEO']),
      count: z.number().min(1),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const checkService = permissionCheckService(ctx.db);
      const userId = input.userId || ctx.session.user.id;
      return await checkService.checkUploadPermission(userId, input.mediaType, input.count);
    }),

  /**
   * 重置权限配置为默认值（新增 - 使用配置服务）
   */
  resetConfigToDefault: adminProcedure
    .input(z.object({
      userLevel: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const configService = permissionConfigService(ctx.db);
      return await configService.resetConfigToDefault(input.userLevel, ctx.session.user.id);
    }),

  /**
   * 删除权限配置（新增 - 使用配置服务）
   */
  deleteConfig: adminProcedure
    .input(z.object({
      userLevel: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const configService = permissionConfigService(ctx.db);
      return await configService.deleteConfig(input.userLevel, ctx.session.user.id);
    }),

  /**
   * 获取权限配置统计（新增 - 使用配置服务）
   */
  getConfigStats: adminProcedure.query(async ({ ctx }) => {
    const configService = permissionConfigService(ctx.db);
    return await configService.getConfigStats();
  }),
});

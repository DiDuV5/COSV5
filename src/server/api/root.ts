/**
 * @fileoverview tRPC 根路由
 * @description 定义所有 tRPC 路由的根路由
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { adminRouter } from "./routers/admin/index";
import { authRouter } from "./routers/auth-router";
import { commentRouter } from "./routers/comment/index";
import { draftRouter } from "./routers/draft/draft-router";
import { mediaRouter } from "./routers/media";
import { postRouter } from "./routers/post/index";
import { settingsRouter } from "./routers/settings";
import { tagRouter } from "./routers/tag/index";
import { uploadRouter } from "./routers/upload/index";
import { userRouter } from "./routers/user/index";
import { webpConversionRouter } from "./routers/webp-conversion";

import { adminPermissionsRouter } from "./routers/admin-permissions";
import { cansRouter } from "./routers/cans/index";
import { cleanupRouter } from "./routers/cleanup";
import { dashboardRouter } from "./routers/dashboard";
import { downloadLinkRouter } from "./routers/download-link";
import { mentionRouter } from "./routers/mention";
import { notificationRouter } from "./routers/notification";
import { objectStorageRouter } from "./routers/object-storage";
import { permissionRouter } from "./routers/permission";
import { profileRouter } from "./routers/profile";
import { recommendationRouter } from "./routers/recommendation";
import { storageRouter } from "./routers/storage";
// import { storageTestRouter } from "./routers/storage-test"; // 已删除测试路由
// import { testDataRouter } from "./routers/test-data"; // 已删除测试路由
import { transcodingRouter } from "./routers/transcoding";
import { transcodingProgressRouter } from "./routers/transcoding-progress";
// import { cdnTestRouter } from "./routers/cdn-test"; // 暂时注释掉，文件不存在
import { adminCdnConfigRouter } from "./routers/admin/admin-cdn-config";
// import { adminEmailTestRouter } from "./routers/admin/admin-email-test"; // 已删除测试路由
import { adminMediaManagementRouter } from "./routers/admin/admin-media-management";
import { emailVerificationRouter } from "./routers/auth/email-verification";
import { turnstileRouter } from "./routers/turnstile-router";
import { fileAccessRouter } from "./routers/media/file-access";
import { systemHealthRouter } from "./routers/system/system-health";
import { uploadStatusRouter } from "./routers/upload/upload-status";
import { userApprovalRouter } from "./routers/user-approval";
// 已移除重复的上传路由器，统一使用 uploadRouter
import { videoTranscodingRouter } from "./routers/video-transcoding";


/**
 * 这是主要的路由器，用于将所有子路由器组合在一起
 */
export const appRouter = createTRPCRouter({
  // 测试路由
  hello: publicProcedure
    .input(z.object({ text: z.string() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? "World"}!`,
        timestamp: new Date().toISOString(),
      };
    }),

  // 数据库连接测试
  healthCheck: publicProcedure.query(async ({ ctx }) => {
    try {
      // 简单的数据库连接测试
      const userCount = await ctx.prisma.user.count();
      return {
        status: "ok",
        database: "connected",
        userCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }),

  auth: authRouter,
  user: userRouter,
  post: postRouter,
  draft: draftRouter,
  comment: commentRouter,
  tag: tagRouter,
  admin: adminRouter,
  settings: settingsRouter,
  upload: uploadRouter,
  media: mediaRouter,
  webpConversion: webpConversionRouter,

  transcoding: transcodingRouter,
  transcodingProgress: transcodingProgressRouter,
  profile: profileRouter,
  permission: permissionRouter,
  recommendation: recommendationRouter,
  cans: cansRouter,
  dashboard: dashboardRouter,
  downloadLink: downloadLinkRouter,
  mention: mentionRouter,
  notification: notificationRouter,
  adminPermissions: adminPermissionsRouter,
  // testData: testDataRouter, // 已删除测试路由
  cleanup: cleanupRouter,
  storage: storageRouter,
  objectStorage: objectStorageRouter,
  // storageTest: storageTestRouter, // 已删除测试路由
  // cdnTest: cdnTestRouter, // 暂时注释掉，文件不存在
  userApproval: userApprovalRouter,

  // 新迁移的tRPC路由

  adminCdnConfig: adminCdnConfigRouter,
  adminMediaManagement: adminMediaManagementRouter,
  // adminEmailTest: adminEmailTestRouter, // 已删除测试路由
  uploadStatus: uploadStatusRouter,
  systemHealth: systemHealthRouter,
  fileAccess: fileAccessRouter,
  emailVerification: emailVerificationRouter,
  // 简单上传兼容路由（向后兼容）
  simpleUpload: createTRPCRouter({
    upload: uploadRouter.upload,
  }),
  videoTranscoding: videoTranscodingRouter,

  // 安全相关路由
  turnstile: turnstileRouter,
});

// 导出路由器的类型定义。这在客户端使用。
export type AppRouter = typeof appRouter;

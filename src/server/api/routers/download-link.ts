/**
 * @fileoverview 下载链接管理 tRPC 路由器 - 重构为模块化架构
 * @description 处理下载链接的创建、查询、兑换等操作 - 模块化重构版本
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server
 * - zod
 * - prisma
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

import { createTRPCRouter, authProcedure, publicProcedure } from '@/server/api/trpc';

// 导入模块化组件
import {
  createDownloadLinkSchema,
  updateDownloadLinkSchema,
  purchaseDownloadLinkSchema,
  getByPostIdSchema,
  deleteDownloadLinkSchema,
  getPurchaseStatusSchema,
  getBatchPurchaseStatusSchema,
} from './download-link/types';
import { LinkManager } from './download-link/link-manager';
import { PurchaseHandler } from './download-link/purchase-handler';
import { PermissionHandler } from './download-link/permission-handler';

// 重新导出类型以保持向后兼容
export type * from './download-link/types';

export const downloadLinkRouter = createTRPCRouter({
  // 创建下载链接
  create: authProcedure
    .input(createDownloadLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await LinkManager.createDownloadLink(ctx.db, input, userPermission);
    }),

  // 获取内容的下载链接列表 - 需要登录才能查看
  getByPostId: authProcedure
    .input(getByPostIdSchema)
    .query(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await LinkManager.getDownloadLinksByPostId(ctx.db, input.postId, userPermission);
    }),

  // 更新下载链接
  update: authProcedure
    .input(updateDownloadLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await LinkManager.updateDownloadLink(ctx.db, input, userPermission);
    }),

  // 删除下载链接（软删除）
  delete: authProcedure
    .input(deleteDownloadLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await LinkManager.deleteDownloadLink(ctx.db, input.id, userPermission);
    }),

  // 兑换下载链接
  purchase: authProcedure
    .input(purchaseDownloadLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      // 获取请求上下文信息
      const requestContext = {
        ipAddress: ctx.headers?.['x-forwarded-for']?.split(',')[0] ||
                   ctx.headers?.['x-real-ip'] ||
                   'unknown',
        userAgent: ctx.headers?.['user-agent'] || 'unknown',
      };

      return await PurchaseHandler.purchaseDownloadLink({
        db: ctx.db,
        linkId: input.linkId,
        userPermission,
        requestContext
      });
    }),

  // 获取兑换状态和下载信息
  getPurchaseStatus: authProcedure
    .input(getPurchaseStatusSchema)
    .query(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await PurchaseHandler.getPurchaseStatus({
        db: ctx.db,
        linkId: input.linkId,
        userPermission
      });
    }),

  // 批量获取兑换状态
  getBatchPurchaseStatus: authProcedure
    .input(getBatchPurchaseStatusSchema)
    .query(async ({ ctx, input }) => {
      const userPermission = PermissionHandler.createUserPermission(
        ctx.session.user.id,
        ctx.session.user.userLevel!
      );

      return await PurchaseHandler.getBatchPurchaseStatus({
        db: ctx.db,
        linkIds: input.linkIds,
        userPermission
      });
    }),
});

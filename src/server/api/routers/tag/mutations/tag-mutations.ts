/**
 * @fileoverview 标签管理路由
 * @description 处理标签的增删改查管理功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  mergeTagsSchema,
  renameTagSchema,
  deleteTagsSchema,
  restoreTagSchema,
  batchRestoreTagsSchema,
} from "../schemas";
import {
  validateBatchOperationPermission,
  parsePostTags as _parsePostTags,
  generateDeletedTagName as _generateDeletedTagName,
  getOriginalTagName as _getOriginalTagName,
} from "../utils";
import { TagManagementService } from "../services";

export const tagMutationsRouter = createTRPCRouter({
  /**
   * 合并标签（管理员专用）
   */
  mergeTags: adminProcedure
    .input(mergeTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { sourceTagNames, targetTagName, reason } = input;
      const adminId = ctx.session.user.id;

      validateBatchOperationPermission(sourceTagNames.length);

      return await TagManagementService.mergeTags(
        ctx.db,
        sourceTagNames,
        targetTagName,
        adminId,
        reason
      );
    }),

  /**
   * 重命名标签（管理员专用）
   */
  renameTag: adminProcedure
    .input(renameTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { oldName, newName, reason } = input;
      const adminId = ctx.session.user.id;

      return await TagManagementService.renameTag(
        ctx.db,
        oldName,
        newName,
        adminId,
        reason
      );
    }),

  /**
   * 删除标签（管理员专用）
   */
  deleteTags: adminProcedure
    .input(deleteTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { tagNames, softDelete: _softDelete, reason } = input;
      const adminId = ctx.session.user.id;

      validateBatchOperationPermission(tagNames.length);

      // 批量删除标签，逐个调用deleteTag
      const results: any[] = [];
      for (const tagName of tagNames) {
        const result = await TagManagementService.deleteTag(
          ctx.db,
          tagName,
          adminId,
          reason
        );
        results.push(result);
      }
      return results;
    }),

  /**
   * 恢复标签（管理员专用）
   */
  restoreTag: adminProcedure
    .input(restoreTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { tagName, reason } = input;
      const adminId = ctx.session.user.id;

      return await TagManagementService.restoreTag(
        ctx.db,
        tagName,
        adminId,
        reason
      );
    }),

  /**
   * 批量恢复标签（管理员专用）
   */
  batchRestoreTags: adminProcedure
    .input(batchRestoreTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { tagNames, reason } = input;
      const adminId = ctx.session.user.id;

      validateBatchOperationPermission(tagNames.length);

      const restoredTags: string[] = [];
      const notFoundTags: string[] = [];
      let totalUpdatedPosts = 0;

      // 逐个处理每个标签
      for (const tagName of tagNames) {
        try {
          const result = await TagManagementService.restoreTag(
            ctx.db,
            tagName,
            adminId,
            reason
          );

          if (result.success) {
            restoredTags.push(tagName);
            totalUpdatedPosts += result.affectedPosts;
          }
        } catch (_error) {
          notFoundTags.push(tagName);
        }
      }

      if (restoredTags.length === 0) {
        throw new Error('没有找到可恢复的标签');
      }

      // 记录批量操作日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: "BATCH_RESTORE_TAGS",
          message: `批量恢复标签: ${restoredTags.join(', ')}`,
          resource: "TAG",
          resourceId: restoredTags.join(','),
          details: JSON.stringify({
            oldValues: {
              requestedTags: tagNames,
              notFoundTags,
            },
            newValues: {
              restoredTags,
              restoredCount: restoredTags.length,
              affectedPosts: totalUpdatedPosts,
              reason,
            },
          }),
        },
      });

      return {
        success: true,
        message: `成功恢复 ${restoredTags.length} 个标签，影响 ${totalUpdatedPosts} 个帖子`,
        restoredTags,
        notFoundTags,
        affectedPosts: totalUpdatedPosts,
      };
    }),
});

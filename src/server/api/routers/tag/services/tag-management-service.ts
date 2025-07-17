/**
 * @fileoverview 标签管理服务
 * @description 处理标签的管理操作，包括合并、重命名、删除等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  parsePostTags,
  generateDeletedTagName,
  getOriginalTagName,
  validateTagExists,
  validateTagNotDuplicate,
  logTagOperation,
  handleTagOperationError,
} from '../utils';

/**
 * 标签管理操作结果接口
 */
export interface TagOperationResult {
  success: boolean;
  message: string;
  affectedPosts: number;
}

/**
 * 标签管理服务类
 */
export class TagManagementService {
  constructor(private db: PrismaClient) {}

  /**
   * 合并标签
   */
  async mergeTags(params: {
    sourceTagNames: string[];
    targetTagName: string;
    adminId: string;
    reason?: string;
  }): Promise<TagOperationResult> {
    const { sourceTagNames, targetTagName, adminId, reason } = params;

    try {
      if (sourceTagNames.includes(targetTagName)) {
        throw TRPCErrorHandler.validationError('目标标签不能在源标签列表中');
      }

      // 验证源标签存在
      for (const tagName of sourceTagNames) {
        const posts = await this.db.post.findMany({
          where: { tags: { contains: tagName } },
          select: { id: true },
        });
        validateTagExists(posts, tagName);
      }

      // 检查目标标签是否重复
      validateTagNotDuplicate(sourceTagNames, targetTagName);

      const posts = await this.db.post.findMany({
        where: {
          tags: {
            contains: sourceTagNames[0], // 至少包含一个源标签
          },
        },
        select: { id: true, tags: true },
      });

      let updatedPostsCount = 0;

      for (const post of posts) {
        if (post.tags) {
          try {
            const tags = parsePostTags(post.tags);
            const newTags = new Set<string>();
            let hasChanges = false;

            tags.forEach(tag => {
              if (sourceTagNames.includes(tag)) {
                newTags.add(targetTagName);
                hasChanges = true;
              } else {
                newTags.add(tag);
              }
            });

            if (hasChanges) {
              await this.db.post.update({
                where: { id: post.id },
                data: {
                  tags: JSON.stringify(Array.from(newTags)),
                  updatedAt: new Date(),
                },
              });
              updatedPostsCount++;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 记录操作日志
      await this.logAuditAction({
        userId: adminId,
        action: 'MERGE_TAGS',
        message: `合并标签: ${sourceTagNames.join(', ')} -> ${targetTagName}`,
        resource: 'TAG',
        resourceId: targetTagName,
        details: {
          oldValues: { sourceTagNames },
          newValues: { targetTagName, affectedPosts: updatedPostsCount, reason },
        },
      });

      logTagOperation('合并', sourceTagNames, { targetTagName, affectedPosts: updatedPostsCount });

      return {
        success: true,
        message: `成功合并 ${sourceTagNames.length} 个标签到 "${targetTagName}"，影响 ${updatedPostsCount} 个帖子`,
        affectedPosts: updatedPostsCount,
      };
    } catch (error) {
      handleTagOperationError(error, '合并');
    }
  }

  /**
   * 重命名标签
   */
  async renameTag(params: {
    oldName: string;
    newName: string;
    adminId: string;
    reason?: string;
  }): Promise<TagOperationResult> {
    const { oldName, newName, adminId, reason } = params;

    try {
      if (oldName === newName) {
        throw TRPCErrorHandler.validationError('新标签名称不能与原标签名称相同');
      }

      const posts = await this.db.post.findMany({
        where: { tags: { contains: oldName } },
        select: { id: true, tags: true },
      });

      validateTagExists(posts, oldName);

      let updatedPostsCount = 0;

      for (const post of posts) {
        if (post.tags) {
          try {
            const tags = parsePostTags(post.tags);
            let hasChanges = false;
            const newTags = tags.map(tag => {
              if (tag === oldName) {
                hasChanges = true;
                return newName;
              }
              return tag;
            });

            if (hasChanges) {
              await this.db.post.update({
                where: { id: post.id },
                data: {
                  tags: JSON.stringify(newTags),
                  updatedAt: new Date(),
                },
              });
              updatedPostsCount++;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 记录操作日志
      await this.logAuditAction({
        userId: adminId,
        action: 'RENAME_TAG',
        message: `重命名标签: ${oldName} -> ${newName}`,
        resource: 'TAG',
        resourceId: newName,
        details: {
          oldValues: { oldName },
          newValues: { newName, affectedPosts: updatedPostsCount, reason },
        },
      });

      logTagOperation('重命名', [oldName], { newName, affectedPosts: updatedPostsCount });

      return {
        success: true,
        message: `成功将标签 "${oldName}" 重命名为 "${newName}"，影响 ${updatedPostsCount} 个帖子`,
        affectedPosts: updatedPostsCount,
      };
    } catch (error) {
      handleTagOperationError(error, '重命名');
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(params: {
    tagName: string;
    adminId: string;
    reason?: string;
  }): Promise<TagOperationResult> {
    const { tagName, adminId, reason } = params;

    try {
      const posts = await this.db.post.findMany({
        where: { tags: { contains: tagName } },
        select: { id: true, tags: true },
      });

      validateTagExists(posts, tagName);

      const deletedTagName = generateDeletedTagName(tagName);
      let updatedPostsCount = 0;

      for (const post of posts) {
        if (post.tags) {
          try {
            const tags = parsePostTags(post.tags);
            let hasChanges = false;
            const newTags = tags.map(tag => {
              if (tag === tagName) {
                hasChanges = true;
                return deletedTagName;
              }
              return tag;
            });

            if (hasChanges) {
              await this.db.post.update({
                where: { id: post.id },
                data: {
                  tags: JSON.stringify(newTags),
                  updatedAt: new Date(),
                },
              });
              updatedPostsCount++;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 记录操作日志
      await this.logAuditAction({
        userId: adminId,
        action: 'DELETE_TAG',
        message: `删除标签: ${tagName}`,
        resource: 'TAG',
        resourceId: tagName,
        details: {
          oldValues: { tagName },
          newValues: { deletedTagName, affectedPosts: updatedPostsCount, reason },
        },
      });

      logTagOperation('删除', [tagName], { deletedTagName, affectedPosts: updatedPostsCount });

      return {
        success: true,
        message: `成功删除标签 "${tagName}"，影响 ${updatedPostsCount} 个帖子`,
        affectedPosts: updatedPostsCount,
      };
    } catch (error) {
      handleTagOperationError(error, '删除');
    }
  }

  /**
   * 恢复已删除的标签
   */
  async restoreTag(params: {
    deletedTagName: string;
    adminId: string;
    reason?: string;
  }): Promise<TagOperationResult> {
    const { deletedTagName, adminId, reason } = params;

    try {
      if (!deletedTagName.startsWith('[DELETED]')) {
        throw TRPCErrorHandler.validationError('只能恢复已删除的标签');
      }

      const originalTagName = getOriginalTagName(deletedTagName);

      const posts = await this.db.post.findMany({
        where: { tags: { contains: deletedTagName } },
        select: { id: true, tags: true },
      });

      validateTagExists(posts, deletedTagName);

      let updatedPostsCount = 0;

      for (const post of posts) {
        if (post.tags) {
          try {
            const tags = parsePostTags(post.tags);
            let hasChanges = false;
            const newTags = tags.map(tag => {
              if (tag === deletedTagName) {
                hasChanges = true;
                return originalTagName;
              }
              return tag;
            });

            if (hasChanges) {
              await this.db.post.update({
                where: { id: post.id },
                data: {
                  tags: JSON.stringify(newTags),
                  updatedAt: new Date(),
                },
              });
              updatedPostsCount++;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 记录操作日志
      await this.logAuditAction({
        userId: adminId,
        action: 'RESTORE_TAG',
        message: `恢复标签: ${deletedTagName} -> ${originalTagName}`,
        resource: 'TAG',
        resourceId: originalTagName,
        details: {
          oldValues: { deletedTagName },
          newValues: { originalTagName, affectedPosts: updatedPostsCount, reason },
        },
      });

      logTagOperation('恢复', [deletedTagName], { originalTagName, affectedPosts: updatedPostsCount });

      return {
        success: true,
        message: `成功恢复标签 "${originalTagName}"，影响 ${updatedPostsCount} 个帖子`,
        affectedPosts: updatedPostsCount,
      };
    } catch (error) {
      handleTagOperationError(error, '恢复');
    }
  }

  /**
   * 记录审计日志
   */
  private async logAuditAction(params: {
    userId: string;
    action: string;
    message: string;
    resource: string;
    resourceId: string;
    details: any;
  }): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          message: params.message,
          resource: params.resource,
          resourceId: params.resourceId,
          details: JSON.stringify(params.details),
        },
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createTagManagementService = (db: PrismaClient) => new TagManagementService(db);

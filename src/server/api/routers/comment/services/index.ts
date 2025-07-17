/**
 * @fileoverview Comment服务工厂
 * @description 统一导出Comment相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { CommentReactionService } from './comment-reaction-service';
import { CommentInteractionService } from './comment-interaction-service';

/**
 * 创建Comment反应服务实例
 */
export const commentReactionService = (db: PrismaClient) => new CommentReactionService(db);

/**
 * 创建Comment交互服务实例
 */
export const commentInteractionService = (db: PrismaClient) => new CommentInteractionService(db);

/**
 * 导出所有服务类型
 */
export type {
  CommentReactionType,
  CommentReactionResult,
  CommentLikeStatus,
} from './comment-reaction-service';

export type {
  BatchCommentLikeStatus,
  CommentReactionStatsResult,
} from './comment-interaction-service';

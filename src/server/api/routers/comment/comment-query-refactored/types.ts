/**
 * @fileoverview 评论查询类型定义
 * @description 评论查询系统相关的所有类型、接口和枚举定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始comment-query.ts文件中提取类型定义
 * - 确保100%向后兼容性
 */

import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

/**
 * tRPC上下文类型
 */
export interface TRPCContext {
  session: Session | null;
  prisma: PrismaClient;
  [key: string]: any; // 允许其他属性以保持兼容性
}

/**
 * 扩展的Session类型，兼容实际的tRPC上下文
 */
export interface ExtendedSession {
  user: {
    id: string;
    username?: string;
    email?: string | null;
    userLevel?: string;
    [key: string]: any;
  };
  expires?: string;
}

/**
 * 评论查询基础参数
 */
export interface BaseCommentQueryParams {
  limit: number;
  cursor?: string;
}

/**
 * 获取评论列表参数
 */
export interface GetCommentsParams extends BaseCommentQueryParams {
  contentId: string;
  parentId?: string;
  includeOwn: boolean;
  guestSessionId?: string;
  sortBy: 'newest' | 'popular' | 'following';
}

/**
 * 获取待审核评论参数
 */
export interface GetPendingCommentsParams extends BaseCommentQueryParams {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/**
 * 管理员查询参数
 */
export interface AdminQueryParams {
  limit: number;
  userLevel?: string;
  includeGuests: boolean;
}

/**
 * 用户评论查询参数
 */
export interface GetUserCommentsParams extends BaseCommentQueryParams {
  userId?: string;
  username?: string;
}

/**
 * 评论作者信息
 */
export interface CommentAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  userLevel: string;
  isVerified: boolean;
}

/**
 * 评论帖子信息
 */
export interface CommentPost {
  id: string;
  title: string;
  contentType?: string;
  author?: {
    username: string;
    displayName: string;
  };
}

/**
 * 评论数据结构
 */
export interface CommentData {
  id: string;
  postId: string;
  authorId: string | null;
  parentId: string | null;
  content: string;
  mentions?: any;
  isDeleted: boolean;
  guestName: string | null;
  guestContact: string | null;
  guestIp: string | null;
  guestSessionId: string | null;
  likeCount: number;
  replyCount: number;
  isPinned: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  author?: CommentAuthor | null;
  post?: CommentPost;
  _count?: {
    replies: number;
  };
}

/**
 * 评论查询结果
 */
export interface CommentQueryResult {
  comments: CommentData[];
  nextCursor?: string;
  total?: number;
}

/**
 * 热门评论数据（带热度分数）
 */
export interface HotCommentData extends CommentData {
  hotScore: number;
}

/**
 * 点踩评论数据（带点踩数）
 */
export interface DislikedCommentData extends CommentData {
  dislikeCount: number;
  likes: any[];
}

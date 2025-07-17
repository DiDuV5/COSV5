/**
 * @fileoverview 评论查询常量和配置
 * @description 评论查询系统使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { CommentSortBy, CommentStatus, UserLevel } from './types';

/**
 * 默认查询配置
 */
export const DEFAULT_QUERY_CONFIG = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_SORT_BY: 'latest' as CommentSortBy,
  INCLUDE_OWN: false,
  INCLUDE_GUESTS: true,
  INCLUDE_DELETED: false,
} as const;

/**
 * 评论状态列表
 */
export const COMMENT_STATUSES: CommentStatus[] = [
  'PENDING',
  'APPROVED', 
  'REJECTED'
];

/**
 * 用户级别列表
 */
export const USER_LEVELS: UserLevel[] = [
  'GUEST',
  'USER',
  'VIP', 
  'CREATOR',
  'ADMIN',
  'SUPER_ADMIN',
  'ALL'
];

/**
 * 排序方式列表
 */
export const SORT_BY_OPTIONS: CommentSortBy[] = [
  'latest',
  'popular',
  'following'
];

/**
 * 管理员用户级别
 */
export const ADMIN_USER_LEVELS = ['ADMIN', 'SUPER_ADMIN'] as const;

/**
 * 评论选择字段
 */
export const COMMENT_SELECT_FIELDS = {
  id: true,
  postId: true,
  authorId: true,
  parentId: true,
  content: true,
  mentions: true,
  isDeleted: true,
  guestName: true,
  guestContact: true,
  guestIp: true,
  guestSessionId: true,
  likeCount: true,
  replyCount: true,
  isPinned: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * 作者选择字段
 */
export const AUTHOR_SELECT_FIELDS = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  userLevel: true,
  isVerified: true,
} as const;

/**
 * 帖子选择字段
 */
export const POST_SELECT_FIELDS = {
  id: true,
  title: true,
  contentType: true,
  author: {
    select: {
      username: true,
      displayName: true,
    },
  },
} as const;

/**
 * 审核者选择字段
 */
export const REVIEWER_SELECT_FIELDS = {
  id: true,
  username: true,
  displayName: true,
} as const;

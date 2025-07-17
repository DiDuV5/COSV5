/**
 * @fileoverview 评论相关类型定义
 * @description 提供评论系统的所有类型定义和接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { Comment, Prisma } from '@prisma/client';
import { PaginationParams } from '../base-repository';

/**
 * 评论创建输入类型
 */
export type CommentCreateInput = Prisma.CommentCreateInput;

/**
 * 评论更新输入类型
 */
export type CommentUpdateInput = Prisma.CommentUpdateInput;

/**
 * 评论查询条件类型
 */
export type CommentWhereInput = Prisma.CommentWhereInput;

/**
 * 评论详细信息（包含关联数据）
 */
export interface CommentWithDetails extends Comment {
  author?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    userLevel: string;
    isVerified: boolean;
  } | null;
  replies?: CommentWithDetails[];
  _count: {
    replies: number;
  };
  isLiked?: boolean;
}

/**
 * 评论搜索参数
 */
export interface CommentSearchParams {
  postId?: string;
  authorId?: string;
  parentId?: string;
  status?: 'PUBLISHED' | 'PENDING' | 'REJECTED';
  sortBy?: 'latest' | 'oldest' | 'popular';
}

/**
 * 评论排序选项
 */
export type CommentSortBy = 'latest' | 'oldest' | 'popular' | 'replies';

/**
 * 评论状态枚举
 */
export type CommentStatus = 'PUBLISHED' | 'PENDING' | 'REJECTED';

/**
 * 评论查询选项
 */
export interface CommentQueryOptions {
  includeReplies?: boolean;
  includeAuthor?: boolean;
  includeDeleted?: boolean;
  maxDepth?: number;
}

/**
 * 评论统计信息
 */
export interface CommentStats {
  totalComments: number;
  publishedComments: number;
  pendingComments: number;
  rejectedComments: number;
  totalReplies: number;
  averageRepliesPerComment: number;
}

/**
 * 评论审核结果
 */
export interface CommentModerationResult {
  id: string;
  status: CommentStatus;
  moderatedAt: Date;
  moderatedBy: string;
  reason?: string;
}

/**
 * 评论批量操作结果
 */
export interface CommentBatchResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * 评论树节点
 */
export interface CommentTreeNode extends CommentWithDetails {
  children: CommentTreeNode[];
  depth: number;
}

/**
 * 评论查询过滤器
 */
export interface CommentFilter {
  postId?: string;
  authorId?: string;
  parentId?: string;
  status?: CommentStatus;
  isPinned?: boolean;
  isDeleted?: boolean;
  hasReplies?: boolean;
  likeCountMin?: number;
  content?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * 评论排序配置
 */
export interface CommentSortConfig {
  field: 'createdAt' | 'updatedAt' | 'likesCount' | 'repliesCount';
  direction: 'asc' | 'desc';
}

/**
 * 评论分页查询参数
 */
export interface CommentPaginationParams extends PaginationParams {
  sortBy?: CommentSortBy;
  filter?: CommentFilter;
}

/**
 * 评论关系查询参数
 */
export interface CommentRelationParams {
  includeParent?: boolean;
  includeChildren?: boolean;
  maxDepth?: number;
  sortChildren?: CommentSortConfig;
}

/**
 * 评论管理操作类型
 */
export type CommentManagementAction = 'pin' | 'unpin' | 'approve' | 'reject' | 'delete' | 'restore';

/**
 * 评论管理操作结果
 */
export interface CommentManagementResult {
  id: string;
  action: CommentManagementAction;
  success: boolean;
  message?: string;
  timestamp: Date;
}

/**
 * 评论导出格式
 */
export interface CommentExportData {
  id: string;
  content: string;
  authorUsername: string;
  postTitle: string;
  createdAt: string;
  status: string;
  repliesCount: number;
}

/**
 * 评论导入数据
 */
export interface CommentImportData {
  content: string;
  authorId: string;
  postId: string;
  parentId?: string;
  status?: CommentStatus;
}

/**
 * 评论验证规则
 */
export interface CommentValidationRules {
  minLength: number;
  maxLength: number;
  allowHtml: boolean;
  bannedWords: string[];
  requireApproval: boolean;
}

/**
 * 评论通知配置
 */
export interface CommentNotificationConfig {
  notifyAuthor: boolean;
  notifyMentioned: boolean;
  notifyReplies: boolean;
  emailNotifications: boolean;
}

/**
 * 评论缓存键配置
 */
export interface CommentCacheConfig {
  commentDetails: string;
  postComments: string;
  userComments: string;
  commentReplies: string;
  commentStats: string;
  ttl: number;
}

/**
 * 评论错误类型
 */
export type CommentErrorType =
  | 'COMMENT_NOT_FOUND'
  | 'COMMENT_DELETED'
  | 'COMMENT_ACCESS_DENIED'
  | 'COMMENT_VALIDATION_FAILED'
  | 'COMMENT_MODERATION_FAILED'
  | 'COMMENT_CACHE_ERROR'
  | 'COMMENT_DATABASE_ERROR';

/**
 * 评论错误信息
 */
export interface CommentError {
  type: CommentErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * 评论操作上下文
 */
export interface CommentOperationContext {
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 评论权限检查结果
 */
export interface CommentPermissionResult {
  canRead: boolean;
  canWrite: boolean;
  canModerate: boolean;
  canDelete: boolean;
  reason?: string;
}

/**
 * 评论内容分析结果
 */
export interface CommentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  toxicity: number;
  spam: boolean;
  language: string;
  topics: string[];
}

/**
 * 评论模板
 */
export interface CommentTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  isActive: boolean;
}

/**
 * 评论配置
 */
export interface CommentConfig {
  enabled: boolean;
  requireLogin: boolean;
  requireApproval: boolean;
  maxDepth: number;
  validation: CommentValidationRules;
  notifications: CommentNotificationConfig;
  cache: CommentCacheConfig;
}

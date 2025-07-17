/**
 * @fileoverview 评论查询类型定义
 * @description 评论查询系统相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 评论排序方式
 */
export type CommentSortBy = 'latest' | 'popular' | 'following';

/**
 * 评论状态
 */
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * 用户级别
 */
export type UserLevel = 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN' | 'ALL';

/**
 * 分页参数接口
 */
export interface PaginationParams {
  limit: number;
  cursor?: string;
  page?: number;
}

/**
 * 评论查询基础参数接口
 */
export interface BaseCommentQueryParams extends PaginationParams {
  includeDeleted?: boolean;
  includeOwn?: boolean;
  guestSessionId?: string;
}

/**
 * 公开评论查询参数接口
 */
export interface PublicCommentQueryParams extends BaseCommentQueryParams {
  contentId: string;
  parentId?: string;
  sortBy?: CommentSortBy;
}

/**
 * 管理员评论查询参数接口
 */
export interface AdminCommentQueryParams extends BaseCommentQueryParams {
  status?: CommentStatus;
  userLevel?: UserLevel;
  includeGuests?: boolean;
}

/**
 * 用户评论查询参数接口
 */
export interface UserCommentQueryParams extends BaseCommentQueryParams {
  userId?: string;
  username?: string;
}

/**
 * 评论作者信息接口
 */
export interface CommentAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  userLevel: string;
  isVerified: boolean;
}

/**
 * 评论关联帖子信息接口
 */
export interface CommentPost {
  id: string;
  title: string;
  contentType?: string;
  author?: {
    username: string;
    displayName?: string | null;
  };
}

/**
 * 评论审核者信息接口
 */
export interface CommentReviewer {
  id: string;
  username: string;
  displayName?: string | null;
}

/**
 * 完整评论信息接口
 */
export interface CommentWithDetails {
  id: string;
  postId: string;
  authorId?: string | null;
  parentId?: string | null;
  content: string;
  mentions?: any;
  isDeleted: boolean;
  guestName?: string | null;
  guestContact?: string | null;
  guestIp?: string | null;
  guestSessionId?: string | null;
  likeCount: number;
  replyCount: number;
  isPinned: boolean;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
  author?: CommentAuthor | null;
  post?: CommentPost;
  reviewer?: CommentReviewer | null;
  _count?: {
    replies: number;
  };
  hotScore?: number;
  dislikeCount?: number;
}

/**
 * 评论查询结果接口
 */
export interface CommentQueryResult {
  comments: CommentWithDetails[];
  nextCursor?: string;
  total?: number;
}

/**
 * 查询条件构建器接口
 */
export interface CommentQueryConditionBuilder {
  buildWhereCondition(params: any): any;
  buildOrderByCondition(sortBy?: CommentSortBy): any[];
  buildUserLevelCondition(userLevel?: UserLevel, includeGuests?: boolean): any;
  buildPermissionWhereCondition(params: PublicCommentQueryParams, userId?: string, isAdmin?: boolean): any;
}

/**
 * 数据格式化器接口
 */
export interface CommentDataFormatter {
  formatComment(comment: any): CommentWithDetails;
  formatComments(comments: any[]): CommentWithDetails[];
  formatQueryResult(comments: any[], nextCursor?: string, total?: number): CommentQueryResult;
}

/**
 * @fileoverview 统一的评论仓储类
 * @description 整合所有评论操作模块，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

import { PrismaClient, Comment } from '@prisma/client';
import { BaseRepository, QueryOptions, PaginatedResult, PaginationParams } from '../base-repository';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

// 导入所有功能模块
import { CommentCrudOperations } from './comment-crud';
import { CommentQueryBasicOperations } from './comment-query-basic';
import { CommentQueryAdvancedOperations } from './comment-query-advanced';
import { CommentRelationsTreeOperations } from './comment-relations-tree';
import { CommentRelationsOperationsClass } from './comment-relations-operations';
import { CommentManagementOperations } from './comment-management';

// 导入类型定义
import {
  CommentCreateInput,
  CommentUpdateInput,
  CommentWhereInput,
  CommentWithDetails,
  CommentSearchParams,
  CommentPaginationParams,
  CommentFilter,
  CommentStatus,
  CommentModerationResult,
  CommentBatchResult,
  CommentManagementAction,
  CommentManagementResult,
  CommentOperationContext,
  CommentTreeNode,
  CommentRelationParams,
} from './comment-types';

/**
 * 统一的评论仓储类
 * 整合所有评论相关操作，保持向后兼容性
 */
export class CommentRepository {
  // 功能模块实例
  private crudOps: CommentCrudOperations;
  private queryBasicOps: CommentQueryBasicOperations;
  private queryAdvancedOps: CommentQueryAdvancedOperations;
  private relationsTreeOps: CommentRelationsTreeOperations;
  private relationsOps: CommentRelationsOperationsClass;
  private managementOps: CommentManagementOperations;
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;

    // 初始化功能模块
    this.crudOps = new CommentCrudOperations(db);
    this.queryBasicOps = new CommentQueryBasicOperations(db);
    this.queryAdvancedOps = new CommentQueryAdvancedOperations(db);
    this.relationsTreeOps = new CommentRelationsTreeOperations(db);
    this.relationsOps = new CommentRelationsOperationsClass(db);
    this.managementOps = new CommentManagementOperations(db);
  }

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentRepository.${operation} error:`, error);
  }

  // ==================== CRUD 操作 ====================

  /**
   * 创建评论
   */
  async createComment(
    data: CommentCreateInput,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.crudOps.createComment(data, context);
  }

  /**
   * 更新评论
   */
  async updateComment(
    id: string,
    data: CommentUpdateInput,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.crudOps.updateComment(id, data, context);
  }

  /**
   * 删除评论（硬删除）
   */
  async deleteComment(
    id: string,
    context?: CommentOperationContext
  ): Promise<void> {
    return this.crudOps.deleteComment(id, context);
  }

  /**
   * 获取评论详细信息
   */
  async findByIdWithDetails(
    id: string,
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<CommentWithDetails | null> {
    return this.crudOps.findByIdWithDetails(id, currentUserId, options);
  }

  /**
   * 根据ID获取评论（简单版本）
   */
  async findById(id: string, options: QueryOptions = {}): Promise<Comment | null> {
    return this.crudOps.findById(id, options);
  }

  /**
   * 检查评论是否存在
   */
  async commentExists(id: string): Promise<boolean> {
    return this.crudOps.commentExists(id);
  }

  /**
   * 检查评论是否存在（向后兼容）
   */
  async exists(where: CommentWhereInput): Promise<boolean> {
    if (typeof where === 'string') {
      // 如果传入的是字符串，当作ID处理
      return this.commentExists(where as any);
    }
    return this.crudOps.exists(where);
  }

  /**
   * 获取评论数量
   */
  async count(where: CommentWhereInput = {}): Promise<number> {
    return this.crudOps.count(where);
  }

  /**
   * 批量创建评论
   */
  async createMany(
    data: CommentCreateInput[],
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    return this.crudOps.createMany(data, context);
  }

  /**
   * 批量更新评论
   */
  async updateMany(
    where: CommentWhereInput,
    data: CommentUpdateInput,
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    return this.crudOps.updateMany(where, data, context);
  }

  /**
   * 批量删除评论（硬删除）
   */
  async deleteMany(
    where: CommentWhereInput,
    context?: CommentOperationContext
  ): Promise<{ count: number }> {
    return this.crudOps.deleteMany(where, context);
  }

  /**
   * 获取评论的基础统计信息
   */
  async getBasicStats(): Promise<{
    total: number;
    published: number;
    pending: number;
    deleted: number;
  }> {
    return this.crudOps.getBasicStats();
  }

  // ==================== 查询操作 ====================

  /**
   * 获取帖子的评论列表
   */
  async findByPost(
    postId: string,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions & { includeReplies?: boolean } = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryBasicOps.findByPost(postId, pagination, currentUserId, options);
  }

  /**
   * 获取用户的评论列表
   */
  async findByAuthor(
    authorId: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryBasicOps.findByAuthor(authorId, pagination, options);
  }

  /**
   * 搜索评论
   */
  async searchComments(
    params: CommentSearchParams,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryBasicOps.searchComments(params, pagination, options);
  }

  /**
   * 根据过滤条件查询评论
   */
  async findByFilter(
    filter: CommentFilter,
    pagination: CommentPaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryAdvancedOps.findByFilter(filter, pagination, options);
  }

  /**
   * 获取热门评论
   */
  async getPopularComments(
    postId?: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryAdvancedOps.getPopularComments(postId, pagination, options);
  }

  /**
   * 获取最新评论
   */
  async getLatestComments(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.queryAdvancedOps.getLatestComments(pagination, options);
  }

  // ==================== 关系操作 ====================

  /**
   * 获取评论的回复列表
   */
  async findReplies(
    parentId: string,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.relationsTreeOps.findReplies(parentId, pagination, currentUserId, options);
  }

  /**
   * 获取评论的所有子评论（递归）
   */
  async findAllReplies(
    parentId: string,
    maxDepth: number = 3,
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<CommentWithDetails[]> {
    return this.relationsTreeOps.findAllReplies(parentId, maxDepth, currentUserId);
  }

  /**
   * 构建评论树结构
   */
  async buildCommentTree(
    postId: string,
    maxDepth: number = 3,
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<CommentTreeNode[]> {
    return this.relationsTreeOps.buildCommentTree(postId, maxDepth, currentUserId, options);
  }

  /**
   * 获取评论的父评论链
   */
  async getCommentParentChain(
    commentId: string,
    options: QueryOptions = {}
  ): Promise<CommentWithDetails[]> {
    return this.relationsTreeOps.getCommentParentChain(commentId);
  }

  /**
   * 获取评论的直接子评论数量
   */
  async getDirectRepliesCount(commentId: string): Promise<number> {
    return this.relationsOps.getDirectRepliesCount(commentId);
  }

  /**
   * 获取评论的所有子评论数量（递归）
   */
  async getTotalRepliesCount(commentId: string): Promise<number> {
    return this.relationsOps.getTotalRepliesCount(commentId);
  }

  /**
   * 检查评论是否为另一个评论的子评论
   */
  async isReplyOf(childId: string, parentId: string): Promise<boolean> {
    return this.relationsOps.isReplyOf(childId, parentId);
  }

  /**
   * 获取评论的根评论
   */
  async getRootComment(commentId: string): Promise<CommentWithDetails | null> {
    return this.relationsOps.getRootComment(commentId);
  }

  /**
   * 获取评论的深度
   */
  async getCommentDepth(commentId: string): Promise<number> {
    return this.relationsOps.getCommentDepth(commentId);
  }

  /**
   * 移动评论到新的父评论下
   */
  async moveComment(
    commentId: string,
    newParentId: string | null,
    context?: CommentOperationContext
  ): Promise<CommentWithDetails> {
    return this.relationsOps.moveComment(commentId, newParentId, context);
  }

  // ==================== 管理操作 ====================

  /**
   * 获取待审核的评论
   */
  async getPendingComments(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.managementOps.getPendingComments(pagination, options);
  }

  /**
   * 软删除评论
   */
  async softDelete(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.managementOps.softDelete(id, context);
  }

  /**
   * 恢复已删除的评论
   */
  async restore(
    id: string,
    originalContent: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.managementOps.restore(id, originalContent, context);
  }

  /**
   * 置顶评论
   */
  async pin(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.managementOps.pin(id, context);
  }

  /**
   * 取消置顶评论
   */
  async unpin(
    id: string,
    context?: CommentOperationContext
  ): Promise<Comment> {
    return this.managementOps.unpin(id, context);
  }

  /**
   * 审核评论（批准或拒绝）
   */
  async moderate(
    id: string,
    status: CommentStatus,
    reason?: string,
    context?: CommentOperationContext
  ): Promise<CommentModerationResult> {
    return this.managementOps.moderate(id, status, reason, context);
  }

  /**
   * 批量审核评论
   */
  async batchModerate(
    ids: string[],
    status: CommentStatus,
    reason?: string,
    context?: CommentOperationContext
  ): Promise<CommentBatchResult> {
    return this.managementOps.batchModerate(ids, status, reason, context);
  }

  /**
   * 批量删除评论
   */
  async batchDelete(
    ids: string[],
    context?: CommentOperationContext
  ): Promise<CommentBatchResult> {
    return this.managementOps.batchDelete(ids, context);
  }

  /**
   * 执行管理操作
   */
  async executeManagementAction(
    id: string,
    action: CommentManagementAction,
    context?: CommentOperationContext,
    params?: any
  ): Promise<CommentManagementResult> {
    return this.managementOps.executeManagementAction(id, action, context, params);
  }

  /**
   * 获取评论管理统计
   */
  async getManagementStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    deleted: number;
    pinned: number;
  }> {
    return this.managementOps.getManagementStats();
  }

  /**
   * 获取需要关注的评论
   */
  async getCommentsNeedingAttention(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    return this.managementOps.getCommentsNeedingAttention(pagination, options);
  }
}

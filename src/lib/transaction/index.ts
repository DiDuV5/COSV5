/**
 * @fileoverview 事务管理器 - 统一导出
 * @description 重构后的事务管理器，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './core';
export * from './monitor';
export * from './business';

// 为了完全向后兼容，创建TransactionManager类
import { TransactionCore } from './core';
import { TransactionMonitor } from './monitor';
import { BusinessTransactions } from './business';
import {
  TransactionResult,
  TransactionOptions,
  TransactionMetrics,
  TransactionOperation,
  PostWithMediaResult,
  PostDeleteResult,
  UserProfileUpdateResult,
  UserRegistrationResult,
  HealthCheckResult
} from './types';
import { Prisma } from '@prisma/client';

/**
 * 事务管理器 - 向后兼容包装器
 */
export class TransactionManager {
  private static monitor = TransactionMonitor.getInstance();

  /**
   * 执行数据库事务
   */
  static async executeTransaction<T>(
    operation: TransactionOperation<T>,
    options?: TransactionOptions
  ): Promise<TransactionResult<T>> {
    return TransactionCore.executeTransaction(operation, options);
  }

  /**
   * 获取事务指标
   */
  static getMetrics(): TransactionMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * 重置事务指标
   */
  static resetMetrics(): void {
    this.monitor.resetMetrics();
  }

  /**
   * 创建帖子和媒体记录的事务
   */
  static async createPostWithMedia(
    postData: Prisma.PostCreateInput,
    mediaData: Prisma.PostMediaCreateManyInput[]
  ): Promise<TransactionResult<PostWithMediaResult>> {
    return BusinessTransactions.createPostWithMedia(postData, mediaData);
  }

  /**
   * 软删除帖子
   */
  static async softDeletePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<PostDeleteResult>> {
    return BusinessTransactions.softDeletePost(postId, userId, reason);
  }

  /**
   * 恢复软删除的帖子
   */
  static async restorePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<{ post: any }>> {
    return BusinessTransactions.restorePost(postId, userId, reason);
  }

  /**
   * 永久删除帖子和相关数据
   */
  static async permanentDeletePost(
    postId: string,
    userId: string,
    reason?: string
  ): Promise<TransactionResult<PostDeleteResult>> {
    return BusinessTransactions.permanentDeletePost(postId, userId, reason);
  }

  /**
   * 更新用户信息的事务
   */
  static async updateUserProfile(
    userId: string,
    userData: Prisma.UserUpdateInput,
    avatarData?: Prisma.PostMediaCreateInput
  ): Promise<TransactionResult<UserProfileUpdateResult>> {
    return BusinessTransactions.updateUserProfile(userId, userData, avatarData);
  }

  /**
   * 批量操作的事务
   */
  static async batchOperation<T>(
    operations: Array<TransactionOperation<T>>
  ): Promise<TransactionResult<T[]>> {
    return TransactionCore.batchOperation(operations);
  }

  /**
   * 用户注册事务
   */
  static async registerUser(
    userData: Prisma.UserCreateInput,
    initialPermissions?: any
  ): Promise<TransactionResult<UserRegistrationResult>> {
    return BusinessTransactions.registerUser(userData, initialPermissions);
  }

  /**
   * 检查事务状态
   */
  static async healthCheck(): Promise<TransactionResult<HealthCheckResult>> {
    return TransactionCore.healthCheck();
  }
}

// 默认导出，保持向后兼容
export default TransactionManager;

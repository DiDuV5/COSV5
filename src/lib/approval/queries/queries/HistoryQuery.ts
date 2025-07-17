/**
 * @fileoverview 历史记录查询类
 * @description 审批历史记录的专门查询类
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseAuditQuery } from './BaseAuditQuery';
import {
  ApprovalAuditLog,
  ApprovalHistory,
  AuditLogQueryParams
} from '../../types/audit-types';
import { QueryResult } from '../types';
import { FormatUtils } from '../utils/formatUtils';
import { BATCH_OPERATION_ACTIONS, CACHE_CONFIG } from '../constants';

/**
 * 历史记录查询类
 */
export class HistoryQuery extends BaseAuditQuery {
  /**
   * 获取审批历史记录
   * @param params 查询参数
   * @returns 审批历史查询结果
   */
  async getApprovalHistory(params: AuditLogQueryParams = {}): Promise<QueryResult<ApprovalAuditLog>> {
    try {
      console.log(`🔍 查询审批历史记录，参数:`, {
        userId: params.userId,
        adminId: params.adminId,
        action: params.action,
        limit: params.limit,
        offset: params.offset
      });

      const result = await this.getAuditLogs(params);

      const dataArray = Array.isArray(result.data) ? result.data : [result.data];
      console.log(`✅ 查询完成: 返回 ${dataArray.length} 条记录，总计 ${result.total} 条`);
      return result;

    } catch (error) {
      console.error('❌ 查询审批历史失败:', error);
      throw TRPCErrorHandler.internalError('查询审批历史失败');
    }
  }

  /**
   * 获取用户审批历史
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns 用户审批历史
   */
  async getUserApprovalHistory(userId: string, limit: number = 20): Promise<ApprovalHistory[]> {
    try {
      console.log(`👤 查询用户审批历史: ${userId}`);

      const cacheKey = this.generateCacheKey('user-history', { userId, limit });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const histories = await prisma.approvalHistory.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
              user: {
                select: { username: true, email: true }
              },
              admin: {
                select: { username: true, displayName: true }
              }
            }
          });

          const formattedHistories = FormatUtils.formatApprovalHistories(histories);

          console.log(`✅ 用户历史查询完成: ${formattedHistories.length} 条记录`);
          return formattedHistories;
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

    } catch (error) {
      console.error('❌ 查询用户审批历史失败:', error);
      throw TRPCErrorHandler.internalError('查询用户审批历史失败');
    }
  }

  /**
   * 获取管理员操作历史
   * @param adminId 管理员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param limit 限制数量
   * @returns 管理员操作历史
   */
  async getAdminActionHistory(
    adminId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`👨‍💼 查询管理员操作历史: ${adminId}`);

      const cacheKey = this.generateCacheKey('admin-history', {
        adminId,
        startDate,
        endDate,
        limit
      });

      const result = await this.getCachedResult(
        cacheKey,
        async () => {
          const queryParams: AuditLogQueryParams = {
            adminId,
            startDate,
            endDate,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          };

          const queryResult = await this.getApprovalHistory(queryParams);
          return Array.isArray(queryResult.data) ? queryResult.data : [queryResult.data];
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

      return Array.isArray(result) ? result : [result];

    } catch (error) {
      console.error('❌ 查询管理员操作历史失败:', error);
      throw TRPCErrorHandler.internalError('查询管理员操作历史失败');
    }
  }

  /**
   * 获取批量操作记录
   * @param batchId 批次ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param limit 限制数量
   * @returns 批量操作记录
   */
  async getBatchOperations(
    batchId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`📦 查询批量操作记录: ${batchId || 'all'}`);

      const cacheKey = this.generateCacheKey('batch-operations', {
        batchId,
        startDate,
        endDate,
        limit
      });

      const result = await this.getCachedResult(
        cacheKey,
        async () => {
          const queryParams: AuditLogQueryParams = {
            actions: BATCH_OPERATION_ACTIONS,
            batchId,
            startDate,
            endDate,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          };

          const queryResult = await this.getApprovalHistory(queryParams);
          return Array.isArray(queryResult.data) ? queryResult.data : [queryResult.data];
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

      return Array.isArray(result) ? result : [result];

    } catch (error) {
      console.error('❌ 查询批量操作记录失败:', error);
      throw TRPCErrorHandler.internalError('查询批量操作记录失败');
    }
  }

  /**
   * 获取用户状态变更历史
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns 状态变更历史
   */
  async getUserStatusHistory(userId: string, limit: number = 10): Promise<ApprovalHistory[]> {
    try {
      console.log(`📊 查询用户状态变更历史: ${userId}`);

      const cacheKey = this.generateCacheKey('user-status-history', { userId, limit });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const histories = await prisma.approvalHistory.findMany({
            where: {
              userId,
              OR: [
                { action: 'APPROVE' },
                { action: 'REJECT' },
                { action: 'TIMEOUT' }
              ]
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
              user: {
                select: { username: true, email: true }
              },
              admin: {
                select: { username: true, displayName: true }
              }
            }
          });

          return FormatUtils.formatApprovalHistories(histories);
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

    } catch (error) {
      console.error('❌ 查询用户状态变更历史失败:', error);
      throw TRPCErrorHandler.internalError('查询用户状态变更历史失败');
    }
  }

  /**
   * 获取最近的审批决策
   * @param adminId 管理员ID
   * @param hours 时间范围（小时）
   * @param limit 限制数量
   * @returns 最近的审批决策
   */
  async getRecentApprovalDecisions(
    adminId?: string,
    hours: number = 24,
    limit: number = 20
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`⚖️ 查询最近的审批决策: ${adminId || 'all admins'}`);

      const cacheKey = this.generateCacheKey('recent-decisions', {
        adminId,
        hours,
        limit
      });

      const result = await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

          const queryParams: AuditLogQueryParams = {
            adminId,
            startDate,
            actions: ['APPROVE', 'REJECT'] as any,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          };

          const queryResult = await this.getApprovalHistory(queryParams);
          return Array.isArray(queryResult.data) ? queryResult.data : [queryResult.data];
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

      return Array.isArray(result) ? result : [result];

    } catch (error) {
      console.error('❌ 查询最近审批决策失败:', error);
      throw TRPCErrorHandler.internalError('查询最近审批决策失败');
    }
  }
}

/**
 * @fileoverview 基础审计查询类
 * @description 审计查询的基础类，提供通用查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  AuditQueryParams,
  QueryResult,
  QueryConditionBuilder,
  QueryValidator
} from '../types';
import { QueryConditionBuilderImpl, QueryValidatorImpl } from '../utils/queryUtils';
import { DataFormatterImpl, FormatUtils } from '../utils/formatUtils';
import { ApprovalAuditLog } from '../../types/audit-types';
import { CACHE_CONFIG } from '../constants';

/**
 * 基础审计查询类
 */
export class BaseAuditQuery {
  protected conditionBuilder: QueryConditionBuilder;
  protected validator: QueryValidator;
  protected formatter: DataFormatterImpl;

  constructor() {
    this.conditionBuilder = new QueryConditionBuilderImpl();
    this.validator = new QueryValidatorImpl();
    this.formatter = new DataFormatterImpl();
  }

  /**
   * 获取审计日志列表
   * @param params 查询参数
   * @returns 审计日志查询结果
   */
  async getAuditLogs(params: AuditQueryParams): Promise<QueryResult<ApprovalAuditLog>> {
    try {
      // 验证查询参数
      const validatedParams = this.validator.validateQueryParams(params);

      // 构建查询条件
      const whereConditions = this.conditionBuilder.buildWhereConditions(validatedParams);
      const orderByConditions = this.conditionBuilder.buildOrderByConditions(validatedParams);

      // 添加搜索条件
      if (validatedParams.searchTerm) {
        const searchConditions = this.conditionBuilder.buildSearchConditions({
          searchTerm: validatedParams.searchTerm,
          searchFields: validatedParams.searchFields
        });

        if (searchConditions.length > 0) {
          whereConditions.OR = [
            ...(whereConditions.OR || []),
            ...searchConditions
          ];
        }
      }

      // 执行查询
      const [logs, total] = await Promise.all([
        prisma.userApprovalLog.findMany({
          where: whereConditions,
          orderBy: orderByConditions,
          take: validatedParams.limit,
          skip: validatedParams.offset,
          include: {
            user: {
              select: {
                username: true,
                displayName: true
              }
            }
          }
        }),
        prisma.userApprovalLog.count({
          where: whereConditions
        })
      ]);

      // 格式化结果
      const formattedLogs = FormatUtils.formatAuditLogs(logs);

      return {
        data: formattedLogs,
        total,
        hasMore: (validatedParams.offset! + validatedParams.limit!) < total,
        page: Math.floor(validatedParams.offset! / validatedParams.limit!) + 1,
        pageSize: validatedParams.limit!
      } as any;

    } catch (error) {
      throw TRPCErrorHandler.internalError('获取审计日志失败');
    }
  }

  /**
   * 根据ID获取单个审计日志
   * @param id 日志ID
   * @returns 审计日志
   */
  async getAuditLogById(id: string): Promise<ApprovalAuditLog | null> {
    try {
      const log = await prisma.userApprovalLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              username: true,
              displayName: true
            }
          }
        }
      });

      if (!log) {
        return null;
      }

      return this.formatter.formatAuditLog(log);

    } catch (error) {
      throw TRPCErrorHandler.internalError('获取审计日志详情失败');
    }
  }

  /**
   * 获取审计日志总数
   * @param params 查询参数
   * @returns 总数
   */
  async getAuditLogsCount(params: AuditQueryParams): Promise<number> {
    try {
      const validatedParams = this.validator.validateQueryParams(params);
      const whereConditions = this.conditionBuilder.buildWhereConditions(validatedParams);

      return await prisma.userApprovalLog.count({
        where: whereConditions
      });

    } catch (error) {
      throw TRPCErrorHandler.internalError('获取审计日志总数失败');
    }
  }

  /**
   * 检查是否存在指定条件的审计日志
   * @param params 查询参数
   * @returns 是否存在
   */
  async hasAuditLogs(params: AuditQueryParams): Promise<boolean> {
    try {
      const validatedParams = this.validator.validateQueryParams(params);
      const whereConditions = this.conditionBuilder.buildWhereConditions(validatedParams);

      const log = await prisma.userApprovalLog.findFirst({
        where: whereConditions,
        select: { id: true }
      });

      return log !== null;

    } catch (error) {
      throw TRPCErrorHandler.internalError('检查审计日志存在性失败');
    }
  }

  /**
   * 获取缓存的查询结果
   * @param cacheKey 缓存键
   * @param queryFn 查询函数
   * @param ttl 缓存时间
   * @returns 查询结果
   */
  protected async getCachedResult<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = CACHE_CONFIG.SEARCH_RESULTS_TTL
  ): Promise<T> {
    try {
      // 尝试从缓存获取
      const cached = await redisCacheManager.get<T>(cacheKey);
      if (cached) {
        return cached;
      }

      // 执行查询
      const result = await queryFn();

      // 缓存结果
      await redisCacheManager.set(cacheKey, result, ttl);

      return result;

    } catch (error) {
      // 如果缓存失败，直接返回查询结果
      return await queryFn();
    }
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param params 参数
   * @returns 缓存键
   */
  protected generateCacheKey(prefix: string, params: any): string {
    const paramString = JSON.stringify(params);
    const hash = Buffer.from(paramString).toString('base64').slice(0, 16);
    return `audit:${prefix}:${hash}`;
  }

  /**
   * 清除相关缓存
   * @param pattern 缓存键模式
   */
  protected async clearCache(pattern: string): Promise<void> {
    try {
      await redisCacheManager.deletePattern(`audit:${pattern}:*`);
    } catch (error) {
      // 缓存清除失败不影响主要功能
      console.warn('清除审计查询缓存失败:', error);
    }
  }
}

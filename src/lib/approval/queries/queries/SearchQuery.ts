/**
 * @fileoverview 搜索查询类
 * @description 审计日志的搜索功能专门查询类
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { InputValidator } from '@/lib/security/input-validator';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseAuditQuery } from './BaseAuditQuery';
import { ApprovalAuditLog } from '../../types/audit-types';
import { SearchParams } from '../types';
import { FormatUtils } from '../utils/formatUtils';
import { CACHE_CONFIG, QUERY_LIMITS } from '../constants';

/**
 * 搜索查询类
 */
export class SearchQuery extends BaseAuditQuery {
  /**
   * 搜索审计日志（安全版本）
   * @param searchTerm 搜索词
   * @param searchFields 搜索字段
   * @param limit 限制数量
   * @returns 搜索结果
   */
  async searchAuditLogs(
    searchTerm: string,
    searchFields: ('adminName' | 'reason' | 'details')[] = ['adminName', 'reason'],
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      // 使用统一的输入验证器
      const sanitizedSearchTerm = InputValidator.validateSearchTerm(searchTerm);
      const validSearchFields = this.validator.validateSearchFields(searchFields);
      const safeLimit = InputValidator.validateNumber(limit, {
        min: 1,
        max: QUERY_LIMITS.MAX_LIMIT,
        integer: true
      });

      console.log(`🔍 搜索审计日志: "${sanitizedSearchTerm}"`);

      const cacheKey = this.generateCacheKey('search', {
        searchTerm: sanitizedSearchTerm,
        searchFields: validSearchFields,
        limit: safeLimit
      });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          // 构建搜索条件
          const searchConditions = this.conditionBuilder.buildSearchConditions({
            searchTerm: sanitizedSearchTerm,
            searchFields: validSearchFields as ('adminName' | 'reason' | 'details')[]
          });

          const logs = await prisma.userApprovalLog.findMany({
            where: {
              OR: searchConditions
            },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
            include: {
              user: {
                select: {
                  username: true,
                  displayName: true
                }
              }
            }
          });

          const formattedLogs = FormatUtils.formatAuditLogs(logs);

          console.log(`✅ 搜索完成: 找到 ${formattedLogs.length} 条匹配记录`);
          return formattedLogs;
        },
        CACHE_CONFIG.SEARCH_RESULTS_TTL
      );

    } catch (error) {
      console.error('❌ 搜索审计日志失败:', error);
      throw TRPCErrorHandler.internalError('搜索审计日志失败');
    }
  }

  /**
   * 高级搜索审计日志
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async advancedSearchAuditLogs(params: SearchParams & {
    adminId?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    limit?: number;
  }): Promise<ApprovalAuditLog[]> {
    try {
      const {
        searchTerm,
        searchFields = ['adminName', 'reason'],
        adminId,
        startDate,
        endDate,
        severity,
        limit = 50
      } = params;

      console.log(`🔍 高级搜索审计日志:`, { searchTerm, adminId, severity });

      const cacheKey = this.generateCacheKey('advanced-search', params);

      return await this.getCachedResult(
        cacheKey,
        async () => {
          // 构建基础查询条件
          const whereConditions: any = {};

          // 添加搜索条件
          if (searchTerm) {
            const searchConditions = this.conditionBuilder.buildSearchConditions({
              searchTerm,
              searchFields
            });
            whereConditions.OR = searchConditions;
          }

          // 添加管理员过滤
          if (adminId) {
            whereConditions.userId = adminId;
          }

          // 添加时间范围过滤
          if (startDate || endDate) {
            whereConditions.createdAt = {};
            if (startDate) whereConditions.createdAt.gte = startDate;
            if (endDate) whereConditions.createdAt.lte = endDate;
          }

          // 添加严重程度过滤
          if (severity) {
            whereConditions.details = {
              ...whereConditions.details,
              contains: `"severity":"${severity}"`
            };
          }

          const logs = await prisma.userApprovalLog.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
              user: {
                select: {
                  username: true,
                  displayName: true
                }
              }
            }
          });

          return FormatUtils.formatAuditLogs(logs);
        },
        CACHE_CONFIG.SEARCH_RESULTS_TTL
      );

    } catch (error) {
      console.error('❌ 高级搜索失败:', error);
      throw TRPCErrorHandler.internalError('高级搜索失败');
    }
  }

  /**
   * 按关键词搜索
   * @param keyword 关键词
   * @param limit 限制数量
   * @returns 搜索结果
   */
  async searchByKeyword(keyword: string, limit: number = 30): Promise<ApprovalAuditLog[]> {
    try {
      const sanitizedKeyword = InputValidator.validateSearchTerm(keyword);

      console.log(`🔑 按关键词搜索: "${sanitizedKeyword}"`);

      return await this.searchAuditLogs(
        sanitizedKeyword,
        ['adminName', 'reason', 'details'],
        limit
      );

    } catch (error) {
      console.error('❌ 关键词搜索失败:', error);
      throw TRPCErrorHandler.internalError('关键词搜索失败');
    }
  }

  /**
   * 按管理员名称搜索
   * @param adminName 管理员名称
   * @param limit 限制数量
   * @returns 搜索结果
   */
  async searchByAdminName(adminName: string, limit: number = 30): Promise<ApprovalAuditLog[]> {
    try {
      const sanitizedAdminName = InputValidator.validateSearchTerm(adminName);

      console.log(`👨‍💼 按管理员名称搜索: "${sanitizedAdminName}"`);

      return await this.searchAuditLogs(
        sanitizedAdminName,
        ['adminName'],
        limit
      );

    } catch (error) {
      console.error('❌ 管理员名称搜索失败:', error);
      throw TRPCErrorHandler.internalError('管理员名称搜索失败');
    }
  }

  /**
   * 按原因搜索
   * @param reason 原因
   * @param limit 限制数量
   * @returns 搜索结果
   */
  async searchByReason(reason: string, limit: number = 30): Promise<ApprovalAuditLog[]> {
    try {
      const sanitizedReason = InputValidator.validateSearchTerm(reason);

      console.log(`📝 按原因搜索: "${sanitizedReason}"`);

      return await this.searchAuditLogs(
        sanitizedReason,
        ['reason'],
        limit
      );

    } catch (error) {
      console.error('❌ 原因搜索失败:', error);
      throw TRPCErrorHandler.internalError('原因搜索失败');
    }
  }

  /**
   * 模糊搜索
   * @param term 搜索词
   * @param threshold 相似度阈值
   * @param limit 限制数量
   * @returns 搜索结果
   */
  async fuzzySearch(
    term: string,
    threshold: number = 0.7,
    limit: number = 20
  ): Promise<ApprovalAuditLog[]> {
    try {
      const sanitizedTerm = InputValidator.validateSearchTerm(term);

      console.log(`🔍 模糊搜索: "${sanitizedTerm}" (阈值: ${threshold})`);

      const cacheKey = this.generateCacheKey('fuzzy-search', {
        term: sanitizedTerm,
        threshold,
        limit
      });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          // 使用PostgreSQL的相似度搜索（如果支持）
          const logs = await prisma.userApprovalLog.findMany({
            where: {
              OR: [
                {
                  reason: {
                    contains: sanitizedTerm,
                    mode: 'insensitive'
                  }
                }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
              user: {
                select: {
                  username: true,
                  displayName: true
                }
              }
            }
          });

          return FormatUtils.formatAuditLogs(logs);
        },
        CACHE_CONFIG.SEARCH_RESULTS_TTL
      );

    } catch (error) {
      console.error('❌ 模糊搜索失败:', error);
      throw TRPCErrorHandler.internalError('模糊搜索失败');
    }
  }

  /**
   * 获取搜索建议
   * @param partial 部分搜索词
   * @param limit 限制数量
   * @returns 搜索建议
   */
  async getSearchSuggestions(partial: string, limit: number = 10): Promise<string[]> {
    try {
      const sanitizedPartial = InputValidator.validateSearchTerm(partial);

      if (sanitizedPartial.length < 2) {
        return [];
      }

      console.log(`💡 获取搜索建议: "${sanitizedPartial}"`);

      const cacheKey = this.generateCacheKey('suggestions', { partial: sanitizedPartial, limit });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          // 从审计日志中提取常见的搜索词
          const logs = await prisma.userApprovalLog.findMany({
            where: {
              reason: {
                contains: sanitizedPartial,
                mode: 'insensitive'
              }
            },
            take: limit * 2,
            select: {
              reason: true,
              metadata: true
            }
          });

          const suggestions = new Set<string>();

          logs.forEach((log: any) => {
            try {
              const metadata = FormatUtils.safeParseJSON(log.metadata);
              if (metadata.adminName && metadata.adminName.toLowerCase().includes(sanitizedPartial.toLowerCase())) {
                suggestions.add(metadata.adminName);
              }
              if (log.reason && log.reason.toLowerCase().includes(sanitizedPartial.toLowerCase())) {
                suggestions.add(log.reason);
              }
            } catch {
              // 忽略解析错误
            }
          });

          return Array.from(suggestions).slice(0, limit);
        },
        CACHE_CONFIG.SEARCH_RESULTS_TTL
      );

    } catch (error) {
      console.error('❌ 获取搜索建议失败:', error);
      return [];
    }
  }
}

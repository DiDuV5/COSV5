/**
 * @fileoverview 搜索查询器
 * @description 提供审计日志的搜索功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取搜索功能
 * - 确保100%向后兼容性
 */

import { prisma } from '@/lib/prisma';
import { InputValidator } from '@/lib/security/input-validator';
import { BaseAuditQuery } from './base-query';
import {
  ApprovalAuditLog,
  SearchField
} from './types';

/**
 * 搜索查询器
 */
export class SearchQuery extends BaseAuditQuery {
  /**
   * 验证搜索字段
   * @param searchFields 搜索字段数组
   */
  private static validateSearchFields(searchFields: SearchField[]): SearchField[] {
    const allowedFields: SearchField[] = ['adminName', 'reason', 'details'];
    const validFields = searchFields.filter(field => allowedFields.includes(field));

    if (validFields.length === 0) {
      throw new Error('至少需要指定一个有效的搜索字段');
    }

    return validFields;
  }

  /**
   * 构建搜索条件
   * @param searchTerm 搜索词
   * @param searchFields 搜索字段
   */
  private static buildSearchConditions(searchTerm: string, searchFields: SearchField[]) {
    return searchFields.map(field => {
      switch (field) {
        case 'adminName':
          return { details: { contains: searchTerm, mode: 'insensitive' as const } };
        case 'reason':
          // 安全的JSON字段搜索，避免JSON注入
          return {
            details: {
              contains: JSON.stringify({ reason: searchTerm }).slice(1, -1), // 移除外层大括号
              mode: 'insensitive' as const
            }
          };
        case 'details':
          return { details: { contains: searchTerm, mode: 'insensitive' as const } };
        default:
          return {};
      }
    }).filter(condition => Object.keys(condition).length > 0);
  }

  /**
   * 搜索审计日志（安全版本）
   * @param searchTerm 搜索词
   * @param searchFields 搜索字段
   * @param limit 限制数量
   */
  static async searchAuditLogs(
    searchTerm: string,
    searchFields: SearchField[] = ['adminName', 'reason'],
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      // 使用统一的输入验证器
      const sanitizedSearchTerm = InputValidator.validateSearchTerm(searchTerm);
      const validSearchFields = this.validateSearchFields(searchFields);
      const safeLimit = InputValidator.validateNumber(limit, { min: 1, max: 100, integer: true });

      console.log(`🔍 搜索审计日志: "${sanitizedSearchTerm}"`);

      // 构建搜索条件（使用安全的搜索方式）
      const searchConditions = this.buildSearchConditions(sanitizedSearchTerm, validSearchFields);

      const logs = await prisma.auditLog.findMany({
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

      // 转换数据格式
      const formattedLogs: ApprovalAuditLog[] = logs.map(log => this.formatAuditLog(log));

      console.log(`✅ 搜索完成: 找到 ${formattedLogs.length} 条匹配记录`);
      return formattedLogs;

    } catch (error) {
      console.error('❌ 搜索审计日志失败:', error);
      throw error;
    }
  }
}

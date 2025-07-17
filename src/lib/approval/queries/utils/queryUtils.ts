/**
 * @fileoverview 查询工具函数
 * @description 审计查询的工具函数和辅助方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { InputValidator } from '@/lib/security/input-validator';
import {
  AuditQueryParams,
  QueryConditionBuilder,
  QueryValidator,
  PaginationParams,
  TimeRangeParams,
  SearchParams,
  SortParams
} from '../types';
import {
  DEFAULT_QUERY_CONFIG,
  ALLOWED_SEARCH_FIELDS,
  ALLOWED_SORT_FIELDS,
  QUERY_LIMITS
} from '../constants';

/**
 * 查询条件构建器实现
 */
export class QueryConditionBuilderImpl implements QueryConditionBuilder {
  /**
   * 构建WHERE条件
   * @param params 查询参数
   * @returns WHERE条件对象
   */
  buildWhereConditions(params: AuditQueryParams): any {
    const whereConditions: any = {};

    // 用户ID条件
    if (params.userId) {
      whereConditions.OR = [
        { userId: params.userId },
        { details: { contains: `"targetUserId":"${params.userId}"` } }
      ];
    }

    // 管理员ID条件
    if (params.adminId) {
      whereConditions.userId = params.adminId;
    }

    // 单个操作类型条件
    if (params.action) {
      whereConditions.action = params.action;
    }

    // 多个操作类型条件
    if (params.actions && params.actions.length > 0) {
      whereConditions.action = { in: params.actions };
    }

    // 时间范围条件
    const timeCondition = this.buildTimeRangeCondition(params);
    if (timeCondition) {
      whereConditions.createdAt = timeCondition;
    }

    // 批次ID条件
    if (params.batchId) {
      whereConditions.details = {
        ...whereConditions.details,
        contains: `"batchId":"${params.batchId}"`
      };
    }

    // 严重程度条件
    if (params.severity) {
      whereConditions.details = {
        ...whereConditions.details,
        contains: `"severity":"${params.severity}"`
      };
    }

    // IP地址条件
    if (params.ipAddress) {
      whereConditions.ipAddress = params.ipAddress;
    }

    return whereConditions;
  }

  /**
   * 构建ORDER BY条件
   * @param params 排序参数
   * @returns ORDER BY条件对象
   */
  buildOrderByConditions(params: SortParams): any {
    const sortBy = params.sortBy || DEFAULT_QUERY_CONFIG.SORT_BY;
    const sortOrder = params.sortOrder || DEFAULT_QUERY_CONFIG.SORT_ORDER;

    // 将timestamp映射为createdAt字段
    const fieldName = sortBy === 'timestamp' ? 'createdAt' : sortBy;

    return {
      [fieldName]: sortOrder
    };
  }

  /**
   * 构建搜索条件
   * @param params 搜索参数
   * @returns 搜索条件数组
   */
  buildSearchConditions(params: SearchParams): any[] {
    const { searchTerm, searchFields = ['adminName', 'reason'] } = params;

    if (!searchTerm) {
      return [];
    }

    const sanitizedSearchTerm = InputValidator.validateSearchTerm(searchTerm);

    return searchFields.map(field => {
      switch (field) {
        case 'adminName':
          return {
            details: {
              contains: sanitizedSearchTerm,
              mode: 'insensitive' as const
            }
          };
        case 'reason':
          // 安全的JSON字段搜索
          return {
            details: {
              contains: JSON.stringify({ reason: sanitizedSearchTerm }).slice(1, -1),
              mode: 'insensitive' as const
            }
          };
        case 'details':
          return {
            details: {
              contains: sanitizedSearchTerm,
              mode: 'insensitive' as const
            }
          };
        default:
          return {};
      }
    }).filter(condition => Object.keys(condition).length > 0);
  }

  /**
   * 构建时间范围条件
   * @param params 时间范围参数
   * @returns 时间条件对象
   */
  private buildTimeRangeCondition(params: TimeRangeParams): any {
    const condition: any = {};

    if (params.startDate) {
      condition.gte = params.startDate;
    }

    if (params.endDate) {
      condition.lte = params.endDate;
    }

    // 如果指定了小时数，计算开始时间
    if (params.hours && !params.startDate) {
      condition.gte = new Date(Date.now() - params.hours * 60 * 60 * 1000);
    }

    // 如果指定了天数，计算开始时间
    if (params.days && !params.startDate) {
      condition.gte = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
    }

    return Object.keys(condition).length > 0 ? condition : null;
  }
}

/**
 * 查询验证器实现
 */
export class QueryValidatorImpl implements QueryValidator {
  /**
   * 验证查询参数
   * @param params 查询参数
   * @returns 验证后的参数
   */
  validateQueryParams(params: AuditQueryParams): AuditQueryParams {
    const validated = { ...params };

    // 验证分页参数
    validated.limit = this.validateLimit(params.limit);
    validated.offset = this.validateOffset(params.offset);

    // 验证排序参数
    validated.sortBy = this.validateSortBy(params.sortBy) as 'action' | 'timestamp' | 'adminName' | undefined;
    validated.sortOrder = this.validateSortOrder(params.sortOrder);

    // 验证搜索字段
    if (params.searchFields) {
      validated.searchFields = this.validateSearchFields(params.searchFields) as ('adminName' | 'reason' | 'details')[];
    }

    // 验证时间范围
    if (params.startDate || params.endDate || params.hours || params.days) {
      const timeRange = this.validateTimeRange(params);
      Object.assign(validated, timeRange);
    }

    return validated;
  }

  /**
   * 验证搜索字段
   * @param fields 搜索字段数组
   * @returns 验证后的字段数组
   */
  validateSearchFields(fields: string[]): string[] {
    const validFields = fields.filter(field =>
      ALLOWED_SEARCH_FIELDS.includes(field as any)
    );

    if (validFields.length === 0) {
      throw new Error('至少需要指定一个有效的搜索字段');
    }

    return validFields;
  }

  /**
   * 验证时间范围
   * @param params 时间范围参数
   * @returns 验证后的时间范围参数
   */
  validateTimeRange(params: TimeRangeParams): TimeRangeParams {
    const validated: TimeRangeParams = {};

    if (params.startDate) {
      validated.startDate = new Date(params.startDate);
    }

    if (params.endDate) {
      validated.endDate = new Date(params.endDate);
    }

    if (params.hours) {
      validated.hours = Math.max(1, Math.min(params.hours, 24 * QUERY_LIMITS.MAX_TIME_RANGE_DAYS));
    }

    if (params.days) {
      validated.days = Math.max(1, Math.min(params.days, QUERY_LIMITS.MAX_TIME_RANGE_DAYS));
    }

    // 验证开始时间不能晚于结束时间
    if (validated.startDate && validated.endDate && validated.startDate > validated.endDate) {
      throw new Error('开始时间不能晚于结束时间');
    }

    return validated;
  }

  /**
   * 验证分页参数
   * @param params 分页参数
   * @returns 验证后的分页参数
   */
  validatePagination(params: PaginationParams): PaginationParams {
    return {
      limit: this.validateLimit(params.limit),
      offset: this.validateOffset(params.offset),
    };
  }

  /**
   * 验证限制数量
   * @param limit 限制数量
   * @returns 验证后的限制数量
   */
  private validateLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_QUERY_CONFIG.LIMIT;
    }

    return InputValidator.validateNumber(limit, {
      min: QUERY_LIMITS.MIN_LIMIT,
      max: QUERY_LIMITS.MAX_LIMIT,
      integer: true
    });
  }

  /**
   * 验证偏移量
   * @param offset 偏移量
   * @returns 验证后的偏移量
   */
  private validateOffset(offset?: number): number {
    if (offset === undefined) {
      return DEFAULT_QUERY_CONFIG.OFFSET;
    }

    return InputValidator.validateNumber(offset, {
      min: 0,
      integer: true
    });
  }

  /**
   * 验证排序字段
   * @param sortBy 排序字段
   * @returns 验证后的排序字段
   */
  private validateSortBy(sortBy?: string): string {
    if (!sortBy || !ALLOWED_SORT_FIELDS.includes(sortBy as any)) {
      return DEFAULT_QUERY_CONFIG.SORT_BY;
    }
    return sortBy;
  }

  /**
   * 验证排序顺序
   * @param sortOrder 排序顺序
   * @returns 验证后的排序顺序
   */
  private validateSortOrder(sortOrder?: string): 'asc' | 'desc' {
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return DEFAULT_QUERY_CONFIG.SORT_ORDER;
    }
    return sortOrder;
  }
}

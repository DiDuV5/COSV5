/**
 * @fileoverview 标签业务逻辑服务（重构版）
 * @description 统一导出标签相关的业务逻辑，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler as _TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

// 导入重构后的服务
import {
  tagStatsService,
  tagManagementService,
  tagSearchService,
  type TagStats,
  type TagWithStats,
  type TagOperationResult,
  type TagSearchResult,
  type TagSuggestion,
} from './services/index';

/**
 * 标签统计服务（重构版 - 使用统计服务）
 */
export class TagStatsService {
  /**
   * 获取单个标签的统计信息
   */
  static async getTagStats(db: PrismaClient, tagName: string): Promise<TagStats> {
    const statsService = tagStatsService(db);
    return await statsService.getTagStats(tagName);
  }

  /**
   * 获取多个标签的统计信息
   */
  static async getMultipleTagStats(db: PrismaClient, tagNames: string[]): Promise<Record<string, TagStats>> {
    const statsService = tagStatsService(db);
    return await statsService.getMultipleTagStats(tagNames);
  }

  /**
   * 获取热门标签
   */
  static async getTrendingTags(
    db: PrismaClient,
    limit: number,
    timeRange: string
  ): Promise<{
    topTags: TagWithStats[];
    timeRange: string;
    totalTags: number;
    totalPosts: number;
    dateRange: { start: Date; end: Date };
    trendDays: string[];
  }> {
    const statsService = tagStatsService(db);
    return await statsService.getTrendingTags(limit, timeRange);
  }

  /**
   * 获取标签使用趋势
   */
  static async getTagTrends(
    db: PrismaClient,
    params: {
      tagNames: string[];
      timeRange: string;
      granularity?: 'day' | 'week' | 'month';
    }
  ): Promise<{
    trends: Array<{
      tagName: string;
      data: Array<{ date: string; count: number; views: number; likes: number }>;
    }>;
    dateRange: { start: Date; end: Date };
  }> {
    const statsService = tagStatsService(db);
    return await statsService.getTagTrends(params);
  }

  /**
   * 获取标签相关性分析
   */
  static async getTagCorrelations(
    db: PrismaClient,
    tagName: string,
    limit: number = 10
  ): Promise<Array<{
    tagName: string;
    correlation: number;
    coOccurrence: number;
  }>> {
    const statsService = tagStatsService(db);
    return await statsService.getTagCorrelations(tagName, limit);
  }
}

/**
 * 标签管理服务（重构版 - 使用管理服务）
 */
export class TagManagementService {
  /**
   * 合并标签
   */
  static async mergeTags(
    db: PrismaClient,
    sourceTagNames: string[],
    targetTagName: string,
    adminId: string,
    reason?: string
  ): Promise<TagOperationResult> {
    const managementService = tagManagementService(db);
    return await managementService.mergeTags({
      sourceTagNames,
      targetTagName,
      adminId,
      reason,
    });
  }

  /**
   * 重命名标签
   */
  static async renameTag(
    db: PrismaClient,
    oldName: string,
    newName: string,
    adminId: string,
    reason?: string
  ): Promise<TagOperationResult> {
    const managementService = tagManagementService(db);
    return await managementService.renameTag({
      oldName,
      newName,
      adminId,
      reason,
    });
  }

  /**
   * 删除标签
   */
  static async deleteTag(
    db: PrismaClient,
    tagName: string,
    adminId: string,
    reason?: string
  ): Promise<TagOperationResult> {
    const managementService = tagManagementService(db);
    return await managementService.deleteTag({
      tagName,
      adminId,
      reason,
    });
  }

  /**
   * 恢复已删除的标签
   */
  static async restoreTag(
    db: PrismaClient,
    deletedTagName: string,
    adminId: string,
    reason?: string
  ): Promise<TagOperationResult> {
    const managementService = tagManagementService(db);
    return await managementService.restoreTag({
      deletedTagName,
      adminId,
      reason,
    });
  }
}

/**
 * 标签搜索服务（重构版 - 使用搜索服务）
 */
export class TagSearchService {
  /**
   * 搜索标签
   */
  static async searchTags(
    db: PrismaClient,
    params: {
      query: string;
      limit?: number;
      includeDeleted?: boolean;
      sortBy?: 'relevance' | 'count' | 'recent';
    }
  ): Promise<TagSearchResult[]> {
    const searchService = tagSearchService(db);
    return await searchService.searchTags(params);
  }

  /**
   * 获取标签建议
   */
  static async getTagSuggestions(
    db: PrismaClient,
    params: {
      input: string;
      limit?: number;
      excludeTags?: string[];
    }
  ): Promise<TagSuggestion[]> {
    const searchService = tagSearchService(db);
    return await searchService.getTagSuggestions(params);
  }

  /**
   * 获取热门标签
   */
  static async getPopularTags(
    db: PrismaClient,
    params: {
      limit?: number;
      timeRange?: 'day' | 'week' | 'month' | 'all';
      category?: string;
    }
  ): Promise<TagSearchResult[]> {
    const searchService = tagSearchService(db);
    return await searchService.getPopularTags(params);
  }

  /**
   * 获取相关标签
   */
  static async getRelatedTags(
    db: PrismaClient,
    tagName: string,
    limit: number = 10
  ): Promise<TagSuggestion[]> {
    const searchService = tagSearchService(db);
    return await searchService.getRelatedTags(tagName, limit);
  }
}

// 导出类型
export type {
  TagStats,
  TagWithStats,
  TagOperationResult,
  TagSearchResult,
  TagSuggestion,
};

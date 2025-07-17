/**
 * @fileoverview 标签服务工厂
 * @description 统一导出标签相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TagStatsService } from './tag-stats-service';
import { TagManagementService } from './tag-management-service';
import { TagSearchService } from './tag-search-service';

/**
 * 创建标签统计服务实例
 */
export const tagStatsService = (db: PrismaClient) => new TagStatsService(db);

/**
 * 创建标签管理服务实例
 */
export const tagManagementService = (db: PrismaClient) => new TagManagementService(db);

/**
 * 创建标签搜索服务实例
 */
export const tagSearchService = (db: PrismaClient) => new TagSearchService(db);

/**
 * 导出所有服务类型
 */
export type {
  TagStats,
  TagWithStats,
} from '../schemas';

export type {
  TagOperationResult,
} from './tag-management-service';

export type {
  TagSearchResult,
  TagSuggestion,
} from './tag-search-service';

// 导出服务类
export { TagManagementService } from './tag-management-service';
export { TagStatsService } from './tag-stats-service';
export { TagSearchService } from './tag-search-service';

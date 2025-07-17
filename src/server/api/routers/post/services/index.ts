/**
 * @fileoverview Post服务工厂
 * @description 统一导出Post相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { PostQueryService } from './post-query-service';
import { PostStatsService } from './post-stats-service';
import { PostSearchService } from './post-search-service';
import { PostReactionService } from './post-reaction-service';
import { PostInteractionService } from './post-interaction-service';

/**
 * 创建Post查询服务实例
 */
export const postQueryService = (db: PrismaClient) => new PostQueryService(db);

/**
 * 创建Post统计服务实例
 */
export const postStatsService = (db: PrismaClient) => new PostStatsService(db);

/**
 * 创建Post搜索服务实例
 */
export const postSearchService = (db: PrismaClient) => new PostSearchService(db);

/**
 * 创建Post反应服务实例
 */
export const postReactionService = (db: PrismaClient) => new PostReactionService(db);

/**
 * 创建Post交互服务实例
 */
export const postInteractionService = (db: PrismaClient) => new PostInteractionService(db);

/**
 * 导出所有服务类型
 */
export type {
  PostQueryParams,
  PostQueryResult,
} from './post-query-service';

export type {
  StatsTimeRange,
  TrendingStats,
  UserStats,
} from './post-stats-service';

export type {
  SearchParams,
  SearchResult,
} from './post-search-service';

export type {
  ReactionType,
  ReactionResult,
  LikeStatus,
} from './post-reaction-service';

export type {
  BatchLikeStatus,
  ReactionStatsResult,
} from './post-interaction-service';

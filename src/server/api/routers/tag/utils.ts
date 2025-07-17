/**
 * @fileoverview 标签路由工具函数
 * @description 包含标签相关的辅助函数和常量
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType as _BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { TIME_RANGES, HEAT_SCORE_WEIGHTS } from "./schemas";

/**
 * 验证标签名称格式
 */
export function validateTagName(tagName: string): void {
  if (!tagName || tagName.trim().length === 0) {
    throw TRPCErrorHandler.validationError("标签名称不能为空");
  }

  if (tagName.length > 50) {
    throw TRPCErrorHandler.validationError("标签名称不能超过50个字符");
  }

  // 检查是否包含特殊字符
  const invalidChars = /[<>"'&]/;
  if (invalidChars.test(tagName)) {
    throw TRPCErrorHandler.validationError("标签名称不能包含特殊字符");
  }
}

/**
 * 验证标签是否存在
 */
export function validateTagExists(posts: any[], tagName: string): void {
  if (posts.length === 0) {
    throw TRPCErrorHandler.notFound(`标签 "${tagName}" 不存在`);
  }
}

/**
 * 验证标签不能重复
 */
export function validateTagNotDuplicate(sourceTagNames: string[], targetTagName: string): void {
  if (sourceTagNames.includes(targetTagName)) {
    throw TRPCErrorHandler.validationError("目标标签不能与源标签相同");
  }
}

/**
 * 计算时间范围的开始时间
 */
export function calculateTimeRangeStart(timeRange: string): Date {
  const now = new Date();

  switch (timeRange) {
    case 'day':
      return new Date(now.getTime() - TIME_RANGES.day);
    case 'week':
      return new Date(now.getTime() - TIME_RANGES.week);
    case 'month':
      return new Date(now.getTime() - TIME_RANGES.month);
    case 'year':
      return new Date(now.getTime() - TIME_RANGES.year);
    case 'all':
    default:
      return new Date(0); // 从最早开始
  }
}

/**
 * 计算标签热度分数
 */
export function calculateHeatScore(stats: {
  count: number;
  views: number;
  likes: number;
  comments: number;
}): number {
  return Math.round(
    stats.count * HEAT_SCORE_WEIGHTS.postCount +
    stats.views * HEAT_SCORE_WEIGHTS.viewWeight +
    stats.likes * HEAT_SCORE_WEIGHTS.likeWeight +
    stats.comments * HEAT_SCORE_WEIGHTS.commentWeight
  );
}

/**
 * 解析帖子标签
 */
export function parsePostTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];

  try {
    const tags = JSON.parse(tagsJson);
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

/**
 * 检查标签是否被删除
 */
export function isDeletedTag(tagName: string): boolean {
  return tagName.startsWith('[DELETED]');
}

/**
 * 获取删除标签的原始名称
 */
export function getOriginalTagName(deletedTagName: string): string {
  return deletedTagName.replace('[DELETED]', '');
}

/**
 * 生成删除标签名称
 */
export function generateDeletedTagName(tagName: string): string {
  return `[DELETED]${tagName}`;
}

/**
 * 过滤相关标签（排除当前标签）
 */
export function filterRelatedTags(tags: string[], currentTag: string): string[] {
  return tags.filter(tag =>
    tag !== currentTag &&
    !isDeletedTag(tag) &&
    tag.trim().length > 0
  );
}

/**
 * 计算标签相关性分数
 */
export function calculateRelatedness(
  tagA: string,
  tagB: string,
  coOccurrences: number,
  totalA: number,
  totalB: number
): number {
  // 使用 Jaccard 相似度计算相关性
  const union = totalA + totalB - coOccurrences;
  return union > 0 ? coOccurrences / union : 0;
}

/**
 * 生成标签统计摘要
 */
export function generateTagStatsSummary(stats: {
  count: number;
  views: number;
  likes: number;
  comments: number;
}): string {
  return `使用次数: ${stats.count}, 总浏览: ${stats.views}, 总点赞: ${stats.likes}, 总评论: ${stats.comments}`;
}

/**
 * 验证批量操作权限
 */
export function validateBatchOperationPermission(
  itemCount: number,
  maxAllowed: number = 50
): void {
  if (itemCount > maxAllowed) {
    throw TRPCErrorHandler.validationError(`批量操作最多支持 ${maxAllowed} 个项目`);
  }
}

/**
 * 记录标签操作日志
 */
export function logTagOperation(
  operation: string,
  tagName: string | string[],
  details?: any
): void {
  const tags = Array.isArray(tagName) ? tagName.join(', ') : tagName;
  console.log(`标签操作: ${operation}, 标签: ${tags}`, details ? `, 详情: ${JSON.stringify(details)}` : '');
}

/**
 * 处理标签操作错误
 */
export function handleTagOperationError(error: unknown, operation: string): never {
  console.error(`标签${operation}失败:`, error);

  if (error instanceof TRPCError) {
    throw error;
  }

  throw TRPCErrorHandler.internalError(`标签${operation}失败，请重试`);
}

/**
 * 生成分页偏移量
 */
export function calculatePaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * 生成分页元数据
 */
export function generatePaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 标准化标签名称（去除空格、转小写等）
 */
export function normalizeTagName(tagName: string): string {
  return tagName.trim().toLowerCase();
}

/**
 * 检查标签名称是否相似
 */
export function areTagsSimilar(tagA: string, tagB: string): boolean {
  const normalizedA = normalizeTagName(tagA);
  const normalizedB = normalizeTagName(tagB);

  // 完全相同
  if (normalizedA === normalizedB) return true;

  // 包含关系
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return true;
  }

  return false;
}

/**
 * 生成标签建议
 */
export function generateTagSuggestions(
  query: string,
  existingTags: string[],
  limit: number = 10
): string[] {
  const normalizedQuery = normalizeTagName(query);

  return existingTags
    .filter(tag => {
      const normalizedTag = normalizeTagName(tag);
      return normalizedTag.includes(normalizedQuery) && !isDeletedTag(tag);
    })
    .slice(0, limit);
}

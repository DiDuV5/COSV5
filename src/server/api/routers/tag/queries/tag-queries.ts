/**
 * @fileoverview 标签查询路由
 * @description 处理标签相关的查询功能
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  getRelatedSchema,
  getStatsSchema,
  searchSchema,
  getTrendingSchema,
  getPopularSchema,
  getMultipleStatsSchema,
} from "../schemas";
import {
  parsePostTags,
  // filterRelatedTags,
  // calculateRelatedness,
  calculateHeatScore,
  // generateTagSuggestions,
} from "../utils";
import { TagStatsService } from "../services";

export const tagQueriesRouter = createTRPCRouter({
  /**
   * 获取相关标签
   */
  getRelated: publicProcedure
    .input(getRelatedSchema)
    .query(async ({ ctx, input }) => {
      const { tag, limit } = input;

      // 获取包含该标签的帖子
      const posts = await ctx.db.post.findMany({
        where: {
          tags: { contains: tag },
          publishedAt: { not: null },
        },
        select: { tags: true },
      });

      // 统计共现标签
      const tagCounts = new Map<string, number>();
      const totalPosts = posts.length;

      posts.forEach((post: any) => {
        const tags = parsePostTags(post.tags);
        // 简单的相关标签过滤：排除当前标签
        const relatedTags = tags.filter((t: string) => t !== tag);

        relatedTags.forEach((relatedTag: any) => {
          tagCounts.set(relatedTag, (tagCounts.get(relatedTag) || 0) + 1);
        });
      });

      // 计算相关性并排序
      const relatedTags = Array.from(tagCounts.entries())
        .map(([tagName, count]) => ({
          name: tagName,
          count,
          relatedness: count / totalPosts, // 简单的相关性计算
        }))
        .sort((a, b) => b.relatedness - a.relatedness)
        .slice(0, limit);

      return { relatedTags };
    }),

  /**
   * 获取标签统计信息
   */
  getStats: publicProcedure
    .input(getStatsSchema)
    .query(async ({ ctx, input }) => {
      const stats = await TagStatsService.getTagStats(ctx.db, input.tag);
      return {
        tag: input.tag,
        ...stats,
        heatScore: calculateHeatScore(stats),
      };
    }),

  /**
   * 搜索标签
   */
  search: publicProcedure
    .input(searchSchema)
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      // 优化查询：使用数据库级别的文本搜索，避免N+1问题
      const posts = await ctx.db.post.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            { isPublic: true }, // 只搜索公开帖子
            { isDeleted: false }, // 排除软删除的内容
            {
              OR: [
                { tags: { contains: query, mode: 'insensitive' } },
                { title: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          tags: true,
          viewCount: true, // 用于排序
          likeCount: true  // 用于排序
        },
        take: 1000, // 限制查询数量，避免全表扫描
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' }
        ]
      });

      const tagCounts = new Map<string, number>();

      posts.forEach(post => {
        const tags = parsePostTags(post.tags);
        tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase()) && !tag.startsWith('[DELETED]')) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        });
      });

      const searchResults = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return { tags: searchResults };
    }),

  /**
   * 获取热门标签
   */
  getTrending: publicProcedure
    .input(getTrendingSchema)
    .query(async ({ ctx, input }) => {
      const { limit, timeRange } = input;
      return await TagStatsService.getTrendingTags(ctx.db, limit, timeRange);
    }),

  /**
   * 获取流行标签
   */
  getPopular: publicProcedure
    .input(getPopularSchema)
    .query(async ({ ctx, input }) => {
      const { limit } = input;

      // 获取所有已发布的帖子
      const posts = await ctx.db.post.findMany({
        where: { publishedAt: { not: null } },
        select: {
          tags: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
        },
      });

      const tagStats = new Map<string, {
        usageCount: number;
        totalViews: number;
        totalLikes: number;
        totalComments: number;
      }>();

      posts.forEach(post => {
        const tags = parsePostTags(post.tags);
        tags.forEach(tag => {
          if (!tag.startsWith('[DELETED]')) {
            if (!tagStats.has(tag)) {
              tagStats.set(tag, {
                usageCount: 0,
                totalViews: 0,
                totalLikes: 0,
                totalComments: 0,
              });
            }
            const stats = tagStats.get(tag)!;
            stats.usageCount++;
            stats.totalViews += post.viewCount || 0;
            stats.totalLikes += post.likeCount || 0;
            stats.totalComments += post.commentCount || 0;
          }
        });
      });

      const popularTags = Array.from(tagStats.entries())
        .map(([name, stats]) => ({
          name,
          ...stats,
          heatScore: calculateHeatScore({
            count: stats.usageCount,
            views: stats.totalViews,
            likes: stats.totalLikes,
            comments: stats.totalComments,
          }),
        }))
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, limit);

      return { popularTags };
    }),

  /**
   * 获取多个标签的统计信息
   */
  getMultipleStats: publicProcedure
    .input(getMultipleStatsSchema)
    .query(async ({ ctx, input }) => {
      const statsMap = await TagStatsService.getMultipleTagStats(ctx.db, input.tags);

      const results = Object.entries(statsMap).map(([tag, stats]) => ({
        tag,
        ...stats,
        heatScore: calculateHeatScore(stats),
      }));

      return { tagStats: results };
    }),

  /**
   * 获取标签建议
   */
  getSuggestions: publicProcedure
    .input(searchSchema)
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      // 获取所有标签
      const posts = await ctx.db.post.findMany({
        where: { publishedAt: { not: null } },
        select: { tags: true },
      });

      const allTags = new Set<string>();
      posts.forEach(post => {
        const tags = parsePostTags(post.tags);
        tags.forEach(tag => {
          if (!tag.startsWith('[DELETED]')) {
            allTags.add(tag);
          }
        });
      });

      // 简单的标签建议实现
      const suggestions = Array.from(allTags)
        .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map(tag => ({ name: tag, score: 1 }));

      return { suggestions };
    }),
});

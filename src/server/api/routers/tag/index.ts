/**
 * @fileoverview 标签路由组合文件
 * @description 组合所有标签相关的子路由，提供统一的标签API接口
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { tagQueriesRouter } from "./queries/tag-queries";
import { adminQueriesRouter } from "./queries/admin-queries";
import { tagMutationsRouter } from "./mutations/tag-mutations";
import { getPopularSchema, getRelatedSchema, getStatsSchema } from "./schemas";
import { parsePostTags, calculateHeatScore } from "./utils";

/**
 * 标签路由 - 模块化重构版本
 *
 * 路由结构：
 * - 公共查询路由：标签搜索、统计、相关标签、热门标签
 * - 管理员查询路由：标签管理、使用趋势、详细统计
 * - 管理员变更路由：标签合并、重命名、删除、恢复
 */
export const tagRouter = createTRPCRouter({
  // 公共标签查询相关路由
  queries: tagQueriesRouter,

  // 管理员查询相关路由
  admin: adminQueriesRouter,

  // 标签管理相关路由
  mutations: tagMutationsRouter,

  // 兼容性方法：获取流行标签
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

  // 兼容性方法：获取相关标签
  getRelated: publicProcedure
    .input(getRelatedSchema)
    .query(async ({ ctx, input }) => {
      const { tag, limit } = input;

      // 获取包含该标签的帖子
      const posts = await ctx.db.post.findMany({
        where: {
          publishedAt: { not: null },
          tags: {
            contains: tag,
          },
        },
        select: {
          tags: true,
        },
        take: 100, // 限制查询数量以提高性能
      });

      // 统计与该标签共同出现的其他标签
      const relatedTagCounts = new Map<string, number>();

      posts.forEach(post => {
        const tags = parsePostTags(post.tags);
        if (tags.includes(tag)) {
          tags.forEach(otherTag => {
            if (otherTag !== tag && !otherTag.startsWith('[DELETED]')) {
              relatedTagCounts.set(otherTag, (relatedTagCounts.get(otherTag) || 0) + 1);
            }
          });
        }
      });

      // 按出现频率排序并返回前N个
      const relatedTags = Array.from(relatedTagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return relatedTags;
    }),

  // 兼容性方法：获取标签统计
  getStats: publicProcedure
    .input(getStatsSchema)
    .query(async ({ ctx, input }) => {
      const { tag } = input;

      // 获取包含该标签的帖子统计
      const posts = await ctx.db.post.findMany({
        where: {
          publishedAt: { not: null },
          tags: {
            contains: tag,
          },
        },
        select: {
          viewCount: true,
          likeCount: true,
          commentCount: true,
        },
      });

      const stats = posts.reduce(
        (acc, post) => ({
          count: acc.count + 1,
          views: acc.views + (post.viewCount || 0),
          likes: acc.likes + (post.likeCount || 0),
          comments: acc.comments + (post.commentCount || 0),
        }),
        { count: 0, views: 0, likes: 0, comments: 0 }
      );

      return stats;
    }),
});

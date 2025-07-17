/**
 * @fileoverview 管理员标签查询路由
 * @description 处理管理员专用的标签查询和统计功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  getAllForAdminSchema,
  getStatsForAdminSchema,
  // type AdminTagInfo,
} from "../schemas";
import {
  parsePostTags,
  isDeletedTag,
  getOriginalTagName,
  calculateHeatScore,
  calculatePaginationOffset,
  generatePaginationMeta,
} from "../utils";

export const adminQueriesRouter = createTRPCRouter({
  /**
   * 获取所有标签（管理员专用）
   */
  getAllForAdmin: adminProcedure
    .input(getAllForAdminSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, sortBy, sortOrder, status } = input;

      // 获取所有帖子的标签数据
      const posts = await ctx.db.post.findMany({
        select: {
          tags: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 统计标签信息
      const tagInfoMap = new Map<string, {
        count: number;
        views: number;
        likes: number;
        comments: number;
        firstUsed: Date;
        lastUsed: Date;
        status: 'active' | 'disabled' | 'deleted';
      }>();

      posts.forEach((post: any) => {
        const tags = parsePostTags(post.tags);
        const postDate = post.publishedAt || post.createdAt;

        tags.forEach(tag => {
          let actualTagName = tag;
          let tagStatus: 'active' | 'disabled' | 'deleted' = 'active';

          if (isDeletedTag(tag)) {
            actualTagName = getOriginalTagName(tag);
            tagStatus = 'deleted';
          }

          if (!tagInfoMap.has(actualTagName)) {
            tagInfoMap.set(actualTagName, {
              count: 0,
              views: 0,
              likes: 0,
              comments: 0,
              firstUsed: postDate,
              lastUsed: postDate,
              status: tagStatus,
            });
          }

          const info = tagInfoMap.get(actualTagName)!;
          info.count++;
          info.views += post.viewCount || 0;
          info.likes += post.likeCount || 0;
          info.comments += post.commentCount || 0;

          if (postDate < info.firstUsed) {
            info.firstUsed = postDate;
          }
          if (postDate > info.lastUsed) {
            info.lastUsed = postDate;
          }

          // 如果当前是删除状态，更新状态
          if (tagStatus === 'deleted') {
            info.status = 'deleted';
          }
        });
      });

      // 转换为数组并过滤
      let tagList = Array.from(tagInfoMap.entries()).map(([name, info]) => ({
        name,
        ...info,
      }));

      // 应用搜索过滤
      if (search) {
        tagList = tagList.filter(tag =>
          tag.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      // 应用状态过滤
      if (status !== 'all') {
        tagList = tagList.filter(tag => tag.status === status);
      }

      // 排序
      tagList.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'count':
            comparison = a.count - b.count;
            break;
          case 'created':
            comparison = a.firstUsed.getTime() - b.firstUsed.getTime();
            break;
          case 'updated':
            comparison = a.lastUsed.getTime() - b.lastUsed.getTime();
            break;
          default:
            comparison = a.count - b.count;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // 分页
      const total = tagList.length;
      const offset = calculatePaginationOffset(page, limit);
      const paginatedTags = tagList.slice(offset, offset + limit);

      return {
        tags: paginatedTags,
        pagination: generatePaginationMeta(total, page, limit),
      };
    }),

  /**
   * 获取标签统计信息（管理员专用）
   */
  getStatsForAdmin: adminProcedure
    .input(getStatsForAdminSchema)
    .query(async ({ ctx, input }) => {
      const { timeRange, limit } = input;

      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      // 获取时间范围内的帖子
      const posts = await ctx.db.post.findMany({
        where: {
          publishedAt: {
            not: null,
            gte: startDate,
          },
        },
        select: {
          tags: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          publishedAt: true,
        },
      });

      // 统计标签数据
      const tagStats = new Map<string, {
        count: number;
        views: number;
        likes: number;
        comments: number;
        isDeleted: boolean;
      }>();

      let totalActiveTags = 0;
      let totalDeletedTags = 0;
      const totalPosts = posts.length;

      posts.forEach((post: any) => {
        const tags = parsePostTags(post.tags);
        tags.forEach(tag => {
          let actualTagName = tag;
          let isDeleted = false;

          if (isDeletedTag(tag)) {
            actualTagName = getOriginalTagName(tag);
            isDeleted = true;
          }

          if (!tagStats.has(actualTagName)) {
            tagStats.set(actualTagName, {
              count: 0,
              views: 0,
              likes: 0,
              comments: 0,
              isDeleted,
            });
          }

          const stats = tagStats.get(actualTagName)!;
          stats.count++;
          stats.views += post.viewCount || 0;
          stats.likes += post.likeCount || 0;
          stats.comments += post.commentCount || 0;

          if (isDeleted) {
            stats.isDeleted = true;
          }
        });
      });

      // 计算总数
      tagStats.forEach(stats => {
        if (stats.isDeleted) {
          totalDeletedTags++;
        } else {
          totalActiveTags++;
        }
      });

      // 获取热门标签
      const topTags = Array.from(tagStats.entries())
        .filter(([_, stats]) => !stats.isDeleted)
        .map(([name, stats]) => ({
          name,
          ...stats,
          heatScore: calculateHeatScore(stats),
        }))
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, limit);

      // 获取被删除的标签
      const deletedTags = Array.from(tagStats.entries())
        .filter(([_, stats]) => stats.isDeleted)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return {
        summary: {
          totalActiveTags,
          totalDeletedTags,
          totalUniqueTags: tagStats.size,
          totalPosts,
          timeRange,
          dateRange: {
            start: startDate,
            end: now,
          },
        },
        topTags,
        deletedTags,
      };
    }),

  /**
   * 获取标签使用趋势（管理员专用）
   */
  getUsageTrend: adminProcedure
    .input(getStatsForAdminSchema)
    .query(async ({ ctx, input }) => {
      const { timeRange } = input;

      const now = new Date();
      let startDate: Date;
      let groupBy: 'hour' | 'day' | 'week' | 'month';

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          groupBy = 'hour';
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'week';
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = 'month';
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
      }

      const posts = await ctx.db.post.findMany({
        where: {
          publishedAt: {
            not: null,
            gte: startDate,
          },
        },
        select: {
          tags: true,
          publishedAt: true,
        },
      });

      // 按时间分组统计
      const timeGroups = new Map<string, {
        totalTags: number;
        uniqueTags: Set<string>;
        posts: number;
      }>();

      posts.forEach((post: any) => {
        if (!post.publishedAt) return;

        let timeKey: string;
        const date = post.publishedAt;

        switch (groupBy) {
          case 'hour':
            timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            break;
          case 'day':
            timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            timeKey = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
            break;
          case 'month':
            timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            timeKey = date.toISOString().split('T')[0];
        }

        if (!timeGroups.has(timeKey)) {
          timeGroups.set(timeKey, {
            totalTags: 0,
            uniqueTags: new Set(),
            posts: 0,
          });
        }

        const group = timeGroups.get(timeKey)!;
        group.posts++;

        const tags = parsePostTags(post.tags);
        tags.forEach(tag => {
          if (!isDeletedTag(tag)) {
            group.totalTags++;
            group.uniqueTags.add(tag);
          }
        });
      });

      // 转换为数组并排序
      const trendData = Array.from(timeGroups.entries())
        .map(([timeKey, data]) => ({
          timeKey,
          totalTags: data.totalTags,
          uniqueTags: data.uniqueTags.size,
          posts: data.posts,
          avgTagsPerPost: data.posts > 0 ? data.totalTags / data.posts : 0,
        }))
        .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

      return {
        trendData,
        groupBy,
        timeRange,
        dateRange: {
          start: startDate,
          end: now,
        },
      };
    }),
});

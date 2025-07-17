/**
 * @fileoverview 用户搜索推荐路由
 * @description 处理用户搜索、推荐、@提及功能
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  searchForMentionSchema,
  getActiveForMentionSchema,
} from "../schemas";
import { UserSearchService } from "../services";

export const searchQueriesRouter = createTRPCRouter({
  /**
   * 搜索用户（用于@提及功能）
   */
  searchForMention: publicProcedure
    .input(searchForMentionSchema)
    .query(async ({ ctx, input }) => {
      const { query, limit, currentUserId } = input;

      return await UserSearchService.searchUsersForMention(
        ctx.db,
        query,
        limit,
        currentUserId
      );
    }),

  /**
   * 获取活跃用户推荐（用于@提及功能）
   */
  getActiveForMention: publicProcedure
    .input(getActiveForMentionSchema)
    .query(async ({ ctx, input }) => {
      const { limit, currentUserId } = input;

      return await UserSearchService.getActiveUsersForMention(
        ctx.db,
        limit,
        currentUserId
      );
    }),
});

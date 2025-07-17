/**
 * @fileoverview tRPC 服务器端客户端
 * @description 在服务器端使用的 tRPC 客户端
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.45.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import "server-only";

import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

const createContext = async () => {
  return createTRPCContext({});
};

// 定义API输入类型
interface GetUserPostsInput {
  userId: string;
  contentType?: "all" | "POST" | "MOMENT";
  filter?: "all" | "images" | "videos" | "text";
  sort?: "latest" | "popular" | "oldest";
  limit?: number;
  cursor?: string;
}

interface RecordVisitInput {
  profileId: string;
  userAgent?: string;
  visitorIp?: string;
}

export const api = {
  user: {
    getByUsername: async (input: { username: string }) => {
      const ctx = await createContext();
      const caller = appRouter.createCaller(ctx);
      return caller.user.getByUsername(input);
    },
    isFollowing: async (input: { userId: string }) => {
      const ctx = await createContext();
      const caller = appRouter.createCaller(ctx);
      return caller.user.isFollowing(input);
    },
  },
  post: {
    getUserPosts: async (input: GetUserPostsInput) => {
      const ctx = await createContext();
      const caller = appRouter.createCaller(ctx);
      return caller.post.getUserPosts(input);
    },
  },
  profile: {
    recordVisit: async (input: RecordVisitInput) => {
      const ctx = await createContext();
      const caller = appRouter.createCaller(ctx);
      return caller.profile.recordVisit(input);
    },
  },
};

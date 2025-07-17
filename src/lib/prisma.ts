/**
 * @fileoverview 简化的Prisma客户端配置（紧急修复版本）
 * @description 绕过优化配置，使用基本的Prisma客户端
 * @author Augment AI - Emergency Fix
 * @date 2025-07-17
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 使用简单的Prisma客户端配置
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      // 直接使用环境变量，优先使用COSEREEDEN_前缀
      url: process.env.COSEREEDEN_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 优雅关闭数据库连接
if (typeof window === 'undefined') {
  process.on("beforeExit", async () => {
    console.log('正在关闭数据库连接...');
    await prisma.$disconnect();
  });

  process.on("SIGINT", async () => {
    console.log('收到SIGINT信号，正在关闭数据库连接...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log('收到SIGTERM信号，正在关闭数据库连接...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

// 导出兼容性接口（保持API一致性）
export const connectionMonitor = {
  getInstance: () => ({
    getConnectionStats: () => ({ activeConnections: 0, totalConnections: 0 }),
    isHealthy: () => true,
  })
};

// 简化的批量查询服务，包含必要的userLoader方法
export const batchQueryService = {
  executeBatch: async (queries: any[]) => {
    // 简化的批量查询实现
    const results = [];
    for (const query of queries) {
      try {
        const result = await query();
        results.push(result);
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }
    return results;
  },

  // 添加userLoader方法以兼容现有代码
  userLoader: {
    loadUser: async (userId: string) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
            isActive: true,
            postsCount: true,
            followersCount: true,
            followingCount: true,
            likeCount: true,
            createdAt: true,
          },
        });
        return user;
      } catch (error) {
        console.error('加载用户失败:', error);
        return null;
      }
    }
  }
};

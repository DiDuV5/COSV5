/**
 * @fileoverview Prisma客户端工厂
 * @description 创建和配置优化的Prisma客户端实例
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, buildOptimizedDatabaseUrl } from './config';

/**
 * 创建优化的Prisma客户端
 */
export function createOptimizedPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();

  const logLevels: Array<'query' | 'info' | 'warn' | 'error'> = ['error'];

  if (config.enableLogging) {
    if (process.env.NODE_ENV === 'development') {
      logLevels.push('warn', 'query');
    } else {
      logLevels.push('warn');
    }
  }

  return new PrismaClient({
    log: logLevels,
    datasources: {
      db: {
        url: buildOptimizedDatabaseUrl(),
      },
    },
  });
}

/**
 * 检查数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const testPrisma = new PrismaClient();
    // 执行简单的查询来测试连接
    await testPrisma.$queryRaw`SELECT 1`;
    await testPrisma.$disconnect();
    return true;
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return false;
  }
}

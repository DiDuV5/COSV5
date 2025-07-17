/**
 * @fileoverview Redis监控管理路由
 * @description 提供Redis性能监控和管理的API接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '@/server/api/trpc';
import { RedisPerformanceMonitor } from '@/lib/monitoring/redis-performance-monitor';
import { RedisSecurityManager } from '@/lib/security/redis-security-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

// 创建全局监控和安全管理实例
const redisMonitor = new RedisPerformanceMonitor();
const securityManager = new RedisSecurityManager();

/**
 * Redis监控配置Schema
 */
const RedisMonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  intervalMs: z.number().min(5000).max(300000).default(30000), // 5秒到5分钟
  autoStart: z.boolean().default(true),
  alertThresholds: z.object({
    memoryUsagePercent: z.number().min(0).max(100).default(80),
    responseTimeMs: z.number().min(0).default(1000),
    errorRate: z.number().min(0).max(100).default(5),
    connectionCount: z.number().min(0).default(100),
  }).optional(),
});

/**
 * Redis监控查询Schema
 */
const RedisMonitoringQuerySchema = z.object({
  includeHistory: z.boolean().default(false),
  timeRange: z.enum(['1h', '6h', '24h', '7d']).default('1h'),
});

export const redisMonitoringRouter = createTRPCRouter({
  /**
   * 获取Redis性能指标
   */
  getMetrics: adminProcedure
    .input(RedisMonitoringQuerySchema.optional())
    .query(async ({ input }) => {
      try {
        const metrics = await redisMonitor.collectMetrics();
        const connectionPoolInfo = redisMonitor.getConnectionPoolInfo();
        const healthStatus = await redisMonitor.getHealthStatus();

        return {
          success: true,
          data: {
            metrics,
            connectionPool: connectionPoolInfo,
            health: healthStatus,
            timestamp: Date.now(),
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis性能指标获取失败',
          {
            context: { error: errorMessage },
            recoveryActions: [
              '检查Redis服务状态',
              '验证Redis连接配置',
              '稍后重试',
            ],
          }
        );
      }
    }),

  /**
   * 获取Redis健康状态
   */
  getHealthStatus: adminProcedure
    .query(async () => {
      try {
        const healthStatus = await redisMonitor.getHealthStatus();

        return {
          success: true,
          data: healthStatus,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          success: false,
          error: errorMessage,
          data: {
            isHealthy: false,
            lastCheck: Date.now(),
            responseTime: 0,
            error: errorMessage,
          },
        };
      }
    }),

  /**
   * 启动Redis监控
   */
  startMonitoring: adminProcedure
    .input(z.object({
      intervalMs: z.number().min(5000).max(300000).default(30000),
    }))
    .mutation(async ({ input }) => {
      try {
        redisMonitor.startMonitoring(input.intervalMs);

        return {
          success: true,
          message: `Redis监控已启动，监控间隔: ${input.intervalMs}ms`,
          data: {
            intervalMs: input.intervalMs,
            startTime: Date.now(),
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis监控启动失败',
          {
            context: { error: errorMessage, intervalMs: input.intervalMs },
            recoveryActions: [
              '检查Redis服务状态',
              '验证监控配置',
              '稍后重试',
            ],
          }
        );
      }
    }),

  /**
   * 停止Redis监控
   */
  stopMonitoring: adminProcedure
    .mutation(async () => {
      try {
        redisMonitor.stopMonitoring();

        return {
          success: true,
          message: 'Redis监控已停止',
          data: {
            stopTime: Date.now(),
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis监控停止失败',
          {
            context: { error: errorMessage },
            recoveryActions: ['稍后重试'],
          }
        );
      }
    }),

  /**
   * 重置Redis监控统计
   */
  resetMetrics: adminProcedure
    .mutation(async () => {
      try {
        redisMonitor.resetMetrics();

        return {
          success: true,
          message: 'Redis监控统计已重置',
          data: {
            resetTime: Date.now(),
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis监控统计重置失败',
          {
            context: { error: errorMessage },
            recoveryActions: ['稍后重试'],
          }
        );
      }
    }),

  /**
   * 获取Redis连接池信息
   */
  getConnectionPoolInfo: adminProcedure
    .query(async () => {
      try {
        const connectionPoolInfo = redisMonitor.getConnectionPoolInfo();

        return {
          success: true,
          data: connectionPoolInfo,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis连接池信息获取失败',
          {
            context: { error: errorMessage },
            recoveryActions: [
              '检查Redis服务状态',
              '验证连接配置',
              '稍后重试',
            ],
          }
        );
      }
    }),

  /**
   * 测试Redis连接
   */
  testConnection: adminProcedure
    .mutation(async () => {
      try {
        const startTime = Date.now();
        const healthStatus = await redisMonitor.getHealthStatus();
        const responseTime = Date.now() - startTime;

        if (!healthStatus.isHealthy) {
          throw new Error(healthStatus.error || 'Redis连接测试失败');
        }

        return {
          success: true,
          message: 'Redis连接测试成功',
          data: {
            responseTime,
            timestamp: Date.now(),
            redisVersion: (await redisMonitor.getMetrics()).redisVersion,
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'SERVICE_UNAVAILABLE' as any,
          'Redis连接测试失败',
          {
            context: { error: errorMessage },
            recoveryActions: [
              '检查Redis服务是否运行',
              '验证Redis连接配置',
              '检查网络连接',
              '查看Redis日志',
            ],
          }
        );
      }
    }),

  /**
   * 获取Redis配置信息
   */
  getRedisConfig: adminProcedure
    .query(async () => {
      try {
        return {
          success: true,
          data: {
            host: process.env.COSEREEDEN_REDIS_HOST || 'localhost',
            port: parseInt(process.env.COSEREEDEN_REDIS_PORT || '6379'),
            db: parseInt(process.env.COSEREEDEN_REDIS_DB || '0'),
            keyPrefix: process.env.COSEREEDEN_REDIS_KEY_PREFIX || 'cosereeden:',
            defaultTTL: parseInt(process.env.COSEREEDEN_REDIS_DEFAULT_TTL || '3600'),
            maxRetries: parseInt(process.env.COSEREEDEN_REDIS_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.COSEREEDEN_REDIS_RETRY_DELAY || '100'),
            connectionTimeout: parseInt(process.env.COSEREEDEN_REDIS_CONNECTION_TIMEOUT || '5000'),
            commandTimeout: parseInt(process.env.COSEREEDEN_REDIS_COMMAND_TIMEOUT || '3000'),
            enabled: process.env.COSEREEDEN_REDIS_ENABLED !== 'false',
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis配置信息获取失败',
          {
            context: { error: errorMessage },
            recoveryActions: ['检查环境变量配置'],
          }
        );
      }
    }),

  /**
   * 获取Redis安全配置
   */
  getSecurityConfig: adminProcedure
    .query(async () => {
      try {
        const securityConfig = securityManager.getSecurityConfig();
        const securityReport = securityManager.generateSecurityReport();

        return {
          success: true,
          data: {
            config: securityConfig,
            validation: securityReport.validation,
            recommendations: securityReport.recommendations,
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis安全配置获取失败',
          {
            context: { error: errorMessage },
            recoveryActions: ['检查安全配置', '验证环境变量'],
          }
        );
      }
    }),

  /**
   * 测试Redis安全连接
   */
  testSecureConnection: adminProcedure
    .mutation(async () => {
      try {
        const result = await securityManager.testSecureConnection();

        if (!result.success) {
          throw new Error(result.message);
        }

        return {
          success: true,
          message: 'Redis安全连接测试成功',
          data: result.details,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'SERVICE_UNAVAILABLE' as any,
          'Redis安全连接测试失败',
          {
            context: { error: errorMessage },
            recoveryActions: [
              '检查Redis服务状态',
              '验证安全配置',
              '检查TLS证书',
              '确认认证信息',
            ],
          }
        );
      }
    }),

  /**
   * 验证Redis安全配置
   */
  validateSecurity: adminProcedure
    .query(async () => {
      try {
        const validation = securityManager.validateSecurityConfig();

        return {
          success: true,
          data: validation,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          'Redis安全配置验证失败',
          {
            context: { error: errorMessage },
            recoveryActions: ['检查配置文件', '验证证书路径'],
          }
        );
      }
    }),
});

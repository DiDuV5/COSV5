/**
 * @fileoverview 性能监控管理路由
 * @description 提供性能监控管理的API接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '@/server/api/trpc';
import { performanceMonitoringService } from '@/lib/services/performance-monitoring-service';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 性能监控配置Schema
 */
const monitoringConfigSchema = z.object({
  enabled: z.boolean().optional(),
  slowQueryThreshold: z.number().min(100).max(10000).optional(),
  maxMetricsSize: z.number().min(1000).max(100000).optional(),
  reportInterval: z.number().min(1).max(168).optional(), // 1小时到1周
  alertsEnabled: z.boolean().optional(),
});

const timeRangeSchema = z.object({
  hours: z.number().min(1).max(168).default(24), // 1小时到1周
});

/**
 * 性能监控管理路由
 */
export const performanceRouter = createTRPCRouter({
  /**
   * 获取性能统计
   */
  getStats: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const stats = performanceMonitoringService.getPerformanceStats(input.hours);

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取性能统计失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取性能统计失败，请稍后重试');
      }
    }),

  /**
   * 生成性能报告
   */
  generateReport: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const report = performanceMonitoringService.generateReport(input.hours);

        return {
          success: true,
          data: report,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('生成性能报告失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('生成性能报告失败，请稍后重试');
      }
    }),

  /**
   * 生成Markdown格式报告
   */
  generateMarkdownReport: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const markdown = performanceMonitoringService.generateMarkdownReport(input.hours);

        return {
          success: true,
          data: {
            markdown,
            generatedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('生成Markdown报告失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('生成Markdown报告失败，请稍后重试');
      }
    }),

  /**
   * 获取实时指标
   */
  getRealTimeMetrics: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const metrics = await performanceMonitoringService.getRealTimeMetrics();

        // 调试日志
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 性能监控API响应:', {
            databaseConnected: metrics.databaseConnected,
            redisConnected: metrics.redisConnected,
            systemHealth: metrics.systemHealth,
          });
        }

        return {
          success: true,
          data: metrics,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取实时指标失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取实时指标失败，请稍后重试');
      }
    }),

  /**
   * 获取系统健康状态
   */
  getHealthStatus: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const health = performanceMonitoringService.checkHealth();

        return {
          success: true,
          data: health,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取健康状态失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取健康状态失败，请稍后重试');
      }
    }),

  /**
   * 获取监控配置
   */
  getConfig: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const config = performanceMonitoringService.getConfig();

        return {
          success: true,
          data: config,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取监控配置失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取监控配置失败，请稍后重试');
      }
    }),

  /**
   * 更新监控配置
   */
  updateConfig: adminProcedure
    .input(monitoringConfigSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        performanceMonitoringService.updateConfig(input);
        const newConfig = performanceMonitoringService.getConfig();

        return {
          success: true,
          message: '监控配置已更新',
          data: newConfig,
        };
      } catch (error) {
        // 结构化日志记录
        console.error('更新监控配置失败:', {
          adminId: ctx.session.user.id,
          configChanges: Object.keys(input),
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('更新监控配置失败，请稍后重试');
      }
    }),

  /**
   * 清除监控数据
   */
  clearMetrics: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        performanceMonitoringService.clearMetrics();

        return {
          success: true,
          message: '监控数据已清除',
        };
      } catch (error) {
        // 结构化日志记录
        console.error('清除监控数据失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('清除监控数据失败，请稍后重试');
      }
    }),

  /**
   * 手动触发报告生成
   */
  triggerReport: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const report = performanceMonitoringService.triggerReport();

        return {
          success: true,
          message: '报告已生成',
          data: {
            totalQueries: report.overview.totalQueries,
            slowQueries: report.overview.slowQueries,
            averageDuration: report.overview.averageDuration,
            alertsCount: report.alerts.length,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('触发报告生成失败:', {
          adminId: ctx.session.user.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('触发报告生成失败，请稍后重试');
      }
    }),

  /**
   * 获取慢查询列表
   */
  getSlowQueries: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      timeRangeHours: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const stats = performanceMonitoringService.getPerformanceStats(input.timeRangeHours);
        const slowQueries = stats.slowQueries.slice(0, input.limit);

        return {
          success: true,
          data: {
            slowQueries,
            total: stats.slowQueries.length,
            timeRange: input.timeRangeHours,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取慢查询列表失败:', {
          adminId: ctx.session.user.id,
          timeRangeHours: input.timeRangeHours,
          limit: input.limit,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取慢查询列表失败，请稍后重试');
      }
    }),

  /**
   * 获取频繁查询列表
   */
  getFrequentQueries: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      timeRangeHours: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const stats = performanceMonitoringService.getPerformanceStats(input.timeRangeHours);
        const frequentQueries = stats.frequentQueries.slice(0, input.limit);

        return {
          success: true,
          data: {
            frequentQueries,
            total: stats.frequentQueries.length,
            timeRange: input.timeRangeHours,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取频繁查询列表失败:', {
          adminId: ctx.session.user.id,
          timeRangeHours: input.timeRangeHours,
          limit: input.limit,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取频繁查询列表失败，请稍后重试');
      }
    }),

  /**
   * 获取模型性能统计
   */
  getModelStats: adminProcedure
    .input(timeRangeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const stats = performanceMonitoringService.getPerformanceStats(input.hours);

        // 转换为数组格式便于前端展示
        const modelStatsArray = Object.entries(stats.modelStats).map(([model, data]) => ({
          model,
          ...data,
          actionsArray: Object.entries(data.actions).map(([action, actionData]) => ({
            action,
            ...actionData,
          })),
        }));

        return {
          success: true,
          data: {
            modelStats: modelStatsArray,
            timeRange: input.hours,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('获取模型性能统计失败:', {
          adminId: ctx.session.user.id,
          hours: input.hours,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('获取模型性能统计失败，请稍后重试');
      }
    }),

  /**
   * 导出性能数据
   */
  exportData: adminProcedure
    .input(z.object({
      format: z.enum(['json', 'markdown']).default('json'),
      timeRangeHours: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ ctx, input }) => {
      try {
        let data: string;
        let filename: string;
        let mimeType: string;

        if (input.format === 'markdown') {
          data = performanceMonitoringService.generateMarkdownReport(input.timeRangeHours);
          filename = `performance-report-${new Date().toISOString().split('T')[0]}.md`;
          mimeType = 'text/markdown';
        } else {
          const report = performanceMonitoringService.generateReport(input.timeRangeHours);
          data = JSON.stringify(report, null, 2);
          filename = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
        }

        return {
          success: true,
          data: {
            content: data,
            filename,
            mimeType,
            size: Buffer.byteLength(data, 'utf8'),
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error('导出性能数据失败:', {
          adminId: ctx.session.user.id,
          format: input.format,
          timeRange: input.timeRangeHours,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });

        throw TRPCErrorHandler.internalError('导出性能数据失败，请稍后重试');
      }
    }),
});

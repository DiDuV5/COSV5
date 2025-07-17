/**
 * @fileoverview 数据库健康检查
 * @description 执行数据库健康检查和监控
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseHealthCheckResult, ConnectionPoolHealthStatus } from './types';
import { DatabaseConnectionMonitor } from './monitor';
import { getDatabaseConfig } from './config';

/**
 * 数据库健康检查
 */
export async function performDatabaseHealthCheck(prisma: PrismaClient): Promise<DatabaseHealthCheckResult> {
  const startTime = Date.now();

  try {
    // 执行简单查询测试连接
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    // 更新监控指标
    const monitor = DatabaseConnectionMonitor.getInstance();
    monitor.recordQuery(true);

    return {
      isHealthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    // 记录错误
    const monitor = DatabaseConnectionMonitor.getInstance();
    monitor.recordQuery(false);

    return {
      isHealthy: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 记录健康检查日志
 */
function logHealthCheckResult(
  healthCheck: DatabaseHealthCheckResult,
  health: ConnectionPoolHealthStatus
): void {
  // 记录健康检查结果
  if (!healthCheck.isHealthy) {
    console.warn('🔴 数据库健康检查失败:', {
      error: healthCheck.error,
      latency: healthCheck.latency,
    });
  }

  // 根据状态输出不同级别的日志
  if (health.status === 'critical') {
    console.error('🚨 数据库连接池状态危险:', {
      status: health.status,
      message: health.message,
      utilizationRate: `${(health.utilizationRate * 100).toFixed(1)}%`,
      errorRate: `${(health.errorRate * 100).toFixed(1)}%`,
      recommendations: health.recommendations,
      latency: healthCheck.latency,
    });
  } else if (health.status === 'warning') {
    console.warn('⚠️ 数据库连接池状态警告:', {
      status: health.status,
      message: health.message,
      utilizationRate: `${(health.utilizationRate * 100).toFixed(1)}%`,
      recommendations: health.recommendations,
      latency: healthCheck.latency,
    });
  } else if (process.env.NODE_ENV === 'development') {
    // 只在状态变化或每分钟记录一次正常状态
    const now = Date.now();
    const lastLogKey = 'db_pool_last_log';
    const lastLogTime = (global as any)[lastLogKey] || 0;
    const shouldLog = now - lastLogTime > 60000; // 60秒间隔

    if (shouldLog) {
      console.log('✅ 数据库连接池状态正常:', {
        status: health.status,
        utilizationRate: `${(health.utilizationRate * 100).toFixed(1)}%`,
        latency: healthCheck.latency,
        queryCount: health.metrics.queryCount,
      });
      (global as any)[lastLogKey] = now;
    }
  }
}

/**
 * 设置监控清理处理器
 */
function setupMonitoringCleanup(monitoringInterval: NodeJS.Timeout): void {
  const cleanup = () => {
    if (isMonitoringActive && process.env.NODE_ENV === 'development') {
      console.log('正在停止数据库连接池监控...');
    }
    if (currentMonitoringInterval) {
      clearInterval(currentMonitoringInterval);
      currentMonitoringInterval = null;
    }
    isMonitoringActive = false;
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

// 全局监控状态
let isMonitoringActive = false;
let currentMonitoringInterval: NodeJS.Timeout | null = null;

/**
 * 启动连接池监控
 */
export function startConnectionPoolMonitoring(prisma: PrismaClient): void {
  // 避免重复启动
  if (isMonitoringActive) {
    if (process.env.NODE_ENV === 'development') {
      console.log('数据库连接池监控已在运行，跳过重复启动');
    }
    return;
  }

  const config = getDatabaseConfig();

  if (!config.enableMetrics) {
    console.log('数据库指标收集已禁用，跳过连接池监控');
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`启动数据库连接池监控，检查间隔: ${config.healthCheckInterval}ms`);
  }

  // 使用配置的健康检查间隔
  currentMonitoringInterval = setInterval(async () => {
    try {
      const healthCheck = await performDatabaseHealthCheck(prisma);
      const monitor = DatabaseConnectionMonitor.getInstance();
      const health = monitor.checkHealth();

      logHealthCheckResult(healthCheck, health);
    } catch (error) {
      console.error('❌ 连接池监控错误:', error);
    }
  }, config.healthCheckInterval);

  isMonitoringActive = true;

  // 设置优雅关闭处理
  setupMonitoringCleanup(currentMonitoringInterval);
}

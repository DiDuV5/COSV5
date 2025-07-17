/**
 * @fileoverview 平台工具函数
 * @description 提供平台系统相关的工具函数
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  PlatformHealthStatus,
  SystemMetrics,
  PlatformStatistics,
  DiagnosticInfo,
  PlatformConfigSummary
} from '../types/platform-types';

/**
 * 格式化启动时间
 */
export function formatStartupTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * 格式化内存使用量
 */
export function formatMemoryUsage(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 计算系统正常运行时间
 */
export function calculateUptime(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * 格式化正常运行时间
 */
export function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 生成系统摘要
 */
export function generateSystemSummary(
  healthStatus: PlatformHealthStatus,
  metrics: SystemMetrics
): string {
  const lines = [
    `🏥 系统健康状态: ${getHealthStatusEmoji(healthStatus.overall)} ${healthStatus.overall}`,
    `⚡ 响应时间: ${healthStatus.performance.responseTime}ms`,
    `💾 内存使用: ${formatPercentage(healthStatus.performance.memoryUsage)}`,
    `🖥️ CPU使用: ${formatPercentage(healthStatus.performance.cpuUsage)}`,
    `📊 活跃警报: ${healthStatus.monitoring.alertsActive}`,
    `🔧 配置问题: ${healthStatus.configuration.criticalIssues}`
  ];

  return lines.join('\n');
}

/**
 * 获取健康状态表情符号
 */
export function getHealthStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'unhealthy':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return '#22c55e'; // green
    case 'warning':
    case 'degraded':
      return '#f59e0b'; // yellow
    case 'error':
    case 'unhealthy':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

/**
 * 验证环境变量
 */
export function validateEnvironmentVariables(required: string[]): {
  valid: boolean;
  missing: string[];
} {
  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 获取系统信息
 */
export function getSystemInfo(): {
  platform: string;
  nodeVersion: string;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
} {
  return {
    platform: process.platform,
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime() * 1000 // 转换为毫秒
  };
}

/**
 * 生成诊断报告
 */
export function generateDiagnosticReport(
  healthStatus: PlatformHealthStatus,
  metrics: SystemMetrics,
  config: any
): DiagnosticInfo {
  return {
    timestamp: Date.now(),
    version: process.env.COSEREEDEN_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    configuration: config,
    systemInfo: getSystemInfo(),
    healthStatus,
    recentEvents: [], // 这里应该从事件存储中获取
    metrics
  };
}

/**
 * 计算性能评分
 */
export function calculatePerformanceScore(metrics: SystemMetrics): number {
  const responseTimeScore = Math.max(0, 100 - (metrics.performance.responseTime / 10));
  const errorRateScore = Math.max(0, 100 - (metrics.performance.errorRate * 100));
  const availabilityScore = metrics.performance.availability;
  const resourceScore = Math.max(0, 100 - Math.max(
    metrics.resources.memoryUsage,
    metrics.resources.cpuUsage
  ));

  return Math.round((responseTimeScore + errorRateScore + availabilityScore + resourceScore) / 4);
}

/**
 * 检查是否为生产环境
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 检查是否为开发环境
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 安全地解析JSON
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as any, source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查是否为对象
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 重试函数
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      console.warn(`操作失败，第 ${attempt} 次重试 (共 ${maxRetries} 次):`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * 创建超时Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'date':
      return date.toLocaleDateString('zh-CN');
    case 'time':
      return date.toLocaleTimeString('zh-CN');
    case 'datetime':
    default:
      return date.toLocaleString('zh-CN');
  }
}

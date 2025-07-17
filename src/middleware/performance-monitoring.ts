/**
 * @fileoverview 性能监控中间件
 * @description 集成API性能监控到tRPC和Next.js中间件
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiPerformanceMonitor } from '@/lib/monitoring/api-performance-monitor';
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteAddr || 'unknown';
}

/**
 * 检查是否为静态资源
 */
function isStaticResource(pathname: string): boolean {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/_next/') ||
         pathname.startsWith('/favicon');
}

/**
 * 检查是否为API路由
 */
function isAPIRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Next.js性能监控中间件
 */
export async function performanceMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (isStaticResource(pathname)) {
    return NextResponse.next();
  }

  const requestId = generateRequestId();
  const startTime = Date.now();

  // 开始监控请求
  apiPerformanceMonitor.startRequest(
    requestId,
    pathname,
    request.method,
    {
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request),
    }
  );

  // 处理请求
  const response = NextResponse.next();

  // 添加性能头部
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

  // 异步结束监控（避免阻塞响应）
  setTimeout(() => {
    apiPerformanceMonitor.endRequest(
      requestId,
      response.status
    );
  }, 0);

  return response;
}

/**
 * tRPC性能监控中间件
 */
export function createTRPCPerformanceMiddleware() {
  return async function performanceMiddleware(opts: any) {
    const { path, type, next, ctx } = opts;
    const requestId = generateRequestId();

    // 开始监控
    apiPerformanceMonitor.startRequest(
      requestId,
      `/api/trpc/${path}`,
      type.toUpperCase(),
      {
        userId: ctx.session?.user?.id,
      }
    );

    try {
      const result = await next();

      // 成功结束监控
      apiPerformanceMonitor.endRequest(requestId, 200);

      return result;
    } catch (error: any) {
      // 错误结束监控
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 :
                        error.code === 'FORBIDDEN' ? 403 :
                        error.code === 'NOT_FOUND' ? 404 :
                        error.code === 'BAD_REQUEST' ? 400 :
                        error.code === 'TOO_MANY_REQUESTS' ? 429 :
                        500;

      apiPerformanceMonitor.endRequest(
        requestId,
        statusCode,
        error.message
      );

      throw error;
    }
  };
}

/**
 * 缓存性能监控中间件
 */
export function createCachePerformanceMiddleware() {
  return {
    async get<T>(key: string, fallback: () => Promise<T>, ttl?: number): Promise<T> {
      const startTime = Date.now();
      const requestId = generateRequestId();

      // 开始监控缓存获取
      apiPerformanceMonitor.startRequest(
        requestId,
        `/cache/get/${key}`,
        'GET'
      );

      try {
        // 尝试从缓存获取
        const cached = await redisCacheManager.get<T>(key);

        if (cached !== null) {
          // 缓存命中
          apiPerformanceMonitor.endRequest(requestId, 200);
          return cached;
        }

        // 缓存未命中，执行fallback
        const result = await fallback();

        // 设置缓存
        if (ttl) {
          await redisCacheManager.set(key, result, ttl);
        }

        apiPerformanceMonitor.endRequest(requestId, 201); // 201表示缓存未命中但成功获取
        return result;
      } catch (error: any) {
        apiPerformanceMonitor.endRequest(
          requestId,
          500,
          error instanceof Error ? error.message : 'Cache error'
        );
        throw error;
      }
    },

    async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
      const startTime = Date.now();
      const requestId = generateRequestId();

      apiPerformanceMonitor.startRequest(
        requestId,
        `/cache/set/${key}`,
        'POST'
      );

      try {
        const result = await redisCacheManager.set(key, value, ttl || 3600);
        apiPerformanceMonitor.endRequest(requestId, result ? 200 : 500);
        return result;
      } catch (error: any) {
        apiPerformanceMonitor.endRequest(
          requestId,
          500,
          error instanceof Error ? error.message : 'Cache set error'
        );
        return false;
      }
    },

    async delete(key: string): Promise<boolean> {
      const startTime = Date.now();
      const requestId = generateRequestId();

      apiPerformanceMonitor.startRequest(
        requestId,
        `/cache/delete/${key}`,
        'DELETE'
      );

      try {
        const result = await redisCacheManager.delete(key);
        apiPerformanceMonitor.endRequest(requestId, result ? 200 : 404);
        return result;
      } catch (error: any) {
        apiPerformanceMonitor.endRequest(
          requestId,
          500,
          error instanceof Error ? error.message : 'Cache delete error'
        );
        return false;
      }
    },
  };
}

/**
 * 数据库查询性能监控装饰器
 */
export function withQueryPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  queryFn: T
): T {
  return (async (...args: any[]) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    apiPerformanceMonitor.startRequest(
      requestId,
      `/db/${queryName}`,
      'QUERY'
    );

    try {
      const result = await queryFn(...args);
      const queryTime = Date.now() - startTime;

      // 记录慢查询
      if (queryTime > 1000) {
        console.warn(`🐌 慢查询检测: ${queryName} - ${queryTime}ms`);
      }

      apiPerformanceMonitor.endRequest(requestId, 200);
      return result;
    } catch (error: any) {
      apiPerformanceMonitor.endRequest(
        requestId,
        500,
        error instanceof Error ? error.message : 'Database error'
      );
      throw error;
    }
  }) as T;
}

/**
 * 性能监控报告生成器
 */
export class PerformanceReporter {
  /**
   * 生成性能报告
   */
  static async generateReport(): Promise<any> {
    const metrics = apiPerformanceMonitor.getMetrics();
    const pathMetrics = apiPerformanceMonitor.getPathMetrics();
    const slowestRequests = apiPerformanceMonitor.getSlowestRequests();
    const errorRequests = apiPerformanceMonitor.getErrorRequests();
    const cacheStats = await redisCacheManager.getStats();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        ...metrics,
        cacheHitRate: cacheStats.hitRate,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
      },
      pathBreakdown: Object.fromEntries(pathMetrics),
      slowestRequests,
      errorRequests,
      recommendations: this.generateRecommendations(metrics, pathMetrics),
    };
  }

  /**
   * 生成性能优化建议
   */
  private static generateRecommendations(
    metrics: any,
    pathMetrics: Map<string, any>
  ): string[] {
    const recommendations: string[] = [];

    // 检查整体性能
    if (metrics.p95ResponseTime > 500) {
      recommendations.push('95%分位数响应时间超过500ms，建议优化慢查询和缓存策略');
    }

    if (metrics.errorRate > 5) {
      recommendations.push('错误率超过5%，建议检查错误日志并修复问题');
    }

    // 检查路径性能
    for (const [path, pathMetric] of pathMetrics.entries()) {
      if (pathMetric.p95ResponseTime > 1000) {
        recommendations.push(`路径 ${path} 响应时间过长，建议优化`);
      }

      if (pathMetric.errorRate > 10) {
        recommendations.push(`路径 ${path} 错误率过高，建议检查`);
      }
    }

    // 缓存建议
    if (metrics.totalRequests > 1000 && !recommendations.length) {
      recommendations.push('系统性能良好，可考虑进一步优化缓存策略');
    }

    return recommendations;
  }

  /**
   * 导出性能数据到CSV
   */
  static exportToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header =>
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

// 导出监控实例
export const performanceCache = createCachePerformanceMiddleware();
export const trpcPerformanceMiddleware = createTRPCPerformanceMiddleware();

export default performanceMiddleware;

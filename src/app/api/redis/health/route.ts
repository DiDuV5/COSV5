/**
 * @fileoverview Redis健康检查API端点
 * @description 提供Redis连接状态和健康信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth, diagnoseRedisConnection, formatHealthStatus } from '@/lib/utils/redis-health-check';

export async function GET(request: NextRequest) {
  try {
    // 检查权限（这里简化处理，实际应该检查管理员权限）
    const authHeader = request.headers.get('authorization');
    if (!authHeader && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const diagnose = searchParams.get('diagnose') === 'true';

    if (diagnose) {
      // 执行完整诊断
      const diagnosis = await diagnoseRedisConnection();

      return NextResponse.json({
        success: true,
        data: {
          health: diagnosis.status,
          recommendations: diagnosis.recommendations,
          summary: formatHealthStatus(diagnosis.status),
          timestamp: new Date().toISOString(),
        },
        message: diagnosis.status.isConnected ? 'Redis连接正常' : 'Redis连接异常',
      });
    }

    // 执行基础健康检查
    const healthStatus = await checkRedisHealth();

    const responseData: any = {
      isConnected: healthStatus.isConnected,
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
    };

    if (healthStatus.isConnected) {
      responseData.latency = healthStatus.latency;

      if (detailed && healthStatus.memory) {
        responseData.memory = {
          used: healthStatus.memory.used,
          usedMB: Math.round(healthStatus.memory.used / 1024 / 1024),
          peak: healthStatus.memory.peak,
          peakMB: Math.round(healthStatus.memory.peak / 1024 / 1024),
          fragmentation: healthStatus.memory.fragmentation,
        };
      }

      if (detailed && healthStatus.stats) {
        const totalRequests = healthStatus.stats.keyspaceHits + healthStatus.stats.keyspaceMisses;
        responseData.stats = {
          ...healthStatus.stats,
          hitRate: totalRequests > 0
            ? (healthStatus.stats.keyspaceHits / totalRequests * 100).toFixed(2)
            : '0.00',
        };
      }
    } else {
      responseData.error = healthStatus.error;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: healthStatus.isConnected ? 'Redis连接正常' : 'Redis连接异常',
    });
  } catch (error) {
    console.error('Redis健康检查失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Redis健康检查失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 执行Redis连接测试
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test-connection') {
      // 执行连接测试
      const startTime = Date.now();
      const healthStatus = await checkRedisHealth();
      const testDuration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: {
          connectionTest: {
            passed: healthStatus.isConnected,
            duration: testDuration,
            latency: healthStatus.latency,
            status: healthStatus.status,
            error: healthStatus.error,
          },
          timestamp: new Date().toISOString(),
        },
        message: healthStatus.isConnected
          ? `连接测试通过 (${testDuration}ms)`
          : `连接测试失败: ${healthStatus.error}`,
      });
    }

    if (action === 'performance-test') {
      // 执行性能测试
      const results = await performRedisPerformanceTest();

      return NextResponse.json({
        success: true,
        data: {
          performanceTest: results,
          timestamp: new Date().toISOString(),
        },
        message: '性能测试完成',
      });
    }

    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Redis测试失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Redis测试失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 执行Redis性能测试
 */
async function performRedisPerformanceTest() {
  const { getRedis } = await import('@/lib/redis');
  const redis = getRedis();

  const results = {
    setOperations: { count: 0, totalTime: 0, avgTime: 0 },
    getOperations: { count: 0, totalTime: 0, avgTime: 0 },
    delOperations: { count: 0, totalTime: 0, avgTime: 0 },
    overallScore: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown',
  };

  try {
    const testKey = `perf_test_${Date.now()}`;
    const testValue = 'performance_test_value';
    const iterations = 10;

    // SET操作测试
    const setStartTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.set(`${testKey}_${i}`, `${testValue}_${i}`, 'EX', 60);
    }
    results.setOperations = {
      count: iterations,
      totalTime: Date.now() - setStartTime,
      avgTime: (Date.now() - setStartTime) / iterations,
    };

    // GET操作测试
    const getStartTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.get(`${testKey}_${i}`);
    }
    results.getOperations = {
      count: iterations,
      totalTime: Date.now() - getStartTime,
      avgTime: (Date.now() - getStartTime) / iterations,
    };

    // DEL操作测试
    const delStartTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.del(`${testKey}_${i}`);
    }
    results.delOperations = {
      count: iterations,
      totalTime: Date.now() - delStartTime,
      avgTime: (Date.now() - delStartTime) / iterations,
    };

    // 计算总体评分
    const avgResponseTime = (
      results.setOperations.avgTime +
      results.getOperations.avgTime +
      results.delOperations.avgTime
    ) / 3;

    if (avgResponseTime < 1) {
      results.overallScore = 'excellent';
    } else if (avgResponseTime < 5) {
      results.overallScore = 'good';
    } else if (avgResponseTime < 10) {
      results.overallScore = 'fair';
    } else {
      results.overallScore = 'poor';
    }

  } catch (error) {
    console.error('Redis性能测试失败:', error);
  }

  return results;
}

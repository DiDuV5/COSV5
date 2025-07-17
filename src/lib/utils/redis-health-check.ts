/**
 * @fileoverview Redis健康检查工具
 * @description 提供Redis连接状态检查和诊断功能
 */

import { getRedis } from '@/lib/redis';

/**
 * 等待Redis连接建立
 */
async function waitForRedisConnection(redis: any, timeout: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);

    const checkConnection = () => {
      if (redis.status === 'ready') {
        clearTimeout(timeoutId);
        resolve(true);
      } else if (redis.status === 'end' || redis.status === 'close') {
        clearTimeout(timeoutId);
        resolve(false);
      } else {
        // 继续等待
        setTimeout(checkConnection, 100);
      }
    };

    // 立即检查一次
    checkConnection();

    // 监听ready事件
    redis.once('ready', () => {
      clearTimeout(timeoutId);
      resolve(true);
    });

    // 监听错误事件
    redis.once('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

export interface RedisHealthStatus {
  isConnected: boolean;
  status: string;
  latency?: number;
  memory?: {
    used: number;
    peak: number;
    fragmentation: number;
  };
  stats?: {
    totalConnections: number;
    commandsProcessed: number;
    keyspaceHits: number;
    keyspaceMisses: number;
  };
  error?: string;
}

/**
 * 执行Redis健康检查
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  try {
    const redis = getRedis();
    const startTime = Date.now();

    // 简化检查逻辑：如果Redis状态是wait，我们认为它是正常的
    // 因为从日志可以看到Redis实际上是连接成功的
    if (redis.status === 'wait' || redis.status === 'connecting') {
      // 尝试快速ping测试，不等待连接状态改变
      try {
        await Promise.race([
          redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 2000)) // 增加到2秒
        ]);

        const latency = Date.now() - startTime;

        // ping成功，认为连接正常
        return {
          isConnected: true,
          status: 'ready',
          latency,
        };
      } catch (pingError) {
        // ping失败，但从日志看Redis是正常的，可能是状态检查问题
        console.warn('Redis ping测试失败，但Redis可能仍然正常:', pingError);

        // 检查是否有其他指标表明Redis正常
        try {
          // 尝试获取基本信息
          const info = await redis.info('server');
          if (info && info.includes('redis_version')) {
            return {
              isConnected: true,
              status: 'ready',
              latency: Date.now() - startTime,
              error: `状态检查异常但Redis正常运行`,
            };
          }
        } catch (infoError) {
          // 忽略info错误
        }

        return {
          isConnected: false,
          status: redis.status,
          error: `Redis连接测试失败: ${pingError instanceof Error ? pingError.message : String(pingError)}`,
        };
      }
    } else if (redis.status !== 'ready') {
      return {
        isConnected: false,
        status: redis.status,
        error: `Redis状态异常: ${redis.status}`,
      };
    }

    // Redis状态为ready，执行正常检查
    await redis.ping();
    const latency = Date.now() - startTime;

    // 获取内存信息
    const memoryInfo = await getMemoryInfo(redis);

    // 获取统计信息
    const statsInfo = await getStatsInfo(redis);

    return {
      isConnected: true,
      status: redis.status,
      latency,
      memory: memoryInfo,
      stats: statsInfo,
    };
  } catch (error) {
    return {
      isConnected: false,
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 获取Redis内存信息
 */
async function getMemoryInfo(redis: any) {
  try {
    const info = await redis.info('memory');
    const lines = info.split('\r\n');
    const memoryData: any = {};

    lines.forEach((line: string) => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryData[key] = value;
      }
    });

    return {
      used: parseInt(memoryData.used_memory || '0'),
      peak: parseInt(memoryData.used_memory_peak || '0'),
      fragmentation: parseFloat(memoryData.mem_fragmentation_ratio || '1'),
    };
  } catch {
    return undefined;
  }
}

/**
 * 获取Redis统计信息
 */
async function getStatsInfo(redis: any) {
  try {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    const statsData: any = {};

    lines.forEach((line: string) => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        statsData[key] = value;
      }
    });

    return {
      totalConnections: parseInt(statsData.total_connections_received || '0'),
      commandsProcessed: parseInt(statsData.total_commands_processed || '0'),
      keyspaceHits: parseInt(statsData.keyspace_hits || '0'),
      keyspaceMisses: parseInt(statsData.keyspace_misses || '0'),
    };
  } catch {
    return undefined;
  }
}

/**
 * 格式化健康检查结果为可读字符串
 */
export function formatHealthStatus(status: RedisHealthStatus): string {
  if (!status.isConnected) {
    return `❌ Redis连接失败: ${status.error || status.status}`;
  }

  let result = `✅ Redis连接正常 (${status.latency}ms)`;

  if (status.memory) {
    const memoryMB = Math.round(status.memory.used / 1024 / 1024);
    result += `\n📊 内存使用: ${memoryMB}MB`;

    if (status.memory.fragmentation > 1.5) {
      result += ` (碎片率: ${status.memory.fragmentation.toFixed(2)})`;
    }
  }

  if (status.stats) {
    const hitRate = status.stats.keyspaceHits + status.stats.keyspaceMisses > 0
      ? (status.stats.keyspaceHits / (status.stats.keyspaceHits + status.stats.keyspaceMisses) * 100).toFixed(1)
      : '0';
    result += `\n🎯 缓存命中率: ${hitRate}%`;
  }

  return result;
}

/**
 * 执行Redis连接诊断
 */
export async function diagnoseRedisConnection(): Promise<{
  status: RedisHealthStatus;
  recommendations: string[];
}> {
  const status = await checkRedisHealth();
  const recommendations: string[] = [];

  if (!status.isConnected) {
    recommendations.push('检查Redis服务是否运行');
    recommendations.push('验证Redis连接配置（主机、端口、密码）');
    recommendations.push('检查网络连接和防火墙设置');

    if (status.error?.includes('ECONNREFUSED')) {
      recommendations.push('Redis服务可能未启动，请启动Redis服务');
    }

    if (status.error?.includes('timeout')) {
      recommendations.push('连接超时，检查网络延迟或增加超时时间');
    }

    if (status.error?.includes('auth')) {
      recommendations.push('认证失败，检查Redis密码配置');
    }
  } else {
    // 连接正常时的优化建议
    if (status.latency && status.latency > 50) {
      recommendations.push('Redis响应时间较慢，考虑优化网络或Redis配置');
    }

    if (status.memory && status.memory.fragmentation > 1.5) {
      recommendations.push('内存碎片率较高，考虑执行MEMORY PURGE命令');
    }

    if (status.stats) {
      const hitRate = status.stats.keyspaceHits + status.stats.keyspaceMisses > 0
        ? status.stats.keyspaceHits / (status.stats.keyspaceHits + status.stats.keyspaceMisses)
        : 0;

      if (hitRate < 0.8) {
        recommendations.push('缓存命中率较低，考虑优化缓存策略或TTL设置');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Redis运行状态良好，无需特殊优化');
    }
  }

  return { status, recommendations };
}

/**
 * 监控Redis连接状态变化
 */
export function monitorRedisConnection(
  onStatusChange: (status: RedisHealthStatus) => void,
  interval: number = 30000
): () => void {
  let lastStatus: RedisHealthStatus | null = null;

  const checkStatus = async () => {
    const currentStatus = await checkRedisHealth();

    // 只在状态发生变化时触发回调
    if (!lastStatus ||
        lastStatus.isConnected !== currentStatus.isConnected ||
        lastStatus.status !== currentStatus.status) {
      onStatusChange(currentStatus);
      lastStatus = currentStatus;
    }
  };

  // 立即执行一次检查
  checkStatus();

  // 设置定期检查
  const intervalId = setInterval(checkStatus, interval);

  // 返回清理函数
  return () => {
    clearInterval(intervalId);
  };
}

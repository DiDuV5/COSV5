/**
 * @fileoverview Redis性能监控服务
 * @description 监控Redis连接池、性能指标和健康状态
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { getRedis } from '../redis';
import { TRPCErrorHandler } from '../errors/trpc-error-handler';

/**
 * Redis性能指标接口
 */
export interface RedisPerformanceMetrics {
  // 连接信息
  connectionCount: number;
  maxConnections: number;
  connectedClients: number;
  blockedClients: number;
  
  // 内存使用
  usedMemory: number;
  usedMemoryHuman: string;
  maxMemory: number;
  memoryUsagePercent: number;
  
  // 性能指标
  commandsPerSecond: number;
  totalCommandsProcessed: number;
  hitRate: number;
  missRate: number;
  
  // 网络指标
  totalNetInputBytes: number;
  totalNetOutputBytes: number;
  
  // 持久化信息
  lastSaveTime: number;
  changesSinceLastSave: number;
  
  // 服务器信息
  redisVersion: string;
  uptimeInSeconds: number;
  
  // 响应时间
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  
  // 错误统计
  errorCount: number;
  errorRate: number;
  
  // 健康状态
  isHealthy: boolean;
  lastHealthCheck: number;
}

/**
 * Redis连接池监控信息
 */
export interface RedisConnectionPoolInfo {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxPoolSize: number;
  minPoolSize: number;
  connectionTimeout: number;
  commandTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Redis性能监控器
 */
export class RedisPerformanceMonitor {
  private redis = getRedis();
  private metrics: RedisPerformanceMetrics;
  private connectionPoolInfo: RedisConnectionPoolInfo;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100; // 保留最近100次响应时间

  constructor() {
    this.metrics = this.initializeMetrics();
    this.connectionPoolInfo = this.initializeConnectionPoolInfo();
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): RedisPerformanceMetrics {
    return {
      connectionCount: 0,
      maxConnections: 0,
      connectedClients: 0,
      blockedClients: 0,
      usedMemory: 0,
      usedMemoryHuman: '0B',
      maxMemory: 0,
      memoryUsagePercent: 0,
      commandsPerSecond: 0,
      totalCommandsProcessed: 0,
      hitRate: 0,
      missRate: 0,
      totalNetInputBytes: 0,
      totalNetOutputBytes: 0,
      lastSaveTime: 0,
      changesSinceLastSave: 0,
      redisVersion: '',
      uptimeInSeconds: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      errorCount: 0,
      errorRate: 0,
      isHealthy: false,
      lastHealthCheck: Date.now(),
    };
  }

  /**
   * 初始化连接池信息
   */
  private initializeConnectionPoolInfo(): RedisConnectionPoolInfo {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxPoolSize: parseInt(process.env.COSEREEDEN_REDIS_MAX_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.COSEREEDEN_REDIS_MIN_POOL_SIZE || '2'),
      connectionTimeout: parseInt(process.env.COSEREEDEN_REDIS_CONNECTION_TIMEOUT || '5000'),
      commandTimeout: parseInt(process.env.COSEREEDEN_REDIS_COMMAND_TIMEOUT || '3000'),
      retryAttempts: parseInt(process.env.COSEREEDEN_REDIS_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.COSEREEDEN_REDIS_RETRY_DELAY || '100'),
    };
  }

  /**
   * 开始监控
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Redis性能监控收集失败:', errorMessage);
        this.metrics.errorCount++;
        this.metrics.isHealthy = false;
      }
    }, intervalMs);

    console.log(`🔍 Redis性能监控已启动，监控间隔: ${intervalMs}ms`);
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Redis性能监控已停止');
    }
  }

  /**
   * 收集性能指标
   */
  public async collectMetrics(): Promise<RedisPerformanceMetrics> {
    const startTime = Date.now();

    try {
      // 检查Redis连接
      await this.redis.ping();
      
      // 获取Redis信息
      const info = await this.redis.info();
      const parsedInfo = this.parseRedisInfo(info);
      
      // 更新指标
      this.updateMetricsFromInfo(parsedInfo);
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      this.updateResponseTimes(responseTime);
      
      // 更新健康状态
      this.metrics.isHealthy = true;
      this.metrics.lastHealthCheck = Date.now();
      
      return this.metrics;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Redis指标收集失败:', errorMessage);
      
      this.metrics.errorCount++;
      this.metrics.isHealthy = false;
      this.metrics.lastHealthCheck = Date.now();
      
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis性能监控收集失败',
        {
          context: { error: errorMessage },
          recoveryActions: ['检查Redis服务状态', '验证网络连接'],
        }
      );
    }
  }

  /**
   * 解析Redis INFO命令输出
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':') && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key.trim()] = value.trim();
        }
      }
    }
    
    return parsed;
  }

  /**
   * 从Redis INFO更新指标
   */
  private updateMetricsFromInfo(info: Record<string, string>): void {
    // 连接信息
    this.metrics.connectedClients = parseInt(info.connected_clients || '0');
    this.metrics.blockedClients = parseInt(info.blocked_clients || '0');
    this.metrics.maxConnections = parseInt(info.maxclients || '0');
    
    // 内存信息
    this.metrics.usedMemory = parseInt(info.used_memory || '0');
    this.metrics.usedMemoryHuman = info.used_memory_human || '0B';
    this.metrics.maxMemory = parseInt(info.maxmemory || '0');
    this.metrics.memoryUsagePercent = this.metrics.maxMemory > 0 
      ? Math.round((this.metrics.usedMemory / this.metrics.maxMemory) * 100)
      : 0;
    
    // 性能指标
    this.metrics.totalCommandsProcessed = parseInt(info.total_commands_processed || '0');
    this.metrics.commandsPerSecond = parseInt(info.instantaneous_ops_per_sec || '0');
    
    // 缓存命中率
    const keyspaceHits = parseInt(info.keyspace_hits || '0');
    const keyspaceMisses = parseInt(info.keyspace_misses || '0');
    const totalRequests = keyspaceHits + keyspaceMisses;
    
    if (totalRequests > 0) {
      this.metrics.hitRate = Math.round((keyspaceHits / totalRequests) * 100);
      this.metrics.missRate = Math.round((keyspaceMisses / totalRequests) * 100);
    }
    
    // 网络指标
    this.metrics.totalNetInputBytes = parseInt(info.total_net_input_bytes || '0');
    this.metrics.totalNetOutputBytes = parseInt(info.total_net_output_bytes || '0');
    
    // 持久化信息
    this.metrics.lastSaveTime = parseInt(info.lastsave_time || '0');
    this.metrics.changesSinceLastSave = parseInt(info.changes_since_last_save || '0');
    
    // 服务器信息
    this.metrics.redisVersion = info.redis_version || '';
    this.metrics.uptimeInSeconds = parseInt(info.uptime_in_seconds || '0');
  }

  /**
   * 更新响应时间统计
   */
  private updateResponseTimes(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // 保持历史记录在限制范围内
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
    
    // 计算统计值
    this.metrics.avgResponseTime = Math.round(
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
    );
    this.metrics.maxResponseTime = Math.max(...this.responseTimes);
    this.metrics.minResponseTime = Math.min(...this.responseTimes);
  }

  /**
   * 获取当前性能指标
   */
  public getMetrics(): RedisPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取连接池信息
   */
  public getConnectionPoolInfo(): RedisConnectionPoolInfo {
    return { ...this.connectionPoolInfo };
  }

  /**
   * 获取健康状态
   */
  public async getHealthStatus(): Promise<{
    isHealthy: boolean;
    lastCheck: number;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: true,
        lastCheck: Date.now(),
        responseTime,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        isHealthy: false,
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 重置统计信息
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    console.log('📊 Redis性能监控统计信息已重置');
  }
}

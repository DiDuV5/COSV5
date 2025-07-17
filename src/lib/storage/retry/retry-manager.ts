/**
 * @fileoverview R2操作重试管理器
 * @description 为R2存储操作提供智能重试机制，包括指数退避、熔断器等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

import { r2ConfigManager } from '../config/r2-config-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 重试选项
 */
export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * 熔断器状态
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // 正常状态
  OPEN = 'OPEN',         // 熔断状态
  HALF_OPEN = 'HALF_OPEN' // 半开状态
}

/**
 * 熔断器
 */
class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  /**
   * 执行操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        console.log('🔄 熔断器进入半开状态');
      } else {
        throw TRPCErrorHandler.forbidden('服务暂时不可用，熔断器已开启');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // 连续3次成功后关闭熔断器
        this.state = CircuitBreakerState.CLOSED;
        console.log('✅ 熔断器已关闭，服务恢复正常');
      }
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      console.log(`❌ 熔断器已开启，失败次数: ${this.failureCount}`);
    }
  }

  /**
   * 获取状态
   */
  getState(): string {
    return this.state;
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    console.log('🔄 熔断器已重置');
  }
}

/**
 * 重试管理器
 */
export class RetryManager {
  private static instance: RetryManager;
  private circuitBreaker: CircuitBreaker;
  private metrics = {
    totalAttempts: 0,
    totalRetries: 0,
    totalFailures: 0,
    totalSuccesses: 0,
  };

  private constructor() {
    const config = r2ConfigManager.getRetryConfig();
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerTimeout
    );
  }

  /**
   * 获取单例实例
   */
  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = r2ConfigManager.getRetryConfig();
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const retryDelay = options.retryDelay ?? config.retryDelay;
    const retryBackoff = options.retryBackoff ?? config.retryBackoff;

    return this.circuitBreaker.execute(async () => {
      let lastError: any;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        this.metrics.totalAttempts++;
        
        try {
          const result = await operation();
          this.metrics.totalSuccesses++;
          
          if (attempt > 0) {
            console.log(`✅ 操作在第${attempt + 1}次尝试后成功`);
          }
          
          return result;
        } catch (error) {
          lastError = error;
          
          // 检查是否应该重试
          if (attempt === maxRetries || !this.shouldRetry(error, options.retryCondition)) {
            this.metrics.totalFailures++;
            break;
          }

          this.metrics.totalRetries++;
          
          // 计算延迟时间
          const delay = this.calculateDelay(attempt, retryDelay, retryBackoff);
          
          console.log(`⚠️ 操作失败，${delay}ms后进行第${attempt + 2}次尝试:`, error instanceof Error ? error.message : '未知错误');
          
          // 调用重试回调
          if (options.onRetry) {
            options.onRetry(error, attempt + 1);
          }
          
          // 等待延迟
          await this.sleep(delay);
        }
      }

      throw lastError;
    });
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any, customCondition?: (error: any) => boolean): boolean {
    // 自定义重试条件
    if (customCondition) {
      return customCondition(error);
    }

    // 默认重试条件
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EPIPE',
      'ECONNABORTED',
    ];

    // 网络错误
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    // HTTP状态码
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      // 5xx服务器错误和429限流错误可以重试
      return status >= 500 || status === 429;
    }

    // AWS SDK错误
    if (error.name) {
      const retryableAwsErrors = [
        'NetworkingError',
        'TimeoutError',
        'ThrottlingException',
        'ServiceUnavailable',
        'InternalError',
      ];
      return retryableAwsErrors.includes(error.name);
    }

    return false;
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(
    attempt: number,
    baseDelay: number,
    backoff: 'linear' | 'exponential'
  ): number {
    if (backoff === 'exponential') {
      // 指数退避：baseDelay * 2^attempt + 随机抖动
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // 0-1秒随机抖动
      return Math.min(exponentialDelay + jitter, 30000); // 最大30秒
    } else {
      // 线性退避：baseDelay * (attempt + 1) + 随机抖动
      const linearDelay = baseDelay * (attempt + 1);
      const jitter = Math.random() * 500; // 0-0.5秒随机抖动
      return Math.min(linearDelay + jitter, 10000); // 最大10秒
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取重试指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakerState: this.circuitBreaker.getState(),
      successRate: this.metrics.totalAttempts > 0 
        ? (this.metrics.totalSuccesses / this.metrics.totalAttempts * 100).toFixed(2) + '%'
        : '0%',
      retryRate: this.metrics.totalAttempts > 0
        ? (this.metrics.totalRetries / this.metrics.totalAttempts * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      totalRetries: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
    console.log('📊 重试指标已重置');
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    circuitBreakerState: string;
    metrics: any;
  }> {
    const metrics = this.getMetrics();
    const circuitBreakerState = this.circuitBreaker.getState();
    
    // 判断健康状态
    const isHealthy = circuitBreakerState === CircuitBreakerState.CLOSED &&
                     (this.metrics.totalAttempts === 0 || 
                      this.metrics.totalSuccesses / this.metrics.totalAttempts > 0.8);

    return {
      isHealthy,
      circuitBreakerState,
      metrics,
    };
  }
}

// 导出单例实例
export const retryManager = RetryManager.getInstance();

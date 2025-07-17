/**
 * @fileoverview 存储系统错误处理和容错机制
 * @description 提供存储操作的错误处理、重试机制和故障转移功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - 存储提供商接口
 * - 日志系统
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

/**
 * 存储错误类型
 */
export enum StorageErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FILE = 'INVALID_FILE',
  CDN_UNAVAILABLE = 'CDN_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 存储错误详情
 */
export interface StorageError {
  type: StorageErrorType;
  message: string;
  originalError?: Error;
  provider?: string;
  operation?: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: StorageErrorType[];
}

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  enabled: boolean;
  timeout: number;
  fallbackProvider: string;
  autoRevert: boolean;
  revertCheckInterval: number;
}

/**
 * 默认重试配置 - 优化为快速失败策略
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1, // 减少重试次数从3次到1次
  baseDelay: 500, // 减少基础延迟从1000ms到500ms
  maxDelay: 2000, // 减少最大延迟从10000ms到2000ms
  backoffMultiplier: 1.5, // 减少退避倍数从2到1.5
  retryableErrors: [
    StorageErrorType.NETWORK_ERROR,
    StorageErrorType.TIMEOUT_ERROR,
    StorageErrorType.CDN_UNAVAILABLE
  ]
};

/**
 * 默认故障转移配置
 */
export const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  enabled: true,
  timeout: 5000,
  fallbackProvider: 'local',
  autoRevert: false,
  revertCheckInterval: 60000
};

/**
 * 存储错误处理器
 */
export class StorageErrorHandler {
  private retryConfig: RetryConfig;
  private failoverConfig: FailoverConfig;
  private errorHistory: StorageError[] = [];
  private maxHistorySize = 100;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    failoverConfig: Partial<FailoverConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.failoverConfig = { ...DEFAULT_FAILOVER_CONFIG, ...failoverConfig };
  }

  /**
   * 分析错误类型
   */
  analyzeError(error: Error, operation?: string, provider?: string): StorageError {
    const timestamp = new Date();
    let type = StorageErrorType.UNKNOWN_ERROR;
    let retryable = false;

    // 根据错误消息和类型判断错误类型
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      type = StorageErrorType.NETWORK_ERROR;
      retryable = true;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      type = StorageErrorType.TIMEOUT_ERROR;
      retryable = true;
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('access denied')) {
      type = StorageErrorType.AUTHENTICATION_ERROR;
      retryable = false;
    } else if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      type = StorageErrorType.PERMISSION_ERROR;
      retryable = false;
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit exceeded')) {
      type = StorageErrorType.QUOTA_EXCEEDED;
      retryable = false;
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      type = StorageErrorType.FILE_NOT_FOUND;
      retryable = false;
    } else if (errorMessage.includes('cdn') || errorMessage.includes('domain')) {
      type = StorageErrorType.CDN_UNAVAILABLE;
      retryable = true;
    } else if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
      // 数据库相关错误通常不应该重试
      type = StorageErrorType.UNKNOWN_ERROR;
      retryable = false;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      // 验证错误不应该重试
      type = StorageErrorType.INVALID_FILE;
      retryable = false;
    }

    const storageError: StorageError = {
      type,
      message: error.message,
      originalError: error,
      provider,
      operation,
      retryable,
      timestamp
    };

    // 记录错误历史
    this.recordError(storageError);

    return storageError;
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    provider?: string
  ): Promise<T> {
    let lastError: StorageError | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // 如果之前有错误但现在成功了，记录恢复
        if (lastError) {
          console.log(`✅ 存储操作恢复成功: ${operationName} (尝试 ${attempt + 1})`);
        }
        
        return result;
      } catch (error) {
        const storageError = this.analyzeError(error as Error, operationName, provider);
        lastError = storageError;

        // 检查是否应该重试
        if (attempt < this.retryConfig.maxRetries && this.shouldRetry(storageError)) {
          const delay = this.calculateDelay(attempt);
          console.warn(`⚠️ 存储操作失败，${delay}ms后重试 (${attempt + 1}/${this.retryConfig.maxRetries}): ${storageError.message}`);
          await this.sleep(delay);
          continue;
        }

        // 不再重试，抛出最后的错误
        const totalAttempts = attempt + 1;
        console.error(`❌ 存储操作最终失败: ${operationName} (共尝试${totalAttempts}次)`, {
          错误类型: storageError.type,
          错误信息: storageError.message,
          提供商: storageError.provider || '未知',
          可重试: storageError.retryable ? '是' : '否'
        });
        throw error;
      }
    }

    throw new Error('重试逻辑错误'); // 不应该到达这里
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: StorageError): boolean {
    return error.retryable && this.retryConfig.retryableErrors.includes(error.type);
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录错误历史
   */
  private recordError(error: StorageError): void {
    this.errorHistory.push(error);
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(timeWindow?: number): {
    total: number;
    byType: Record<StorageErrorType, number>;
    byProvider: Record<string, number>;
    recentErrors: StorageError[];
  } {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp.getTime() >= windowStart
    );

    const byType: Record<StorageErrorType, number> = {} as any;
    const byProvider: Record<string, number> = {};

    recentErrors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      if (error.provider) {
        byProvider[error.provider] = (byProvider[error.provider] || 0) + 1;
      }
    });

    return {
      total: recentErrors.length,
      byType,
      byProvider,
      recentErrors: recentErrors.slice(-10) // 最近10个错误
    };
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 检查是否需要故障转移
   */
  shouldFailover(provider: string): boolean {
    if (!this.failoverConfig.enabled) {
      return false;
    }

    const recentWindow = 5 * 60 * 1000; // 5分钟
    const stats = this.getErrorStats(recentWindow);
    const providerErrors = stats.byProvider[provider] || 0;

    // 如果最近5分钟内该提供商错误超过3次，建议故障转移
    return providerErrors >= 3;
  }
}

/**
 * 全局错误处理器实例
 */
export const storageErrorHandler = new StorageErrorHandler();

/**
 * 创建存储错误
 */
export function createStorageError(
  type: StorageErrorType,
  message: string,
  originalError?: Error,
  provider?: string,
  operation?: string
): StorageError {
  return {
    type,
    message,
    originalError,
    provider,
    operation,
    retryable: DEFAULT_RETRY_CONFIG.retryableErrors.includes(type),
    timestamp: new Date()
  };
}

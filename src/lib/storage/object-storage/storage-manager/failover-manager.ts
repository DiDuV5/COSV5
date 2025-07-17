/**
 * @fileoverview 故障转移管理器
 * @description 管理存储提供商的故障转移逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import type { BaseStorageProvider } from '../base-storage-provider';
import type { HealthChecker } from './health-checker';

/**
 * 故障转移管理器
 */
export class FailoverManager extends EventEmitter {
  private enableFailover: boolean;
  private failoverTimeout: number;
  private healthChecker: HealthChecker;

  constructor(
    enableFailover: boolean,
    failoverTimeout: number,
    healthChecker: HealthChecker
  ) {
    super();
    this.enableFailover = enableFailover;
    this.failoverTimeout = failoverTimeout;
    this.healthChecker = healthChecker;
  }

  /**
   * 执行带故障转移的操作
   */
  async executeWithFailover<T>(
    operation: string,
    primaryProvider: BaseStorageProvider,
    fallbackProvider: BaseStorageProvider | undefined,
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      // 首先尝试主要提供商
      const result = await this.executeWithTimeout(primaryOperation, this.failoverTimeout);
      return result;
    } catch (primaryError) {
      console.warn(`主要存储提供商操作失败: ${operation}`, primaryError);
      this.healthChecker.handleProviderError('primary', primaryError as Error);

      // 如果启用故障转移且有备用提供商
      if (this.enableFailover && fallbackProvider && fallbackOperation) {
        try {
          console.log(`使用备用存储提供商执行操作: ${operation}`);
          const result = await this.executeWithTimeout(fallbackOperation, this.failoverTimeout);
          this.emit('failoverUsed', { operation, provider: 'fallback' });
          return result;
        } catch (fallbackError) {
          console.error(`备用存储提供商操作也失败: ${operation}`, fallbackError);
          this.healthChecker.handleProviderError('fallback', fallbackError as Error);
          throw fallbackError;
        }
      }

      throw primaryError;
    }
  }

  /**
   * 带超时的操作执行
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`操作超时 (${timeout}ms)`));
      }, timeout);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * 选择最佳提供商
   */
  selectBestProvider(
    primaryProvider: BaseStorageProvider,
    fallbackProvider?: BaseStorageProvider
  ): BaseStorageProvider {
    const primaryStatus = this.healthChecker.getProviderStatus('primary');
    const fallbackStatus = this.healthChecker.getProviderStatus('fallback');

    // 如果主要提供商健康，使用主要提供商
    if (primaryStatus?.isHealthy !== false) {
      return primaryProvider;
    }

    // 如果主要提供商不健康且有健康的备用提供商，使用备用提供商
    if (fallbackProvider && fallbackStatus?.isHealthy) {
      return fallbackProvider;
    }

    // 默认返回主要提供商
    return primaryProvider;
  }
}

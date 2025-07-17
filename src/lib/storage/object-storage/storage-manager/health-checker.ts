/**
 * @fileoverview 健康检查器
 * @description 管理存储提供商的健康检查
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import type { BaseStorageProvider } from '../base-storage-provider';
import type { ProviderStatus } from './types';

/**
 * 健康检查器
 */
export class HealthChecker extends EventEmitter {
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private providerStatus = new Map<string, ProviderStatus>();
  private healthCheckInterval: number;

  constructor(healthCheckInterval: number = 60000) {
    super();
    this.healthCheckInterval = healthCheckInterval;
  }

  /**
   * 启动健康检查
   */
  start(providers: { primary: BaseStorageProvider; fallback?: BaseStorageProvider }): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck(providers);
    }, this.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 获取提供商状态
   */
  getProviderStatus(provider: string): ProviderStatus | undefined {
    return this.providerStatus.get(provider);
  }

  /**
   * 设置提供商状态
   */
  setProviderStatus(provider: string, isHealthy: boolean, error?: Error): void {
    const status = this.providerStatus.get(provider) || {
      isHealthy: true,
      lastCheck: new Date(),
      errorCount: 0,
    };

    status.isHealthy = isHealthy;
    status.lastCheck = new Date();

    if (error) {
      status.errorCount++;
      status.lastError = error;
    } else {
      status.errorCount = 0;
      status.lastError = undefined;
    }

    this.providerStatus.set(provider, status);
    this.emit('providerStatusChanged', { provider, status });
  }

  /**
   * 处理提供商错误
   */
  handleProviderError(provider: string, error: Error): void {
    this.setProviderStatus(provider, false, error);
    this.emit('providerError', { provider, error });
  }

  /**
   * 获取所有提供商状态
   */
  getAllProviderStatus(): Map<string, ProviderStatus> {
    return new Map(this.providerStatus);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(providers: { primary: BaseStorageProvider; fallback?: BaseStorageProvider }): Promise<void> {
    // 检查主要提供商
    if (providers.primary) {
      try {
        await providers.primary.listFiles({ maxKeys: 1 });
        this.setProviderStatus('primary', true);
      } catch (error) {
        this.handleProviderError('primary', error as Error);
      }
    }

    // 检查备用提供商
    if (providers.fallback) {
      try {
        await providers.fallback.listFiles({ maxKeys: 1 });
        this.setProviderStatus('fallback', true);
      } catch (error) {
        this.handleProviderError('fallback', error as Error);
      }
    }
  }
}

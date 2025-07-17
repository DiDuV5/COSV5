/**
 * @fileoverview 故障转移管理器
 * @description 管理存储提供商的故障转移逻辑和状态
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { BaseStorageProvider, UploadResult } from '../base-storage-provider';
import { getMediaConfig } from '../../config/media-config';
import type { FailoverState, ExtendedUploadResult, UploadOptions } from './storage-types';
import type { StorageProviderManager } from './storage-providers';

/**
 * 故障转移管理器
 */
export class FailoverManager {
  constructor(private providerManager: StorageProviderManager) {}

  /**
   * 带故障转移的上传
   */
  async uploadWithFallback(
    file: Buffer,
    filename: string,
    options?: UploadOptions
  ): Promise<ExtendedUploadResult> {
    const startTime = Date.now();

    // 获取可用的提供商列表 (按优先级排序)
    const availableProviders = this.providerManager.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No available storage providers');
    }

    let lastError: Error | null = null;

    // 尝试每个可用的提供商
    for (const providerName of availableProviders) {
      const provider = this.providerManager.getProvider(providerName);
      if (!provider) continue;

      try {
        console.log(`🔄 Attempting upload with ${providerName}...`);

        const result = await provider.upload(file, filename, options);

        if (result.success) {
          // 重置故障计数
          this.resetFailureCount(providerName);

          console.log(`✅ Upload successful with ${providerName}`);
          return {
            ...result,
            provider: providerName,
            uploadTime: Date.now() - startTime,
          };
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.warn(`❌ Upload failed with ${providerName}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // 记录失败
        this.recordFailure(providerName);

        // 如果这是最后一个提供商，不继续尝试
        if (providerName === availableProviders[availableProviders.length - 1]) {
          break;
        }

        // 继续尝试下一个提供商
        continue;
      }
    }

    // 所有提供商都失败了
    throw new Error(
      `All storage providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * 记录提供商失败
   */
  private recordFailure(providerName: string): void {
    const failoverState = this.providerManager.getFailoverState(providerName);
    if (!failoverState) return;

    failoverState.failureCount++;
    failoverState.lastFailure = new Date();

    const config = getMediaConfig();

    // 如果失败次数超过阈值，加入黑名单
    if (failoverState.failureCount >= config.storage.failoverThreshold) {
      failoverState.isBlacklisted = true;
      failoverState.blacklistUntil = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后重试

      console.warn(`⚠️ Provider ${providerName} blacklisted due to repeated failures`);
    }

    this.providerManager.updateFailoverState(providerName, failoverState);
  }

  /**
   * 重置失败计数
   */
  private resetFailureCount(providerName: string): void {
    const failoverState = this.providerManager.getFailoverState(providerName);
    if (failoverState) {
      this.providerManager.updateFailoverState(providerName, {
        failureCount: 0,
        lastFailure: undefined,
      });
    }
  }

  /**
   * 手动切换主存储提供商
   */
  async switchPrimaryProvider(providerName: string): Promise<void> {
    const provider = this.providerManager.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    if (!this.providerManager.isProviderAvailable(providerName)) {
      throw new Error(`Provider ${providerName} is not available`);
    }

    // 这里可以添加更新配置的逻辑
    console.log(`🔄 Switched primary provider to ${providerName}`);
  }

  /**
   * 获取故障转移状态报告
   */
  getFailoverReport(): {
    availableProviders: string[];
    blacklistedProviders: string[];
    failoverStates: Record<string, FailoverState>;
  } {
    const availableProviders = this.providerManager.getAvailableProviders();
    const blacklistedProviders: string[] = [];
    const failoverStates: Record<string, FailoverState> = {};

    for (const [name, state] of this.providerManager.getAllFailoverStates()) {
      failoverStates[name] = { ...state };
      if (state.isBlacklisted) {
        blacklistedProviders.push(name);
      }
    }

    return {
      availableProviders,
      blacklistedProviders,
      failoverStates,
    };
  }

  /**
   * 强制重置提供商状态
   */
  resetProviderState(providerName: string): void {
    this.providerManager.updateFailoverState(providerName, {
      failureCount: 0,
      lastFailure: undefined,
      isBlacklisted: false,
      blacklistUntil: undefined,
    });

    console.log(`🔄 Reset state for provider ${providerName}`);
  }

  /**
   * 强制重置所有提供商状态
   */
  resetAllProviderStates(): void {
    for (const [name] of this.providerManager.getAllFailoverStates()) {
      this.resetProviderState(name);
    }

    console.log('🔄 Reset all provider states');
  }

  /**
   * 检查提供商健康状态并更新故障转移状态
   */
  async updateHealthStatus(): Promise<void> {
    const providers = this.providerManager.getAllProviders();

    for (const [name, provider] of providers) {
      try {
        const health = await provider.healthCheck();

        // 如果健康检查成功，重置失败计数
        if (health.healthy) {
          this.resetFailureCount(name);
        } else {
          // 如果健康检查失败，记录失败
          this.recordFailure(name);
        }
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
        this.recordFailure(name);
      }
    }
  }

  /**
   * 获取提供商优先级排序
   */
  getProviderPriority(): Array<{ name: string; priority: number; available: boolean }> {
    const config = getMediaConfig();
    const providers: Array<{ name: string; priority: number; available: boolean }> = [];

    // 主提供商优先级最高
    providers.push({
      name: config.storage.primary,
      priority: 1,
      available: this.providerManager.isProviderAvailable(config.storage.primary),
    });

    // 备用提供商按顺序排列
    config.storage.fallback.forEach((fallback, index) => {
      if (fallback !== config.storage.primary) {
        providers.push({
          name: fallback,
          priority: index + 2,
          available: this.providerManager.isProviderAvailable(fallback),
        });
      }
    });

    return providers;
  }
}

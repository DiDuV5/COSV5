/**
 * @fileoverview 存储提供商管理
 * @description 管理存储提供商的初始化和配置
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { BaseStorageProvider } from '../base-storage-provider';
import { R2StorageProvider, type R2Config } from '../providers/r2-storage-provider';
import { LocalStorageProvider, type LocalConfig } from '../providers/local-storage-provider';
import { getMediaConfig } from '../../config/media-config';
import type { StorageProviderConfig, FailoverState } from './storage-types';

/**
 * 存储提供商管理器
 */
export class StorageProviderManager {
  private providers = new Map<string, BaseStorageProvider>();
  private failoverStates = new Map<string, FailoverState>();

  /**
   * 初始化所有存储提供商
   */
  async initializeProviders(): Promise<void> {
    // 验证配置
    this.validateConfiguration();

    // 初始化R2存储提供商
    try {
      const r2Config = this.getR2StorageConfig();

      // 检查必需的配置
      if (!r2Config.accessKeyId || !r2Config.secretAccessKey) {
        throw new Error('缺少必需的R2存储配置: ACCESS_KEY_ID 和 SECRET_ACCESS_KEY');
      }

      const r2Provider = new R2StorageProvider(r2Config);
      this.providers.set('r2', r2Provider);
      this.initializeFailoverState('r2');

      console.log('✅ R2 storage provider initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize R2 provider:', error);
    }

    // 初始化本地存储提供商
    try {
      const localConfig = this.getLocalStorageConfig();
      const localProvider = new LocalStorageProvider(localConfig);
      this.providers.set('local', localProvider);
      this.initializeFailoverState('local');

      console.log('✅ Local storage provider initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize local provider:', error);
    }

    if (this.providers.size === 0) {
      throw new Error('No storage providers could be initialized');
    }
  }

  /**
   * 验证存储配置
   */
  private validateConfiguration(): void {
    const requiredR2Vars = ['CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
    const missingVars = requiredR2Vars.filter(varName =>
      !process.env[varName] && !process.env[`COSEREEDEN_${varName}`]
    );

    if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
      console.warn(`生产环境缺少必需的存储环境变量: ${missingVars.join(', ')}`);
    }
  }

  /**
   * 获取R2存储配置
   */
  private getR2StorageConfig(): R2Config {
    const requiredEnvVars = {
      accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME,
      endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
      accountId: process.env.COSEREEDEN_CLOUDFLARE_ACCOUNT_ID || process.env.COSEREEDEN_CLOUDFLARE_ACCOUNT_ID,
      cdnDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
    };

    // 验证必需的环境变量
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(`Missing required Cloudflare R2 environment variables: ${missingVars.join(', ')}. Please set COSEREEDEN_CLOUDFLARE_R2_* environment variables.`);
    }

    return {
      accessKeyId: requiredEnvVars.accessKeyId!,
      secretAccessKey: requiredEnvVars.secretAccessKey!,
      bucket: requiredEnvVars.bucket!,
      endpoint: requiredEnvVars.endpoint!,
      accountId: requiredEnvVars.accountId!,
      cdnDomain: requiredEnvVars.cdnDomain!,
    };
  }

  /**
   * 获取本地存储配置
   */
  private getLocalStorageConfig(): LocalConfig {
    return {
      basePath: process.env.COSEREEDEN_LOCAL_UPLOAD_DIR ||
                process.env.COSEREEDEN_LOCAL_UPLOAD_DIR ||
                './uploads',
      baseUrl: process.env.COSEREEDEN_LOCAL_BASE_URL ||
               process.env.COSEREEDEN_LOCAL_BASE_URL ||
               'http://localhost:3000/uploads',
    };
  }

  /**
   * 初始化故障转移状态
   */
  private initializeFailoverState(providerName: string): void {
    this.failoverStates.set(providerName, {
      provider: providerName,
      failureCount: 0,
      isBlacklisted: false,
    });
  }

  /**
   * 获取提供商
   */
  getProvider(name: string): BaseStorageProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 获取所有提供商
   */
  getAllProviders(): Map<string, BaseStorageProvider> {
    return new Map(this.providers);
  }

  /**
   * 获取故障转移状态
   */
  getFailoverState(providerName: string): FailoverState | undefined {
    return this.failoverStates.get(providerName);
  }

  /**
   * 获取所有故障转移状态
   */
  getAllFailoverStates(): Map<string, FailoverState> {
    return new Map(this.failoverStates);
  }

  /**
   * 更新故障转移状态
   */
  updateFailoverState(providerName: string, state: Partial<FailoverState>): void {
    const currentState = this.failoverStates.get(providerName);
    if (currentState) {
      Object.assign(currentState, state);
    }
  }

  /**
   * 检查提供商是否可用
   */
  isProviderAvailable(providerName: string): boolean {
    if (!this.providers.has(providerName)) {
      return false;
    }

    const failoverState = this.failoverStates.get(providerName);
    if (!failoverState) return true;

    // 检查是否在黑名单中
    if (failoverState.isBlacklisted) {
      if (failoverState.blacklistUntil && new Date() > failoverState.blacklistUntil) {
        // 黑名单期已过，重置状态
        failoverState.isBlacklisted = false;
        failoverState.blacklistUntil = undefined;
        failoverState.failureCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * 获取可用的提供商列表（按优先级排序）
   */
  getAvailableProviders(): string[] {
    const config = getMediaConfig();
    const providers: string[] = [];

    // 添加主提供商 (如果可用)
    if (this.isProviderAvailable(config.storage.primary)) {
      providers.push(config.storage.primary);
    }

    // 添加备用提供商 (如果可用)
    for (const fallback of config.storage.fallback) {
      if (fallback !== config.storage.primary && this.isProviderAvailable(fallback)) {
        providers.push(fallback);
      }
    }

    return providers;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.providers.clear();
    this.failoverStates.clear();
  }
}

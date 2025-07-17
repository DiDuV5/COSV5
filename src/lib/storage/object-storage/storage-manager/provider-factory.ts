/**
 * @fileoverview 存储提供商工厂
 * @description 创建和管理存储提供商实例
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { BaseStorageProvider, StorageConfig } from '../base-storage-provider';
import { CloudflareR2Provider } from '../../providers/cloudflare-r2-provider';
import { LocalStorageProvider } from '../../providers/local-storage-provider';

/**
 * 存储提供商工厂
 */
export class ProviderFactory {
  /**
   * 创建存储提供商
   */
  static createProvider(config: StorageConfig): BaseStorageProvider {
    switch (config.provider) {
      case 'cloudflare-r2':
        return new CloudflareR2Provider(config);
      case 'local':
        return new LocalStorageProvider(config as any) as any;
      default:
        throw new Error(`不支持的存储提供商: ${config.provider}`);
    }
  }

  /**
   * 创建多个存储提供商
   */
  static createProviders(configs: { primary: StorageConfig; fallback?: StorageConfig }): {
    primary: BaseStorageProvider;
    fallback?: BaseStorageProvider;
  } {
    const primary = this.createProvider(configs.primary);
    const fallback = configs.fallback ? this.createProvider(configs.fallback) : undefined;

    return { primary, fallback };
  }
}

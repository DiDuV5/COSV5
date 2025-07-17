/**
 * @fileoverview 存储操作处理器
 * @description 处理各种存储操作的具体实现
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import type { BaseStorageProvider, ListResult, DownloadResult } from '../base-storage-provider';
import type { CacheManager } from './cache-manager';
import type { FailoverManager } from './failover-manager';

/**
 * 存储操作处理器
 */
export class StorageOperations extends EventEmitter {
  private primaryProvider: BaseStorageProvider;
  private fallbackProvider?: BaseStorageProvider;
  private cacheManager: CacheManager;
  private failoverManager: FailoverManager;
  private enableCache: boolean;

  constructor(
    primaryProvider: BaseStorageProvider,
    fallbackProvider: BaseStorageProvider | undefined,
    cacheManager: CacheManager,
    failoverManager: FailoverManager,
    enableCache: boolean
  ) {
    super();
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
    this.cacheManager = cacheManager;
    this.failoverManager = failoverManager;
    this.enableCache = enableCache;
  }

  /**
   * 上传文件
   */
  async uploadFile(params: { buffer: Buffer; key: string; contentType: string; size: number; metadata?: Record<string, string> }): Promise<any> {
    // 构建标准的 UploadParams 对象
    const uploadParams = {
      buffer: params.buffer,
      key: params.key,
      contentType: params.contentType,
      size: params.size,
      metadata: params.metadata,
    };

    const result = await this.failoverManager.executeWithFailover(
      'uploadFile',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.uploadFile(uploadParams),
      this.fallbackProvider ? () => this.fallbackProvider!.uploadFile(uploadParams) : undefined
    );

    this.emit('fileUploaded', { provider: 'primary', result });
    return result;
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string, options?: any): Promise<DownloadResult> {
    // 检查缓存
    if (this.enableCache) {
      const cached = this.cacheManager.get<DownloadResult>(`download:${key}`);
      if (cached) {
        this.emit('cacheHit', { key, operation: 'download' });
        return cached;
      }
    }

    const result = await this.failoverManager.executeWithFailover(
      'downloadFile',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.downloadFile(key),
      this.fallbackProvider ? () => this.fallbackProvider!.downloadFile(key) : undefined
    );

    // 缓存结果
    if (this.enableCache) {
      this.cacheManager.set(`download:${key}`, result);
    }

    this.emit('fileDownloaded', { provider: 'primary', key });
    return result;
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    await this.failoverManager.executeWithFailover(
      'deleteFile',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.deleteFile(key),
      this.fallbackProvider ? () => this.fallbackProvider!.deleteFile(key) : undefined
    );

    // 清除缓存
    if (this.enableCache) {
      this.cacheManager.delete(`download:${key}`);
    }

    this.emit('fileDeleted', { provider: 'primary', key });
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<void> {
    await this.failoverManager.executeWithFailover(
      'deleteFiles',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.deleteFiles(keys),
      this.fallbackProvider ? () => this.fallbackProvider!.deleteFiles(keys) : undefined
    );

    // 清除缓存
    if (this.enableCache) {
      keys.forEach(key => this.cacheManager.delete(`download:${key}`));
    }

    this.emit('filesDeleted', { provider: 'primary', keys });
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    // 检查缓存
    if (this.enableCache) {
      const cached = this.cacheManager.get<boolean>(`exists:${key}`);
      if (cached !== null) {
        this.emit('cacheHit', { key, operation: 'exists' });
        return cached;
      }
    }

    const result = await this.failoverManager.executeWithFailover(
      'fileExists',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.fileExists(key),
      this.fallbackProvider ? () => this.fallbackProvider!.fileExists(key) : undefined
    );

    // 缓存结果
    if (this.enableCache) {
      this.cacheManager.set(`exists:${key}`, result);
    }

    return result;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<any> {
    // 检查缓存
    if (this.enableCache) {
      const cached = this.cacheManager.get<any>(`info:${key}`);
      if (cached) {
        this.emit('cacheHit', { key, operation: 'info' });
        return cached;
      }
    }

    const result = await this.failoverManager.executeWithFailover(
      'getFileInfo',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.getFileInfo(key),
      this.fallbackProvider ? () => this.fallbackProvider!.getFileInfo(key) : undefined
    );

    // 缓存结果
    if (this.enableCache) {
      this.cacheManager.set(`info:${key}`, result);
    }

    return result;
  }

  /**
   * 列出文件
   */
  async listFiles(options?: any): Promise<ListResult> {
    const cacheKey = `list:${JSON.stringify(options || {})}`;

    // 检查缓存
    if (this.enableCache) {
      const cached = this.cacheManager.get<ListResult>(cacheKey);
      if (cached) {
        this.emit('cacheHit', { key: cacheKey, operation: 'list' });
        return cached;
      }
    }

    const result = await this.failoverManager.executeWithFailover(
      'listFiles',
      this.primaryProvider,
      this.fallbackProvider,
      () => this.primaryProvider.listFiles(options),
      this.fallbackProvider ? () => this.fallbackProvider!.listFiles(options) : undefined
    );

    // 缓存结果
    if (this.enableCache) {
      this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 生成预签名URL
   */
  async generatePresignedUrl(key: string, operation: 'get' | 'put', expiresIn?: number): Promise<string> {
    const provider = this.failoverManager.selectBestProvider(this.primaryProvider, this.fallbackProvider);
    return provider.generatePresignedUrl(key, operation, expiresIn);
  }
}

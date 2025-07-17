/**
 * @fileoverview 统一对象存储服务管理器 - 重构为模块化架构
 * @description 管理多种存储提供商，提供统一的存储服务接口 - 模块化重构版本
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @example
 * // 使用存储管理器
 * const storageManager = StorageManager.getInstance();
 * await storageManager.initialize();
 *
 * const result = await storageManager.uploadFile({
 *   buffer: fileBuffer,
 *   key: 'images/photo.jpg',
 *   contentType: 'image/jpeg',
 *   size: fileBuffer.length
 * });
 *
 * @dependencies
 * - BaseStorageProvider: 抽象存储提供商基类
 * - CloudflareR2Provider: Cloudflare R2存储提供商
 * - LocalStorageProvider: 本地存储提供商
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

import { EventEmitter } from 'events';
import {
  BaseStorageProvider,
  type UploadParams,
  type UploadResult,
  type DownloadResult,
  type FileInfo,
  type ListParams,
  type ListResult,
  type InitiateMultipartParams,
  type InitiateMultipartResult,
  type UploadPartParams,
  type UploadPartResult,
  type CompleteMultipartParams,
} from './base-storage-provider';

// 导入模块化组件
import type { StorageManagerConfig, StorageStats } from './storage-manager/types';
import { ensureInitialized, createDefaultConfig } from './storage-manager/utils';
import { CacheManager } from './storage-manager/cache-manager';
import { HealthChecker } from './storage-manager/health-checker';
import { ProviderFactory } from './storage-manager/provider-factory';
import { FailoverManager } from './storage-manager/failover-manager';
import { StorageOperations } from './storage-manager/storage-operations';

// 重新导出类型以保持向后兼容
export type { StorageManagerConfig, StorageStats } from './storage-manager/types';



/**
 * 统一对象存储服务管理器
 */
export class StorageManager extends EventEmitter {
  private static instance: StorageManager;
  private config: StorageManagerConfig;
  private primaryProvider: BaseStorageProvider | null = null;
  private fallbackProvider: BaseStorageProvider | null = null;
  private isInitialized = false;
  private cacheManager: CacheManager;
  private healthChecker: HealthChecker;
  private failoverManager: FailoverManager | null = null;
  private storageOperations: StorageOperations | null = null;

  private constructor(config: StorageManagerConfig) {
    super();
    this.config = createDefaultConfig(config);
    this.cacheManager = new CacheManager(this.config.cacheTtl);
    this.healthChecker = new HealthChecker(this.config.healthCheckInterval);
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: StorageManagerConfig): StorageManager {
    if (!StorageManager.instance) {
      if (!config) {
        throw new Error('首次创建StorageManager实例时必须提供配置');
      }
      StorageManager.instance = new StorageManager(config);
    }
    return StorageManager.instance;
  }

  /**
   * 初始化存储管理器
   */
  async initialize(): Promise<void> {
    try {
      // 创建存储提供商
      const providers = ProviderFactory.createProviders({
        primary: this.config.primary,
        fallback: this.config.fallback,
      });

      this.primaryProvider = providers.primary;
      this.fallbackProvider = providers.fallback || null;

      // 初始化提供商
      await this.primaryProvider.initialize();
      if (this.fallbackProvider) {
        await this.fallbackProvider.initialize();
      }

      // 初始化管理器组件
      this.failoverManager = new FailoverManager(
        this.config.enableFailover || false,
        this.config.failoverTimeout || 5000,
        this.healthChecker
      );

      this.storageOperations = new StorageOperations(
        this.primaryProvider,
        this.fallbackProvider || undefined,
        this.cacheManager,
        this.failoverManager,
        this.config.enableCache || false
      );

      // 启动健康检查
      if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
        this.healthChecker.start({ primary: this.primaryProvider, fallback: this.fallbackProvider || undefined });
      }

      this.isInitialized = true;
      this.emit('initialized', {
        primary: (this.config.primary as any).type || 'unknown',
        fallback: (this.config.fallback as any)?.type || null,
      });

      console.log('✅ 存储管理器初始化成功');
    } catch (error) {
      console.error('❌ 存储管理器初始化失败:', error);
      throw new Error(`存储管理器初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.uploadFile({
      buffer: params.buffer,
      key: params.key,
      contentType: params.contentType,
      size: params.size,
      metadata: params.metadata,
    });
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string): Promise<DownloadResult> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    const result = await this.storageOperations.downloadFile(key);
    return result;
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.deleteFile(key);
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<void> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.deleteFiles(keys);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.fileExists(key);
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.getFileInfo(key);
  }

  /**
   * 列出文件
   */
  async listFiles(params?: ListParams): Promise<ListResult> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    const result = await this.storageOperations.listFiles(params);
    return result;
  }

  /**
   * 生成预签名URL
   */
  async generatePresignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string> {
    ensureInitialized(this.isInitialized);

    if (!this.storageOperations) {
      throw new Error('存储操作管理器未初始化');
    }

    return this.storageOperations.generatePresignedUrl(key, operation, expiresIn);
  }

  /**
   * 初始化分片上传
   */
  async initiateMultipartUpload(params: InitiateMultipartParams): Promise<InitiateMultipartResult> {
    ensureInitialized(this.isInitialized);

    if (!this.primaryProvider) {
      throw new Error('主要存储提供商未初始化');
    }

    return this.primaryProvider.initiateMultipartUpload(params);
  }

  /**
   * 上传分片
   */
  async uploadPart(params: UploadPartParams): Promise<UploadPartResult> {
    ensureInitialized(this.isInitialized);

    if (!this.primaryProvider) {
      throw new Error('主要存储提供商未初始化');
    }

    return this.primaryProvider.uploadPart(params);
  }

  /**
   * 完成分片上传
   */
  async completeMultipartUpload(params: CompleteMultipartParams): Promise<UploadResult> {
    ensureInitialized(this.isInitialized);

    if (!this.primaryProvider) {
      throw new Error('主要存储提供商未初始化');
    }

    return this.primaryProvider.completeMultipartUpload(params);
  }

  /**
   * 取消分片上传
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    ensureInitialized(this.isInitialized);

    if (!this.primaryProvider) {
      throw new Error('主要存储提供商未初始化');
    }

    return this.primaryProvider.abortMultipartUpload(key, uploadId);
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, destKey: string): Promise<UploadResult> {
    ensureInitialized(this.isInitialized);

    if (!this.primaryProvider) {
      throw new Error('主要存储提供商未初始化');
    }

    return this.primaryProvider.copyFile(sourceKey, destKey);
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): StorageStats {
    const providerStatus = this.healthChecker.getAllProviderStatus();
    return {
      primary: providerStatus.get('primary'),
      fallback: providerStatus.get('fallback'),
      cacheSize: this.cacheManager.size(),
    };
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cacheManager.clear();
    this.emit('cacheCleared');
  }

  /**
   * 销毁存储管理器
   */
  destroy(): void {
    this.healthChecker.stop();
    this.clearAllCache();
    this.removeAllListeners();
    this.isInitialized = false;

    console.log('🔄 存储管理器已销毁');
  }

}

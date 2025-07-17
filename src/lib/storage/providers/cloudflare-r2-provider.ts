/**
 * @fileoverview Cloudflare R2 存储提供商（重构版）
 * @description 基于S3兼容API的Cloudflare R2对象存储实现
 * @author Augment AI
 * @date 2025-06-27
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @example
 * // 创建R2存储提供商
 * const r2Provider = new CloudflareR2Provider({
 *   provider: 'cloudflare-r2',
 *   bucket: 'my-bucket',
 *   region: 'auto',
 *   accessKeyId: 'your-access-key',
 *   secretAccessKey: 'your-secret-key',
 *   endpoint: 'https://your-account-id.r2.cloudflarestorage.com'
 * });
 *
 * @dependencies
 * - @aws-sdk/client-s3: ^3.490.0
 * - @aws-sdk/lib-storage: ^3.490.0
 * - @aws-sdk/s3-request-presigner: ^3.490.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-27: 模块化重构，拆分为独立组件
 */

import {
  BaseStorageProvider,
  type StorageConfig,
  type UploadParams,
  type UploadResult,
  type DownloadParams,
  type DownloadResult,
  type StreamDownloadParams,
  type ListParams,
  type ListResult,
  type FileInfo,
  type CopyParams,
  type CopyResult,
  type InitiateMultipartParams,
  type InitiateMultipartResult,
  type UploadPartParams,
  type UploadPartResult,
  type CompleteMultipartParams,
} from '../object-storage/base-storage-provider';

// 导入重构后的模块
import { R2ClientManager } from './r2-client-manager';
import { R2UploadHandler } from './r2-upload-handler';
import { R2DownloadHandler } from './r2-download-handler';
import { R2FileManager } from './r2-file-manager';

// 导入类型定义
import type { R2Config, PresignedUrlOptions } from './r2-types';
import { StorageFactory } from '../object-storage/storage-factory';

/**
 * Cloudflare R2 存储提供商（重构版）
 * 现在使用模块化的组件来处理不同的功能
 */
export class CloudflareR2Provider extends BaseStorageProvider {
  // 使用重构后的模块化组件
  private clientManager: R2ClientManager;
  private uploadHandler: R2UploadHandler | null = null;
  private downloadHandler: R2DownloadHandler | null = null;
  private fileManager: R2FileManager | null = null;

  constructor(config: StorageConfig) {
    super(config);

    // 初始化客户端管理器
    this.clientManager = new R2ClientManager(config as R2Config);
  }

  /**
   * 初始化R2客户端（重构版 - 使用模块化组件）
   */
  async initialize(): Promise<void> {
    try {
      // 初始化客户端管理器
      await this.clientManager.initialize();

      // 获取S3客户端
      const s3Client = this.clientManager.getClient();

      // 初始化各个处理器
      this.uploadHandler = new R2UploadHandler(s3Client, this.clientManager.getConfig());
      this.downloadHandler = new R2DownloadHandler(s3Client, this.clientManager.getConfig());
      this.fileManager = new R2FileManager(s3Client, this.clientManager.getConfig());

      this.isInitialized = true;
      this.emitEvent('initialized', { provider: 'cloudflare-r2' });

      console.log('✅ Cloudflare R2 存储服务初始化成功');
    } catch (error) {
      console.error('❌ Cloudflare R2 初始化失败:', error);
      throw new Error(`R2初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 上传文件（重构版 - 使用上传处理器）
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    if (!this.uploadHandler) {
      throw new Error('上传处理器未初始化');
    }

    return await this.uploadHandler.uploadFile(params);
  }

  /**
   * 下载文件（重构版 - 使用下载处理器）
   */
  async downloadFile(key: string): Promise<DownloadResult> {
    if (!this.downloadHandler) {
      throw new Error('下载处理器未初始化');
    }

    const params: DownloadParams = { key };
    return await this.downloadHandler.downloadFile(params);
  }

  /**
   * 流式下载文件（重构版 - 使用下载处理器）
   */
  async streamDownload(params: StreamDownloadParams): Promise<NodeJS.ReadableStream> {
    if (!this.downloadHandler) {
      throw new Error('下载处理器未初始化');
    }

    return await this.downloadHandler.streamDownload(params);
  }

  /**
   * 删除文件（重构版 - 使用文件管理器）
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.fileManager) {
      throw new Error('文件管理器未初始化');
    }

    await this.fileManager.deleteFile(key);
    this.emitEvent('fileDeleted', { key });
  }

  /**
   * 批量删除文件（重构版 - 使用文件管理器）
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (!this.fileManager) {
      throw new Error('文件管理器未初始化');
    }

    const result = await this.fileManager.deleteFiles(keys);
    this.emitEvent('filesDeleted', {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });
  }

  /**
   * 复制文件（重构版 - 使用文件管理器）
   */
  async copyFile(sourceKey: string, destKey: string): Promise<UploadResult> {
    if (!this.fileManager) {
      throw new Error('文件管理器未初始化');
    }

    const params: CopyParams = { sourceKey, destKey };
    const result = await this.fileManager.copyFile(params);

    // 转换CopyResult到UploadResult
    return {
      key: result.key,
      url: this.getUrl(result.key),
      size: 0, // 复制操作无法获取文件大小
      uploadedAt: result.copiedAt,
      etag: result.etag,
    };
  }

  /**
   * 列出文件（重构版 - 使用文件管理器）
   */
  async listFiles(params: ListParams = {}): Promise<ListResult> {
    if (!this.fileManager) {
      throw new Error('文件管理器未初始化');
    }

    return await this.fileManager.listFiles(params);
  }

  /**
   * 检查文件是否存在（重构版 - 使用下载处理器）
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.downloadHandler) {
      throw new Error('下载处理器未初始化');
    }

    return await this.downloadHandler.fileExists(key);
  }

  /**
   * 获取文件信息（重构版 - 使用下载处理器）
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    if (!this.downloadHandler) {
      throw new Error('下载处理器未初始化');
    }

    return await this.downloadHandler.getFileInfo(key);
  }

  /**
   * 生成预签名URL（重构版 - 使用下载处理器）
   */
  async generatePresignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn: number = 3600
  ): Promise<string> {
    if (!this.downloadHandler) {
      throw new Error('下载处理器未初始化');
    }

    // 转换参数格式以匹配下载处理器接口
    const options: PresignedUrlOptions = {
      expiresIn,
      method: operation.toUpperCase() as 'GET' | 'PUT',
    };

    return await this.downloadHandler.generatePresignedUrl(key, options);
  }

  /**
   * 获取文件访问URL
   */
  getUrl(key: string): string {
    const config = this.config as R2Config;
    if (config.customDomain) {
      // 修复重复的https://问题
      let domain = config.customDomain;
      if (domain.startsWith('https://')) {
        domain = domain.replace('https://', '');
      }
      return `https://${domain}/${key}`;
    }
    return `${config.endpoint}/${config.bucket}/${key}`;
  }

  /**
   * 获取CDN URL
   */
  getCdnUrl(key: string): string | null {
    const config = this.config as R2Config;
    if (config.customDomain) {
      // 修复重复的https://问题
      let domain = config.customDomain;
      if (domain.startsWith('https://')) {
        domain = domain.replace('https://', '');
      }
      return `https://${domain}/${key}`;
    }
    return null;
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    return this.clientManager.getStatus();
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return await this.clientManager.healthCheck();
  }

  /**
   * 初始化分片上传
   */
  async initiateMultipartUpload(params: InitiateMultipartParams): Promise<InitiateMultipartResult> {
    // 暂时抛出错误，因为R2UploadHandler的分片上传方法是私有的
    throw new Error('分片上传功能暂未实现');
  }

  /**
   * 上传分片
   */
  async uploadPart(params: UploadPartParams): Promise<UploadPartResult> {
    // 暂时抛出错误，因为R2UploadHandler的分片上传方法是私有的
    throw new Error('分片上传功能暂未实现');
  }

  /**
   * 完成分片上传
   */
  async completeMultipartUpload(params: CompleteMultipartParams): Promise<UploadResult> {
    // 暂时抛出错误，因为R2UploadHandler的分片上传方法是私有的
    throw new Error('分片上传功能暂未实现');
  }

  /**
   * 取消分片上传
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    // 暂时抛出错误，因为R2UploadHandler的分片上传方法是私有的
    throw new Error('分片上传功能暂未实现');
  }
}

/**
 * @fileoverview 本地存储提供者 (重构版)
 * @description 本地文件系统存储提供者，采用模块化架构
 */

import { EventEmitter } from 'events';
import path from 'path';
import {
  BaseStorageProvider,
  type StorageConfig,
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
} from '../object-storage/base-storage-provider';

// 导入拆分的服务和类型
import { FileOperationsService } from './local-storage/services/file-operations-service';
import { DirectoryManager } from './local-storage/services/directory-manager';
import { MultipartManager } from './local-storage/services/multipart-manager';
import {
  type LocalStorageConfig,
  type FileStats,
  type CleanupOptions,
  type CleanupResult,
  DEFAULT_LOCAL_CONFIG,
  ensureDirectoryExists
} from './local-storage/types/local-storage-types';

/**
 * 本地存储提供者 (重构版)
 */
export class LocalStorageProvider extends EventEmitter {
  private config: LocalStorageConfig;
  private basePath: string;
  private isInitialized = false;

  // 服务实例
  private fileOps: FileOperationsService;
  private directoryManager: DirectoryManager;
  private multipartManager: MultipartManager;

  constructor(config: LocalStorageConfig) {
    super();

    this.config = { ...DEFAULT_LOCAL_CONFIG, ...config };
    this.basePath = path.resolve(this.config.basePath);

    // 初始化服务
    this.fileOps = new FileOperationsService(this.config, this.basePath);
    this.directoryManager = new DirectoryManager(this.basePath);
    this.multipartManager = new MultipartManager(this.config, this.basePath);
  }

  /**
   * 初始化存储提供者
   */
  async initialize(): Promise<void> {
    try {
      // 确保基础目录存在
      await ensureDirectoryExists(this.basePath);

      // 创建必要的子目录
      await this.directoryManager.ensureDirectory(path.join(this.basePath, '.temp'));

      this.isInitialized = true;
      console.log('✅ 本地存储提供者初始化成功:', this.basePath);
    } catch (error) {
      console.error('❌ 本地存储提供者初始化失败:', error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    this.ensureInitialized();
    return await this.fileOps.uploadFile(params);
  }

  /**
   * 下载文件
   */
  async download(key: string): Promise<DownloadResult> {
    this.ensureInitialized();
    return await this.fileOps.downloadFile(key);
  }

  /**
   * 删除文件
   */
  async delete(key: string): Promise<void> {
    this.ensureInitialized();
    await this.fileOps.deleteFile(key);
  }

  /**
   * 批量删除文件
   */
  async deleteMany(keys: string[]): Promise<void> {
    this.ensureInitialized();
    const results = await this.fileOps.deleteFiles(keys);
    const errors = results.filter(r => !r.success).map(r => r.error!);
    if (errors.length > 0) {
      throw new Error(`部分文件删除失败: ${errors.join(', ')}`);
    }
  }

  /**
   * 列出文件
   */
  async list(params?: ListParams): Promise<ListResult> {
    this.ensureInitialized();
    return await this.directoryManager.listFiles(params);
  }

  /**
   * 检查文件是否存在
   */
  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.fileOps.fileExists(key);
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    this.ensureInitialized();
    return await this.fileOps.getFileInfo(key);
  }

  /**
   * 初始化分片上传
   */
  async initiateMultipartUpload(params: InitiateMultipartParams): Promise<InitiateMultipartResult> {
    this.ensureInitialized();
    return await this.multipartManager.initiateMultipartUpload(params);
  }

  /**
   * 上传分片
   */
  async uploadPart(params: UploadPartParams): Promise<UploadPartResult> {
    this.ensureInitialized();
    return await this.multipartManager.uploadPart(params);
  }

  /**
   * 完成分片上传
   */
  async completeMultipartUpload(params: CompleteMultipartParams): Promise<UploadResult> {
    this.ensureInitialized();
    const result = await this.multipartManager.completeMultipartUpload(params);
    return {
      key: result.key,
      etag: result.etag,
      size: result.size,
      url: this.fileOps.generateUrl(result.key),
      uploadedAt: new Date(),
    };
  }

  /**
   * 中止分片上传
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    this.ensureInitialized();
    await this.multipartManager.abortMultipartUpload(uploadId);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<FileStats> {
    this.ensureInitialized();
    return await this.directoryManager.getDirectoryStats();
  }

  /**
   * 清理文件
   */
  async cleanup(options: CleanupOptions): Promise<CleanupResult> {
    this.ensureInitialized();
    return await this.directoryManager.cleanupFiles(options);
  }



  // BaseStorageProvider抽象方法实现（别名方法）
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    return await this.upload(params);
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    return await this.download(key);
  }

  async deleteFile(key: string): Promise<void> {
    await this.delete(key);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    await this.deleteMany(keys);
  }

  async fileExists(key: string): Promise<boolean> {
    return await this.exists(key);
  }

  async listFiles(params?: ListParams): Promise<ListResult> {
    return await this.list(params);
  }

  /**
   * 生成文件访问URL
   */
  generateUrl(key: string): string {
    const baseUrl = this.config.cdnDomain || this.config.publicUrl || '/api/files';
    return `${baseUrl}/${key}`;
  }

  async generatePresignedUrl(key: string, operation: 'get' | 'put', expiresIn?: number): Promise<string> {
    // 本地存储不支持预签名URL，返回直接访问URL
    return this.generateUrl(key);
  }

  async copyFile(sourceKey: string, destKey: string): Promise<UploadResult> {
    this.ensureInitialized();
    // 实现文件复制逻辑
    const sourceData = await this.download(sourceKey);
    const copyParams: UploadParams = {
      buffer: sourceData.buffer,
      key: destKey,
      contentType: sourceData.contentType || 'application/octet-stream',
      size: sourceData.size,
    };
    return await this.upload(copyParams);
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('存储提供者未初始化，请先调用 initialize() 方法');
    }
  }
}

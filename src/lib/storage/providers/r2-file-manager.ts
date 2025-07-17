/**
 * @fileoverview R2文件管理器
 * @description 处理文件删除、复制、列表等管理操作
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  type DeleteObjectCommandInput,
  type DeleteObjectsCommandInput,
  type CopyObjectCommandInput,
  type ListObjectsV2CommandInput,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  type R2Config,
  type BatchOperationResult,
  R2_DEFAULTS
} from './r2-types';
import type {
  ListParams,
  ListResult,
  FileInfo,
  CopyParams,
  CopyResult
} from '../object-storage/base-storage-provider';

/**
 * R2文件管理器
 */
export class R2FileManager {
  private s3Client: S3Client;
  private config: R2Config;

  constructor(s3Client: S3Client, config: R2Config) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const deleteParams: DeleteObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: key,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);

      const duration = Date.now() - startTime;
      console.log(`🗑️ 文件删除成功: ${key} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 文件删除失败: ${key} (${duration}ms)`, error);
      throw new Error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      total: keys.length,
      successful: 0,
      failed: 0,
      successfulKeys: [],
      failedKeys: [],
      duration: 0,
    };

    if (keys.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      // 分批处理，每批最多1000个文件
      const batchSize = Math.min(keys.length, R2_DEFAULTS.MAX_DELETE_BATCH_SIZE);
      const batches = this.chunkArray(keys, batchSize);

      for (const batch of batches) {
        try {
          const batchResult = await this.deleteBatch(batch);
          result.successful += batchResult.successful;
          result.failed += batchResult.failed;
          result.successfulKeys.push(...batchResult.successfulKeys);
          result.failedKeys.push(...batchResult.failedKeys);
        } catch (error) {
          // 如果批量删除失败，尝试逐个删除
          const individualResults = await this.deleteIndividually(batch);
          result.successful += individualResults.successful;
          result.failed += individualResults.failed;
          result.successfulKeys.push(...individualResults.successfulKeys);
          result.failedKeys.push(...individualResults.failedKeys);
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`🗑️ 批量删除完成: ${result.successful}/${result.total} 成功 (${result.duration}ms)`);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      console.error(`❌ 批量删除失败 (${result.duration}ms)`, error);
      throw new Error(`批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(params: CopyParams): Promise<CopyResult> {
    const startTime = Date.now();

    try {
      const copyParams: CopyObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: params.destKey,
        CopySource: `${this.config.bucket}/${params.sourceKey}`,
        ACL: this.config.defaultAcl || R2_DEFAULTS.DEFAULT_ACL,
        MetadataDirective: params.metadata ? 'REPLACE' : 'COPY',
        Metadata: params.metadata,
      };

      const command = new CopyObjectCommand(copyParams);
      const response = await this.s3Client.send(command);

      const duration = Date.now() - startTime;
      console.log(`📋 文件复制成功: ${params.sourceKey} -> ${params.destKey} (${duration}ms)`);

      return {
        sourceKey: params.sourceKey,
        key: params.destKey,
        etag: response.CopyObjectResult?.ETag?.replace(/"/g, '') || '',
        copiedAt: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 文件复制失败: ${params.sourceKey} -> ${params.destKey} (${duration}ms)`, error);
      throw new Error(`复制失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 列出文件
   */
  async listFiles(params: ListParams = {}): Promise<ListResult> {
    const startTime = Date.now();

    try {
      const listParams: ListObjectsV2CommandInput = {
        Bucket: this.config.bucket!,
        Prefix: params.prefix,
        MaxKeys: Math.min(params.maxKeys || R2_DEFAULTS.MAX_KEYS_PER_LIST, R2_DEFAULTS.MAX_KEYS_PER_LIST),
        ContinuationToken: params.nextContinuationToken,
        Delimiter: params.delimiter,
        StartAfter: params.startAfter,
      };

      const command = new ListObjectsV2Command(listParams);
      const response = await this.s3Client.send(command);

      const files: FileInfo[] = (response.Contents || []).map(obj => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag?.replace(/"/g, '') || '',
        storageClass: obj.StorageClass,
      }));

      const result: ListResult = {
        files,
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
        keyCount: response.KeyCount || 0,
        commonPrefixes: (response.CommonPrefixes || []).map(cp => cp.Prefix || ''),
      };

      const duration = Date.now() - startTime;
      console.log(`📁 文件列表获取成功: ${files.length} 个文件 (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 文件列表获取失败 (${duration}ms)`, error);
      throw new Error(`列表获取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取所有文件（递归列出）
   */
  async listAllFiles(prefix?: string): Promise<FileInfo[]> {
    const allFiles: FileInfo[] = [];
    let nextContinuationToken: string | undefined;

    do {
      const result = await this.listFiles({
        prefix,
        maxKeys: R2_DEFAULTS.MAX_KEYS_PER_LIST,
        nextContinuationToken,
      });

      allFiles.push(...result.files);
      nextContinuationToken = result.nextContinuationToken;
    } while (nextContinuationToken);

    console.log(`📁 递归列出所有文件: ${allFiles.length} 个文件`);
    return allFiles;
  }

  /**
   * 批量复制文件
   */
  async copyFiles(operations: Array<{ sourceKey: string; destKey: string; metadata?: Record<string, string> }>): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      total: operations.length,
      successful: 0,
      failed: 0,
      successfulKeys: [],
      failedKeys: [],
      duration: 0,
    };

    const concurrency = 5; // 控制并发数
    const chunks = this.chunkArray(operations, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (op) => {
        try {
          await this.copyFile({
            sourceKey: op.sourceKey,
            destKey: op.destKey,
            metadata: op.metadata,
          });
          result.successful++;
          result.successfulKeys.push(op.destKey);
        } catch (error) {
          result.failed++;
          result.failedKeys.push({
            key: op.destKey,
            error: error instanceof Error ? error.message : '未知错误',
          });
        }
      });

      await Promise.all(promises);
    }

    result.duration = Date.now() - startTime;
    console.log(`📋 批量复制完成: ${result.successful}/${result.total} 成功 (${result.duration}ms)`);

    return result;
  }

  /**
   * 删除批次
   */
  private async deleteBatch(keys: string[]): Promise<BatchOperationResult> {
    const deleteParams: DeleteObjectsCommandInput = {
      Bucket: this.config.bucket!,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    };

    const command = new DeleteObjectsCommand(deleteParams);
    const response = await this.s3Client.send(command);

    const successful = response.Deleted?.length || 0;
    const failed = response.Errors?.length || 0;
    const successfulKeys = response.Deleted?.map(d => d.Key || '') || [];
    const failedKeys = response.Errors?.map(e => ({
      key: e.Key || '',
      error: e.Message || '未知错误',
    })) || [];

    return {
      total: keys.length,
      successful,
      failed,
      successfulKeys,
      failedKeys,
      duration: 0,
    };
  }

  /**
   * 逐个删除文件
   */
  private async deleteIndividually(keys: string[]): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      total: keys.length,
      successful: 0,
      failed: 0,
      successfulKeys: [],
      failedKeys: [],
      duration: 0,
    };

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        result.successful++;
        result.successfulKeys.push(key);
      } catch (error) {
        result.failed++;
        result.failedKeys.push({
          key,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return result;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 搜索文件
   */
  async searchFiles(pattern: string, prefix?: string): Promise<FileInfo[]> {
    const allFiles = await this.listAllFiles(prefix);
    const regex = new RegExp(pattern, 'i');

    return allFiles.filter(file => regex.test(file.key));
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(prefix?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    largestFile?: FileInfo;
    smallestFile?: FileInfo;
    oldestFile?: FileInfo;
    newestFile?: FileInfo;
  }> {
    const files = await this.listAllFiles(prefix);

    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
      };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalSize / files.length;

    const largestFile = files.reduce((largest, file) =>
      file.size > largest.size ? file : largest
    );

    const smallestFile = files.reduce((smallest, file) =>
      file.size < smallest.size ? file : smallest
    );

    const filesWithDates = files.filter(f => f.lastModified);
    let oldestFile: FileInfo | undefined;
    let newestFile: FileInfo | undefined;

    if (filesWithDates.length > 0) {
      oldestFile = filesWithDates.reduce((oldest, file) =>
        file.lastModified! < oldest.lastModified! ? file : oldest
      );

      newestFile = filesWithDates.reduce((newest, file) =>
        file.lastModified! > newest.lastModified! ? file : newest
      );
    }

    return {
      totalFiles: files.length,
      totalSize,
      averageSize,
      largestFile,
      smallestFile,
      oldestFile,
      newestFile,
    };
  }
}
